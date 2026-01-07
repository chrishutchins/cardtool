import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { plaidClient } from '@/lib/plaid';
import logger from '@/lib/logger';

export async function POST() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use effective user ID to support admin emulation
    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get all Plaid items for this user
    const { data: plaidItems, error: itemsError } = await supabase
      .from('user_plaid_items')
      .select('id, access_token')
      .eq('user_id', effectiveUserId);

    if (itemsError) {
      logger.error({ err: itemsError, userId: effectiveUserId }, 'Failed to fetch plaid items');
      return NextResponse.json(
        { error: 'Failed to fetch plaid items' },
        { status: 500 }
      );
    }

    if (!plaidItems || plaidItems.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    let totalUpdated = 0;

    // Refresh balances for each Plaid item
    for (const item of plaidItems) {
      try {
        logger.debug({ plaidItemId: item.id, userId: effectiveUserId }, 'Refreshing balances for item');
        
        // Set min_last_updated_datetime to 24 hours ago
        const minLastUpdated = new Date();
        minLastUpdated.setHours(minLastUpdated.getHours() - 24);
        
        const balanceResponse = await plaidClient.accountsBalanceGet({
          access_token: item.access_token,
          options: {
            min_last_updated_datetime: minLastUpdated.toISOString(),
          },
        });

        // Update each account's balance
        for (const account of balanceResponse.data.accounts) {
          if (account.type === 'credit' || account.subtype === 'credit card') {
            const { data: updatedRows, error: updateError } = await supabase
              .from('user_linked_accounts')
              .update({
                current_balance: account.balances.current,
                available_balance: account.balances.available,
                credit_limit: account.balances.limit,
                last_balance_update: new Date().toISOString(),
              })
              .eq('plaid_item_id', item.id)
              .eq('plaid_account_id', account.account_id)
              .select('id');

            if (updateError) {
              logger.error(
                { err: updateError, accountName: account.name, plaidItemId: item.id },
                'Failed to update account balance'
              );
            } else if (updatedRows && updatedRows.length > 0) {
              totalUpdated += updatedRows.length;
            }
          }
        }
      } catch (plaidError: unknown) {
        logger.error(
          { err: plaidError, plaidItemId: item.id, userId: effectiveUserId },
          'Failed to refresh balances for item'
        );
        // Continue with other items even if one fails
      }
    }

    logger.info({ updated: totalUpdated, userId: effectiveUserId }, 'Balance refresh completed');
    return NextResponse.json({ success: true, updated: totalUpdated });
  } catch (error) {
    logger.error({ err: error }, 'Failed to refresh balances');
    return NextResponse.json(
      { error: 'Failed to refresh balances' },
      { status: 500 }
    );
  }
}
