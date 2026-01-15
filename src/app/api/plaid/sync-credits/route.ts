import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { plaidClient } from '@/lib/plaid';
import { matchTransactionsToCredits } from '@/lib/credit-matcher';
import logger from '@/lib/logger';
import { RemovedTransaction, Transaction } from 'plaid';

// Extended transaction type that includes original_description when requested
type TransactionWithDescription = Transaction & { original_description?: string | null };

export async function POST(request: NextRequest) {
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

    // Use admin client since we're already authenticated via Clerk
    const supabase = createAdminClient();

    // Check for force refresh option
    const body = await request.json().catch(() => ({}));
    const forceRefresh = body.forceRefresh === true;

    // Check if we've synced recently (debounce to once per hour unless forced)
    if (!forceRefresh) {
      const { data: syncState } = await supabase
        .from('user_plaid_sync_state')
        .select('last_synced_at')
        .eq('user_id', effectiveUserId)
        .order('last_synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (syncState?.last_synced_at) {
        const lastSync = new Date(syncState.last_synced_at);
        const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

        if (hoursSinceSync < 1) {
          return NextResponse.json({
            success: true,
            message: 'Already synced recently',
            lastSyncedAt: syncState.last_synced_at,
          });
        }
      }
    }

    // Fetch all Plaid items for the user
    const { data: plaidItems, error: itemsError } = await supabase
      .from('user_plaid_items')
      .select('id, access_token, item_id, institution_name')
      .eq('user_id', effectiveUserId);

    if (itemsError) {
      logger.error({ err: itemsError, userId: effectiveUserId }, 'Failed to fetch Plaid items');
      return NextResponse.json({ error: 'Failed to fetch linked accounts' }, { status: 500 });
    }

    if (!plaidItems || plaidItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No linked accounts to sync',
        transactionsAdded: 0,
        transactionsModified: 0,
        transactionsRemoved: 0,
        creditsMatched: 0,
      });
    }

    // Fetch linked accounts to map plaid_account_id to linked_account_id
    const { data: linkedAccounts } = await supabase
      .from('user_linked_accounts')
      .select('id, plaid_item_id, plaid_account_id')
      .eq('user_id', effectiveUserId);

    const accountByPlaidAccountId = new Map<string, string>();
    linkedAccounts?.forEach(acc => {
      accountByPlaidAccountId.set(acc.plaid_account_id, acc.id);
    });

    let totalAdded = 0;
    let totalModified = 0;
    let totalRemoved = 0;
    let totalCreditsMatched = 0;
    let totalClawbacks = 0;
    const syncErrors: string[] = [];

    // Process each Plaid item using transactionsSync
    for (const plaidItem of plaidItems) {
      try {
        // Get sync state for this item (cursor may not exist on first sync)
        const { data: syncState } = await supabase
          .from('user_plaid_sync_state')
          .select('*')
          .eq('user_id', effectiveUserId)
          .eq('plaid_item_id', plaidItem.id)
          .maybeSingle();

        // sync_cursor column was added via migration - cast for type safety
        let cursor = (syncState as { sync_cursor?: string } | null)?.sync_cursor || '';
        const isFirstSync = !cursor;

        logger.info({
          userId: effectiveUserId,
          plaidItemId: plaidItem.id,
          institution: plaidItem.institution_name,
          isFirstSync,
          hasCursor: !!cursor,
        }, 'Starting transaction sync');

        // Collect all transactions from paginated sync
        // Using extended type since we request original_description
        const addedTransactions: TransactionWithDescription[] = [];
        const modifiedTransactions: TransactionWithDescription[] = [];
        const removedTransactions: RemovedTransaction[] = [];

        let hasMore = true;
        while (hasMore) {
          // Note: days_requested is configured in linkTokenCreate, not here
          // Setting it in both places violates Plaid's guidance
          const response = await plaidClient.transactionsSync({
            access_token: plaidItem.access_token,
            cursor: cursor,
            count: 500,
            options: {
              include_original_description: true,
            },
          });

          // Cast to extended type since we requested original_description
          addedTransactions.push(...(response.data.added as TransactionWithDescription[]));
          modifiedTransactions.push(...(response.data.modified as TransactionWithDescription[]));
          removedTransactions.push(...response.data.removed);

          hasMore = response.data.has_more;
          cursor = response.data.next_cursor;
        }

        logger.info({
          userId: effectiveUserId,
          plaidItemId: plaidItem.id,
          added: addedTransactions.length,
          modified: modifiedTransactions.length,
          removed: removedTransactions.length,
        }, 'Fetched transactions from Plaid');

        // Process ADDED transactions
        if (addedTransactions.length > 0) {
          const transactionsToInsert = addedTransactions
            .map(txn => {
              const linkedAccountId = accountByPlaidAccountId.get(txn.account_id);
              if (!linkedAccountId) return null;

              return {
                user_id: effectiveUserId,
                linked_account_id: linkedAccountId,
                plaid_transaction_id: txn.transaction_id,
                name: txn.name,
                original_description: txn.original_description || null,
                amount_cents: Math.round(txn.amount * 100),
                date: txn.date,
                authorized_date: txn.authorized_date || null,
                pending: txn.pending,
                category: txn.category || null,
                merchant_name: txn.merchant_name || null,
              };
            })
            .filter((t): t is NonNullable<typeof t> => t !== null);

          if (transactionsToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('user_plaid_transactions')
              .upsert(transactionsToInsert, {
                onConflict: 'plaid_transaction_id',
                ignoreDuplicates: false,
              });

            if (insertError) {
              logger.error({ err: insertError, userId: effectiveUserId }, 'Failed to insert transactions');
              syncErrors.push(`Failed to store transactions for ${plaidItem.institution_name}`);
            } else {
              totalAdded += transactionsToInsert.length;
            }
          }
        }

        // Process MODIFIED transactions (e.g., pending → posted)
        if (modifiedTransactions.length > 0) {
          let modifiedErrors = 0;
          for (const txn of modifiedTransactions) {
            const linkedAccountId = accountByPlaidAccountId.get(txn.account_id);
            if (!linkedAccountId) continue;

            const { error: updateError } = await supabase
              .from('user_plaid_transactions')
              .update({
                name: txn.name,
                original_description: txn.original_description || null,
                amount_cents: Math.round(txn.amount * 100),
                date: txn.date,
                authorized_date: txn.authorized_date || null,
                pending: txn.pending,
                category: txn.category || null,
                merchant_name: txn.merchant_name || null,
              })
              .eq('plaid_transaction_id', txn.transaction_id);

            if (updateError) {
              logger.error({ err: updateError, userId: effectiveUserId, transactionId: txn.transaction_id }, 'Failed to update modified transaction');
              modifiedErrors++;
            } else {
              totalModified++;
            }
          }
          if (modifiedErrors > 0) {
            syncErrors.push(`Failed to update ${modifiedErrors} modified transaction(s) for ${plaidItem.institution_name}`);
          }
        }

        // Process REMOVED transactions
        if (removedTransactions.length > 0) {
          const removedIds = removedTransactions.map(t => t.transaction_id);
          
          // Delete the transactions (will cascade to usage links)
          const { error: deleteError } = await supabase
            .from('user_plaid_transactions')
            .delete()
            .in('plaid_transaction_id', removedIds);

          if (!deleteError) {
            totalRemoved += removedTransactions.length;
          }
        }

        // Update sync state with new cursor
        await supabase
          .from('user_plaid_sync_state')
          .upsert({
            user_id: effectiveUserId,
            plaid_item_id: plaidItem.id,
            last_synced_at: new Date().toISOString(),
            sync_cursor: cursor,
          }, {
            onConflict: 'user_id,plaid_item_id',
          });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ err, userId: effectiveUserId, plaidItemId: plaidItem.id }, 'Failed to sync Plaid item');
        syncErrors.push(`Failed to sync ${plaidItem.institution_name}: ${errorMessage}`);

        // Check if this is an ITEM_LOGIN_REQUIRED or similar reauth error
        // Plaid errors have error_code in the response data
        const plaidError = err as { response?: { data?: { error_code?: string; error_message?: string } } };
        const errorCode = plaidError.response?.data?.error_code;
        const reauthErrorCodes = ['ITEM_LOGIN_REQUIRED', 'PENDING_EXPIRATION', 'USER_PERMISSION_REVOKED'];
        
        if (errorCode && reauthErrorCodes.includes(errorCode)) {
          logger.warn({ 
            userId: effectiveUserId, 
            plaidItemId: plaidItem.id, 
            errorCode,
            institution: plaidItem.institution_name 
          }, 'Plaid item requires re-authentication');

          // Mark this item as needing re-authentication
          await supabase
            .from('user_plaid_items')
            .update({
              requires_reauth: true,
              error_code: errorCode,
              error_message: plaidError.response?.data?.error_message || errorMessage,
              error_detected_at: new Date().toISOString(),
            })
            .eq('id', plaidItem.id)
            .eq('user_id', effectiveUserId);
        }
      }
    }

    // Match newly added transactions to credits
    // Fetch all unmatched transactions with pagination (Supabase has default row limits)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allUnmatchedTxns: any[] = [];
    let matchOffset = 0;
    const matchBatchSize = 1000;
    let hasMoreToMatch = true;

    while (hasMoreToMatch) {
      const { data: batch } = await supabase
        .from('user_plaid_transactions')
        .select('*')
        .eq('user_id', effectiveUserId)
        .is('matched_credit_id', null)
        .eq('dismissed', false)
        .eq('pending', false)
        .range(matchOffset, matchOffset + matchBatchSize - 1);

      if (batch && batch.length > 0) {
        allUnmatchedTxns.push(...batch);
        matchOffset += matchBatchSize;
        hasMoreToMatch = batch.length === matchBatchSize;
      } else {
        hasMoreToMatch = false;
      }
    }

    const unmatchedTxns = allUnmatchedTxns;

    logger.info({ userId: effectiveUserId, unmatchedCount: unmatchedTxns?.length ?? 0 }, 'Starting credit matching');

    if (unmatchedTxns && unmatchedTxns.length > 0) {
      const matchResult = await matchTransactionsToCredits(supabase, effectiveUserId, unmatchedTxns);
      totalCreditsMatched = matchResult.matched;
      totalClawbacks = matchResult.clawbacks;

      if (matchResult.errors.length > 0) {
        syncErrors.push(...matchResult.errors);
      }
    }

    logger.info({
      userId: effectiveUserId,
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
      creditsMatched: totalCreditsMatched,
      clawbacks: totalClawbacks,
      errors: syncErrors.length,
    }, 'Transaction sync completed');

    return NextResponse.json({
      success: true,
      transactionsAdded: totalAdded,
      transactionsModified: totalModified,
      transactionsRemoved: totalRemoved,
      creditsMatched: totalCreditsMatched,
      clawbacks: totalClawbacks,
      errors: syncErrors.length > 0 ? syncErrors : undefined,
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to sync credits');
    return NextResponse.json(
      { error: 'Failed to sync credits', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get latest sync state
    const { data: syncStates } = await supabase
      .from('user_plaid_sync_state')
      .select(`
        last_synced_at,
        sync_cursor,
        user_plaid_items:plaid_item_id (
          institution_name
        )
      `)
      .eq('user_id', effectiveUserId)
      .order('last_synced_at', { ascending: false });

    // Get transaction counts
    const { count: totalTransactions } = await supabase
      .from('user_plaid_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', effectiveUserId);

    const { count: matchedTransactions } = await supabase
      .from('user_plaid_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', effectiveUserId)
      .not('matched_credit_id', 'is', null);

    return NextResponse.json({
      syncStates: syncStates || [],
      totalTransactions: totalTransactions || 0,
      matchedTransactions: matchedTransactions || 0,
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to get sync status');
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
