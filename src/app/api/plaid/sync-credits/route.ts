import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { plaidClient } from '@/lib/plaid';
import { matchTransactionsToCredits } from '@/lib/credit-matcher';
import logger from '@/lib/logger';

// Maximum days of history to fetch (Plaid typically allows 24 months)
const MAX_HISTORY_DAYS = 730; // ~2 years

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client since we're already authenticated via Clerk
    // and RLS policies use auth.uid() which only works with Supabase Auth
    const supabase = createAdminClient();

    // Check for force refresh option
    const body = await request.json().catch(() => ({}));
    const forceRefresh = body.forceRefresh === true;

    // Check if we've synced recently (debounce to once per day unless forced)
    if (!forceRefresh) {
      const { data: syncState } = await supabase
        .from('user_plaid_sync_state')
        .select('last_synced_at')
        .eq('user_id', user.id)
        .order('last_synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (syncState?.last_synced_at) {
        const lastSync = new Date(syncState.last_synced_at);
        const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

        if (hoursSinceSync < 24) {
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
      .eq('user_id', user.id);

    if (itemsError) {
      logger.error({ err: itemsError, userId: user.id }, 'Failed to fetch Plaid items');
      return NextResponse.json({ error: 'Failed to fetch linked accounts' }, { status: 500 });
    }

    if (!plaidItems || plaidItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No linked accounts to sync',
        transactionsStored: 0,
        creditsMatched: 0,
      });
    }

    // Fetch linked accounts to map plaid_item_id to linked_account_id
    const { data: linkedAccounts } = await supabase
      .from('user_linked_accounts')
      .select('id, plaid_item_id, plaid_account_id')
      .eq('user_id', user.id);

    const accountByPlaidAccountId = new Map<string, string>();
    linkedAccounts?.forEach(acc => {
      accountByPlaidAccountId.set(acc.plaid_account_id, acc.id);
    });

    let totalTransactionsStored = 0;
    let totalCreditsMatched = 0;
    let totalClawbacks = 0;
    const syncErrors: string[] = [];

    // Process each Plaid item
    for (const plaidItem of plaidItems) {
      try {
        // Get sync state for this item (may not exist on first sync)
        const { data: syncState } = await supabase
          .from('user_plaid_sync_state')
          .select('last_transaction_date')
          .eq('user_id', user.id)
          .eq('plaid_item_id', plaidItem.id)
          .maybeSingle();

        // Calculate date range
        const endDate = new Date();
        let startDate: Date;

        if (syncState?.last_transaction_date && !forceRefresh) {
          // Incremental sync: start from last synced date minus a few days for safety
          startDate = new Date(syncState.last_transaction_date);
          startDate.setDate(startDate.getDate() - 7); // 7-day overlap for safety
        } else {
          // Full sync: go back max history
          startDate = new Date();
          startDate.setDate(startDate.getDate() - MAX_HISTORY_DAYS);
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        logger.info({
          userId: user.id,
          plaidItemId: plaidItem.id,
          institution: plaidItem.institution_name,
          startDate: startDateStr,
          endDate: endDateStr,
        }, 'Fetching transactions from Plaid');

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

        logger.info({
          userId: user.id,
          plaidItemId: plaidItem.id,
          transactionCount: allTransactions.length,
        }, 'Fetched transactions from Plaid');

        // Store transactions in database
        let latestTransactionDate: string | null = null;
        const transactionsToInsert = [];

        for (const txn of allTransactions) {
          const linkedAccountId = accountByPlaidAccountId.get(txn.account_id);
          if (!linkedAccountId) continue;

          // Track latest date for sync state
          if (!latestTransactionDate || txn.date > latestTransactionDate) {
            latestTransactionDate = txn.date;
          }

          transactionsToInsert.push({
            user_id: user.id,
            linked_account_id: linkedAccountId,
            plaid_transaction_id: txn.transaction_id,
            name: txn.name,
            amount_cents: Math.round(txn.amount * 100), // Plaid returns positive for debits, negative for credits
            date: txn.date,
            authorized_date: txn.authorized_date || null,
            pending: txn.pending,
            category: txn.category || null,
            merchant_name: txn.merchant_name || null,
          });
        }

        // Upsert transactions (update if exists, insert if new)
        if (transactionsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('user_plaid_transactions')
            .upsert(transactionsToInsert, {
              onConflict: 'plaid_transaction_id',
              ignoreDuplicates: false,
            });

          if (insertError) {
            logger.error({ err: insertError, userId: user.id }, 'Failed to store transactions');
            syncErrors.push(`Failed to store transactions for ${plaidItem.institution_name}`);
          } else {
            totalTransactionsStored += transactionsToInsert.length;
          }
        }

        // Update sync state
        await supabase
          .from('user_plaid_sync_state')
          .upsert({
            user_id: user.id,
            plaid_item_id: plaidItem.id,
            last_synced_at: new Date().toISOString(),
            last_transaction_date: latestTransactionDate,
          }, {
            onConflict: 'user_id,plaid_item_id',
          });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ err, userId: user.id, plaidItemId: plaidItem.id }, 'Failed to sync Plaid item');
        syncErrors.push(`Failed to sync ${plaidItem.institution_name}: ${errorMessage}`);
      }
    }

    // Now match stored transactions to credits
    // Fetch all unmatched transactions for matching
    const { data: unmatchedTxns } = await supabase
      .from('user_plaid_transactions')
      .select('*')
      .eq('user_id', user.id)
      .is('matched_credit_id', null)
      .eq('dismissed', false)
      .eq('pending', false);

    if (unmatchedTxns && unmatchedTxns.length > 0) {
      const matchResult = await matchTransactionsToCredits(supabase, user.id, unmatchedTxns);
      totalCreditsMatched = matchResult.matched;
      totalClawbacks = matchResult.clawbacks;

      if (matchResult.errors.length > 0) {
        syncErrors.push(...matchResult.errors);
      }
    }

    logger.info({
      userId: user.id,
      transactionsStored: totalTransactionsStored,
      creditsMatched: totalCreditsMatched,
      clawbacks: totalClawbacks,
      errors: syncErrors.length,
    }, 'Credit sync completed');

    return NextResponse.json({
      success: true,
      transactionsStored: totalTransactionsStored,
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

    const supabase = createAdminClient();

    // Get latest sync state
    const { data: syncStates } = await supabase
      .from('user_plaid_sync_state')
      .select(`
        last_synced_at,
        last_transaction_date,
        user_plaid_items:plaid_item_id (
          institution_name
        )
      `)
      .eq('user_id', user.id)
      .order('last_synced_at', { ascending: false });

    // Get transaction counts
    const { count: totalTransactions } = await supabase
      .from('user_plaid_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: matchedTransactions } = await supabase
      .from('user_plaid_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
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

