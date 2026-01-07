import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { plaidClient } from '@/lib/plaid';
import { matchTransactionsToCredits } from '@/lib/credit-matcher';
import logger from '@/lib/logger';

// Verify the request is from Vercel Cron
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  
  // Verify the cron secret (required in all environments)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.warn({}, 'CRON_SECRET not set - cron jobs disabled');
    return false;
  }

  // Allow dev bypass only if explicitly enabled
  if (process.env.NODE_ENV === 'development' && process.env.CRON_DEV_BYPASS === 'true') {
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// Maximum days of history to fetch for incremental sync
const MAX_HISTORY_DAYS = 90;

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Get all users who have linked Plaid accounts
    const { data: plaidItems, error: itemsError } = await supabase
      .from('user_plaid_items')
      .select('id, user_id, access_token, item_id, institution_name');

    if (itemsError) {
      logger.error({ err: itemsError }, 'Failed to fetch Plaid items for cron');
      return NextResponse.json({ error: 'Failed to fetch Plaid items' }, { status: 500 });
    }

    if (!plaidItems || plaidItems.length === 0) {
      logger.info({}, 'No Plaid items to sync');
      return NextResponse.json({ success: true, message: 'No items to sync', usersProcessed: 0 });
    }

    // Group by user
    const userItems = plaidItems.reduce((acc, item) => {
      if (!acc[item.user_id]) {
        acc[item.user_id] = [];
      }
      acc[item.user_id].push(item);
      return acc;
    }, {} as Record<string, typeof plaidItems>);

    let usersProcessed = 0;
    let totalTransactionsStored = 0;
    let totalCreditsMatched = 0;
    const errors: string[] = [];

    // Process each user
    for (const [userId, items] of Object.entries(userItems)) {
      try {
        // Fetch linked accounts for this user
        const { data: linkedAccounts } = await supabase
          .from('user_linked_accounts')
          .select('id, plaid_item_id, plaid_account_id')
          .eq('user_id', userId);

        const accountByPlaidAccountId = new Map<string, string>();
        linkedAccounts?.forEach(acc => {
          accountByPlaidAccountId.set(acc.plaid_account_id, acc.id);
        });

        // Process each Plaid item for this user
        for (const plaidItem of items) {
          try {
            // Get sync state for this item (may not exist on first sync)
            const { data: syncState } = await supabase
              .from('user_plaid_sync_state')
              .select('last_transaction_date')
              .eq('user_id', userId)
              .eq('plaid_item_id', plaidItem.id)
              .maybeSingle();

            // Calculate date range
            const endDate = new Date();
            let startDate: Date;

            if (syncState?.last_transaction_date) {
              // Incremental sync: start from last synced date minus a few days
              startDate = new Date(syncState.last_transaction_date);
              startDate.setDate(startDate.getDate() - 7);
            } else {
              // Full sync: go back max history
              startDate = new Date();
              startDate.setDate(startDate.getDate() - MAX_HISTORY_DAYS);
            }

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Fetch transactions from Plaid
            let allTransactions: Array<{
              transaction_id: string;
              account_id: string;
              name: string;
              amount: number;
              date: string;
              authorized_date?: string | null;
              pending: boolean;
              category?: string[] | null;
              merchant_name?: string | null;
            }> = [];

            let hasMore = true;
            let offset = 0;
            const count = 500;

            while (hasMore) {
              const response = await plaidClient.transactionsGet({
                access_token: plaidItem.access_token,
                start_date: startDateStr,
                end_date: endDateStr,
                options: {
                  count,
                  offset,
                  include_original_description: false,
                },
              });

              allTransactions = allTransactions.concat(response.data.transactions);
              offset += response.data.transactions.length;
              hasMore = offset < response.data.total_transactions;
            }

            // Store transactions
            let latestTransactionDate: string | null = null;
            const transactionsToInsert = [];

            for (const txn of allTransactions) {
              const linkedAccountId = accountByPlaidAccountId.get(txn.account_id);
              if (!linkedAccountId) continue;

              if (!latestTransactionDate || txn.date > latestTransactionDate) {
                latestTransactionDate = txn.date;
              }

              transactionsToInsert.push({
                user_id: userId,
                linked_account_id: linkedAccountId,
                plaid_transaction_id: txn.transaction_id,
                name: txn.name,
                amount_cents: Math.round(txn.amount * 100),
                date: txn.date,
                authorized_date: txn.authorized_date || null,
                pending: txn.pending,
                category: txn.category || null,
                merchant_name: txn.merchant_name || null,
              });
            }

            // Upsert transactions
            if (transactionsToInsert.length > 0) {
              const { error: upsertError } = await supabase
                .from('user_plaid_transactions')
                .upsert(transactionsToInsert, {
                  onConflict: 'plaid_transaction_id',
                  ignoreDuplicates: false,
                });

              if (upsertError) {
                logger.error({ err: upsertError, userId, plaidItemId: plaidItem.id }, 'Failed to upsert transactions');
                errors.push(`User ${userId.slice(0, 8)}... - ${plaidItem.institution_name}: Failed to store transactions`);
              } else {
                totalTransactionsStored += transactionsToInsert.length;
              }
            }

            // Update sync state
            const { error: syncStateError } = await supabase
              .from('user_plaid_sync_state')
              .upsert({
                user_id: userId,
                plaid_item_id: plaidItem.id,
                last_synced_at: new Date().toISOString(),
                last_transaction_date: latestTransactionDate,
              }, {
                onConflict: 'user_id,plaid_item_id',
              });

            if (syncStateError) {
              logger.error({ err: syncStateError, userId, plaidItemId: plaidItem.id }, 'Failed to update sync state');
            }

          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            logger.error({ err, userId, plaidItemId: plaidItem.id }, 'Failed to sync Plaid item');
            errors.push(`User ${userId.slice(0, 8)}... - ${plaidItem.institution_name}: ${errorMessage}`);
          }
        }

        // Match transactions to credits for this user
        const { data: unmatchedTxns } = await supabase
          .from('user_plaid_transactions')
          .select('*')
          .eq('user_id', userId)
          .is('matched_credit_id', null)
          .eq('dismissed', false)
          .eq('pending', false);

        if (unmatchedTxns && unmatchedTxns.length > 0) {
          const matchResult = await matchTransactionsToCredits(supabase, userId, unmatchedTxns);
          totalCreditsMatched += matchResult.matched;
        }

        usersProcessed++;

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ err, userId }, 'Failed to process user in cron');
        errors.push(`User ${userId.slice(0, 8)}...: ${errorMessage}`);
      }
    }

    logger.info({
      usersProcessed,
      totalTransactionsStored,
      totalCreditsMatched,
      errors: errors.length,
    }, 'Cron credit sync completed');

    return NextResponse.json({
      success: true,
      usersProcessed,
      totalTransactionsStored,
      totalCreditsMatched,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    logger.error({ err: error }, 'Cron credit sync failed');
    return NextResponse.json(
      { error: 'Cron sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

