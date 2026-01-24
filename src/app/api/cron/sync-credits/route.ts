import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { plaidClient } from '@/lib/plaid';
import { matchTransactionsToCredits } from '@/lib/credit-matcher';
import { Transaction, Products } from 'plaid';
import logger from '@/lib/logger';
import { FORMULA_INFO, BillingCycleFormula } from '@/lib/billing-cycle';

// Extended transaction type that includes original_description when requested
type TransactionWithDescription = Transaction & { original_description?: string | null };

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
            let allTransactions: TransactionWithDescription[] = [];

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
                  include_original_description: true,
                },
              });

              // Cast to extended type since we requested original_description
              allTransactions = allTransactions.concat(
                response.data.transactions as TransactionWithDescription[]
              );
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
                original_description: txn.original_description || null,
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

        // Refresh liabilities for users who have it enabled
        const { data: featureFlags } = await supabase
          .from('user_feature_flags')
          .select('plaid_liabilities_enabled')
          .eq('user_id', userId)
          .maybeSingle();

        if (featureFlags?.plaid_liabilities_enabled) {
          for (const plaidItem of items) {
            try {
              // Check if this item has liabilities consent
              const itemResponse = await plaidClient.itemGet({
                access_token: plaidItem.access_token,
              });
              
              const consentedProducts = itemResponse.data.item.consented_products || [];
              const hasLiabilitiesConsent = consentedProducts.includes(Products.Liabilities);
              
              if (!hasLiabilitiesConsent) continue;

              // Get liabilities data
              const liabilitiesResponse = await plaidClient.liabilitiesGet({
                access_token: plaidItem.access_token,
              });

              const creditLiabilities = liabilitiesResponse.data.liabilities.credit || [];

              // Update each account's liability data
              for (const liability of creditLiabilities) {
                if (!liability.account_id) continue;
                
                const { data: updatedRows, error: updateError } = await supabase
                  .from('user_linked_accounts')
                  .update({
                    last_statement_balance: liability.last_statement_balance,
                    last_statement_date: liability.last_statement_issue_date,
                    last_statement_issue_date: liability.last_statement_issue_date,
                    next_payment_due_date: liability.next_payment_due_date,
                    minimum_payment_amount: liability.minimum_payment_amount,
                    is_overdue: liability.is_overdue ?? false,
                    last_payment_amount: liability.last_payment_amount,
                    last_payment_date: liability.last_payment_date,
                    liabilities_updated_at: new Date().toISOString(),
                  })
                  .eq('plaid_item_id', plaidItem.id)
                  .eq('plaid_account_id', liability.account_id)
                  .select('id, wallet_card_id');
                
                if (updateError) {
                  logger.warn({ 
                    err: updateError, 
                    userId, 
                    plaidItemId: plaidItem.id, 
                    accountId: liability.account_id 
                  }, 'Failed to update liability data in cron');
                } else if (updatedRows) {
                  // Auto-populate wallet billing fields from liabilities data
                  // Only populate the PRIMARY field based on the card's billing formula
                  for (const linkedAccount of updatedRows) {
                    if (!linkedAccount.wallet_card_id) continue;
                    
                    // Get wallet card with card and issuer info to determine billing formula
                    const { data: walletCard } = await supabase
                      .from('user_wallets')
                      .select(`
                        id, 
                        statement_close_day, 
                        payment_due_day,
                        cards:card_id (
                          issuers:issuer_id (
                            billing_cycle_formula
                          )
                        )
                      `)
                      .eq('id', linkedAccount.wallet_card_id)
                      .single();
                    
                    if (!walletCard) continue;
                    
                    // Determine which field is primary based on the billing formula
                    const formula = (walletCard.cards as { issuers?: { billing_cycle_formula?: string } })?.issuers?.billing_cycle_formula as BillingCycleFormula | null;
                    const formulaInfo = formula ? FORMULA_INFO[formula] : null;
                    const primaryInput = formulaInfo?.primaryInput ?? 'due'; // Default to 'due' if no formula
                    
                    const updates: { statement_close_day?: number; payment_due_day?: number } = {};
                    
                    // Only populate the PRIMARY field
                    if (primaryInput === 'close') {
                      // Close-primary formulas (BoA): populate statement_close_day
                      if (walletCard.statement_close_day === null && liability.last_statement_issue_date) {
                        const closeDate = new Date(liability.last_statement_issue_date + 'T12:00:00');
                        updates.statement_close_day = closeDate.getDate();
                      }
                    } else {
                      // Due-primary formulas (Amex, Chase, etc.): populate payment_due_day
                      if (walletCard.payment_due_day === null && liability.next_payment_due_date) {
                        const dueDate = new Date(liability.next_payment_due_date + 'T12:00:00');
                        updates.payment_due_day = dueDate.getDate();
                      }
                    }
                    
                    // Update wallet if we have changes
                    if (Object.keys(updates).length > 0) {
                      await supabase
                        .from('user_wallets')
                        .update(updates)
                        .eq('id', linkedAccount.wallet_card_id);
                    }
                  }
                }
              }
            } catch (liabErr) {
              // Don't fail the whole sync for liabilities errors
              logger.warn({ err: liabErr, userId, plaidItemId: plaidItem.id }, 'Failed to refresh liabilities in cron');
            }
          }
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

