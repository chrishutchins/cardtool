import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { plaidClient } from '@/lib/plaid';
import logger from '@/lib/logger';

/**
 * Exchange a Plaid public token for a bank account (depository) and store it.
 * Used for linking "Pay From" accounts.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use effective user ID (respects DEV_USER_ID_OVERRIDE in development)
    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { public_token, metadata } = await request.json();

    if (!public_token) {
      return NextResponse.json({ error: 'Missing public_token' }, { status: 400 });
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Use admin client since we're authenticated via Clerk, not Supabase Auth
    const supabase = createAdminClient();

    // Store the Plaid Item
    const { data: plaidItem, error: itemError } = await supabase
      .from('user_plaid_items')
      .insert({
        user_id: effectiveUserId,
        access_token: accessToken,
        item_id: itemId,
        institution_id: metadata?.institution?.institution_id || null,
        institution_name: metadata?.institution?.name || null,
        consented_products: ['auth'],
      })
      .select()
      .single();

    if (itemError || !plaidItem) {
      logger.error({ err: itemError, userId: effectiveUserId }, 'Failed to store plaid item for bank');
      return NextResponse.json(
        { error: 'Failed to store plaid item' },
        { status: 500 }
      );
    }

    logger.debug({ plaidItemId: plaidItem.id, userId: effectiveUserId }, 'Fetching bank account balances');

    // Fetch account balances
    let balanceResponse;
    try {
      balanceResponse = await plaidClient.accountsBalanceGet({
        access_token: accessToken,
      });
    } catch (balanceError) {
      logger.error(
        { err: balanceError, userId: effectiveUserId, institution: metadata?.institution?.name },
        'Failed to fetch bank account balances'
      );
      // Clean up orphaned plaid_item
      await supabase.from('user_plaid_items').delete().eq('id', plaidItem.id);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch account balances',
      }, { status: 500 });
    }

    // Filter for depository accounts only
    const depositoryAccounts = balanceResponse.data.accounts.filter(
      (account) => account.type === 'depository'
    );

    logger.debug({ count: depositoryAccounts.length }, 'Depository accounts found');

    if (depositoryAccounts.length === 0) {
      // No depository accounts - delete the plaid_item
      logger.info(
        { userId: effectiveUserId, institution: metadata?.institution?.name },
        'No depository accounts found for institution'
      );
      await supabase.from('user_plaid_items').delete().eq('id', plaidItem.id);
      return NextResponse.json({
        success: true,
        institution_name: metadata?.institution?.name,
        accounts_linked: 0,
        message: 'No checking or savings accounts found',
      });
    }

    // Check if this is the user's first bank account (make it primary)
    const { count: existingCount } = await supabase
      .from('user_bank_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', effectiveUserId);

    const isFirstAccount = !existingCount || existingCount === 0;

    // Insert bank accounts
    const accountsToInsert = depositoryAccounts.map((account, index) => ({
      user_id: effectiveUserId,
      plaid_item_id: plaidItem.id,
      plaid_account_id: account.account_id,
      name: account.name,
      official_name: account.official_name || null,
      type: account.type,
      subtype: account.subtype || null,
      mask: account.mask || null,
      institution_name: metadata?.institution?.name || null,
      current_balance: account.balances.current,
      available_balance: account.balances.available,
      iso_currency_code: account.balances.iso_currency_code || 'USD',
      last_balance_update: new Date().toISOString(),
      // Make the first checking account primary by default
      is_primary: isFirstAccount && index === 0 && account.subtype === 'checking',
      is_manual: false,
    }));

    const { error: accountsError } = await supabase
      .from('user_bank_accounts')
      .insert(accountsToInsert);

    if (accountsError) {
      logger.error({ err: accountsError, userId: effectiveUserId }, 'Failed to store bank accounts');
      // Clean up orphaned plaid_item
      await supabase.from('user_plaid_items').delete().eq('id', plaidItem.id);
      return NextResponse.json(
        { error: 'Failed to store bank accounts', details: accountsError.message },
        { status: 500 }
      );
    }

    logger.info(
      { count: depositoryAccounts.length, userId: effectiveUserId, institution: metadata?.institution?.name },
      'Successfully linked bank accounts'
    );

    return NextResponse.json({
      success: true,
      institution_name: metadata?.institution?.name,
      accounts_linked: depositoryAccounts.length,
    });
  } catch (error) {
    logger.error(
      { err: error },
      'Failed to exchange Plaid bank token'
    );
    return NextResponse.json(
      { error: 'Failed to exchange token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
