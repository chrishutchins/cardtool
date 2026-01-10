import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { plaidClient } from '@/lib/plaid';
import logger from '@/lib/logger';

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
    // RLS policies use auth.jwt() which won't work with Clerk
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
      })
      .select()
      .single();

    if (itemError || !plaidItem) {
      logger.error({ err: itemError, userId: effectiveUserId }, 'Failed to store plaid item');
      return NextResponse.json(
        { error: 'Failed to store plaid item' },
        { status: 500 }
      );
    }

    logger.debug({ plaidItemId: plaidItem.id, userId: effectiveUserId }, 'Fetching balances for item');
    
    // Helper function to fetch balances with retries
    async function fetchBalancesWithRetry(token: string, maxRetries = 3, delayMs = 1000) {
      let lastError: unknown;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.debug({ attempt, maxRetries }, 'Balance fetch attempt');
          
          // Set min_last_updated_datetime to 24 hours ago
          const minLastUpdated = new Date();
          minLastUpdated.setHours(minLastUpdated.getHours() - 24);
          
          const response = await plaidClient.accountsBalanceGet({
            access_token: token,
            options: {
              min_last_updated_datetime: minLastUpdated.toISOString(),
            },
          });
          logger.debug({ attempt }, 'Balance fetch successful');
          return response;
        } catch (err) {
          lastError = err;
          logger.debug(
            { attempt, err: err instanceof Error ? err.message : 'Unknown error' },
            'Balance fetch attempt failed'
          );
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 2; // Exponential backoff
          }
        }
      }
      throw lastError;
    }
    
    let balanceResponse;
    try {
      balanceResponse = await fetchBalancesWithRetry(accessToken);
    } catch (balanceError: unknown) {
      const errorMessage = balanceError instanceof Error ? balanceError.message : 'Unknown error';
      logger.error(
        { err: balanceError, userId: effectiveUserId, institution: metadata?.institution?.name },
        'Failed to fetch balances from Plaid'
      );
      
      // Try to use accounts from metadata if balance fetch fails
      const metadataAccounts = metadata?.accounts || [];
      const creditFromMetadata = metadataAccounts.filter(
        (a: { type?: string; subtype?: string }) => a.type === 'credit' || a.subtype === 'credit card'
      );
      
      if (creditFromMetadata.length > 0) {
        logger.info({ count: creditFromMetadata.length }, 'Using credit accounts from Link metadata');
        const accountsToInsert = creditFromMetadata.map((account: { id: string; name: string; type: string; subtype?: string; mask?: string }) => ({
          user_id: effectiveUserId,
          plaid_item_id: plaidItem.id,
          plaid_account_id: account.id,
          name: account.name,
          official_name: null,
          type: account.type,
          subtype: account.subtype || null,
          mask: account.mask || null,
          current_balance: null,
          available_balance: null,
          credit_limit: null,
          iso_currency_code: 'USD',
          last_balance_update: new Date().toISOString(),
        }));
        
        const { error: insertError } = await supabase
          .from('user_linked_accounts')
          .insert(accountsToInsert);
          
        if (insertError) {
          logger.error({ err: insertError, userId: effectiveUserId }, 'Failed to insert accounts from metadata');
          // Clean up orphaned plaid_item
          await supabase.from('user_plaid_items').delete().eq('id', plaidItem.id);
          return NextResponse.json({
            success: false,
            error: 'Failed to store accounts',
            details: insertError.message,
          }, { status: 500 });
        }
        
        return NextResponse.json({
          success: true,
          institution_name: metadata?.institution?.name,
          accounts_linked: creditFromMetadata.length,
          warning: 'Balance data not available - will sync on next refresh',
        });
      }
      
      // No credit accounts in metadata either - clean up
      await supabase.from('user_plaid_items').delete().eq('id', plaidItem.id);
      return NextResponse.json({
        success: true,
        institution_name: metadata?.institution?.name,
        accounts_linked: 0,
        warning: 'Could not fetch account balances',
      });
    }

    // Store linked accounts - include both type=credit AND subtype=credit card
    const creditAccounts = balanceResponse.data.accounts.filter(
      (account) => account.type === 'credit' || account.subtype === 'credit card'
    );

    logger.debug({ count: creditAccounts.length }, 'Credit accounts found after filter');

    let accountsLinked = 0;

    if (creditAccounts.length > 0) {
      const accountsToInsert = creditAccounts.map((account) => ({
        user_id: effectiveUserId,
        plaid_item_id: plaidItem.id,
        plaid_account_id: account.account_id,
        name: account.name,
        official_name: account.official_name || null,
        type: account.type,
        subtype: account.subtype || null,
        mask: account.mask || null,
        current_balance: account.balances.current,
        available_balance: account.balances.available,
        credit_limit: account.balances.limit,
        iso_currency_code: account.balances.iso_currency_code || 'USD',
        last_balance_update: new Date().toISOString(),
      }));

      const { error: accountsError } = await supabase
        .from('user_linked_accounts')
        .insert(accountsToInsert);

      if (accountsError) {
        logger.error({ err: accountsError, userId: effectiveUserId }, 'Failed to store linked accounts');
        return NextResponse.json(
          { error: 'Failed to store linked accounts', details: accountsError.message, code: accountsError.code },
          { status: 500 }
        );
      }
      
      logger.info(
        { count: creditAccounts.length, userId: effectiveUserId, institution: metadata?.institution?.name },
        'Successfully linked accounts'
      );
      accountsLinked = creditAccounts.length;
    } else {
      // No credit accounts found - delete the plaid_item to avoid orphans
      logger.info(
        { userId: effectiveUserId, institution: metadata?.institution?.name },
        'No credit accounts found for institution'
      );
      await supabase
        .from('user_plaid_items')
        .delete()
        .eq('id', plaidItem.id);
    }

    return NextResponse.json({
      success: true,
      institution_name: metadata?.institution?.name,
      accounts_linked: accountsLinked,
    });
  } catch (error) {
    logger.error(
      { err: error },
      'Failed to exchange Plaid token'
    );
    return NextResponse.json(
      { error: 'Failed to exchange token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
