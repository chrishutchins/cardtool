import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { plaidClient } from '@/lib/plaid';
import { matchTransactionsToCredits } from '@/lib/credit-matcher';
import logger from '@/lib/logger';
import { RemovedTransaction, Transaction } from 'plaid';

// Extended transaction type that includes original_description when requested
type TransactionWithDescription = Transaction & { original_description?: string | null };

/**
 * Plaid Webhook Handler
 * Handles various webhook events from Plaid:
 * - SYNC_UPDATES_AVAILABLE: New transactions available, triggers automatic sync
 * - ITEM_ERROR: Item needs reauthorization
 * - PENDING_EXPIRATION: Consent is about to expire
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const webhookType = body.webhook_type;
    const webhookCode = body.webhook_code;
    const itemId = body.item_id;

    logger.info({ webhookType, webhookCode, itemId }, 'Received Plaid webhook');

    // Handle different webhook types
    switch (webhookType) {
      case 'TRANSACTIONS':
        return handleTransactionsWebhook(body);
      case 'ITEM':
        return handleItemWebhook(body);
      default:
        logger.info({ webhookType, webhookCode }, 'Unhandled webhook type');
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to process Plaid webhook');
    // Return 200 to prevent Plaid from retrying
    return NextResponse.json({ received: true, error: 'Processing failed' });
  }
}

async function handleTransactionsWebhook(body: {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  initial_update_complete?: boolean;
  historical_update_complete?: boolean;
}) {
  const { webhook_code: webhookCode, item_id: itemId } = body;

  // SYNC_UPDATES_AVAILABLE: New transactions available - trigger sync
  if (webhookCode === 'SYNC_UPDATES_AVAILABLE') {
    logger.info({ itemId }, 'Sync updates available, triggering automatic sync');
    
    const supabase = createAdminClient();

    // Look up the Plaid item to get user_id and access_token
    const { data: plaidItem, error: itemError } = await supabase
      .from('user_plaid_items')
      .select('id, user_id, access_token, institution_name')
      .eq('item_id', itemId)
      .maybeSingle();

    if (itemError || !plaidItem) {
      logger.error({ itemId, err: itemError }, 'Could not find Plaid item for webhook');
      return NextResponse.json({ received: true, error: 'Item not found' });
    }

    // Perform the transaction sync
    await syncTransactionsForItem(supabase, plaidItem);

    return NextResponse.json({ received: true, synced: true });
  }

  // INITIAL_UPDATE or HISTORICAL_UPDATE: Initial sync completed
  if (webhookCode === 'INITIAL_UPDATE' || webhookCode === 'HISTORICAL_UPDATE') {
    logger.info({ itemId, webhookCode }, 'Initial/historical update complete');
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}

async function handleItemWebhook(body: {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: { error_code: string; error_message: string };
}) {
  const { webhook_code: webhookCode, item_id: itemId, error } = body;

  const supabase = createAdminClient();

  // ERROR: Item needs reauthorization
  if (webhookCode === 'ERROR') {
    logger.warn({ itemId, error }, 'Plaid item error, may need reauth');

    await supabase
      .from('user_plaid_items')
      .update({
        requires_reauth: true,
        error_code: error?.error_code || 'UNKNOWN_ERROR',
      })
      .eq('item_id', itemId);

    return NextResponse.json({ received: true, updated: true });
  }

  // PENDING_EXPIRATION: User needs to update consent
  if (webhookCode === 'PENDING_EXPIRATION') {
    logger.info({ itemId }, 'Plaid item consent pending expiration');

    // Mark item as needing attention (could also send email notification)
    await supabase
      .from('user_plaid_items')
      .update({ requires_reauth: true })
      .eq('item_id', itemId);

    return NextResponse.json({ received: true, updated: true });
  }

  return NextResponse.json({ received: true });
}

interface PlaidItem {
  id: string;
  user_id: string;
  access_token: string;
  institution_name: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncTransactionsForItem(supabase: any, plaidItem: PlaidItem) {
  const { id: plaidItemId, user_id: userId, access_token: accessToken } = plaidItem;

  try {
    // Fetch linked accounts to map plaid_account_id to linked_account_id
    const { data: linkedAccounts } = await supabase
      .from('user_linked_accounts')
      .select('id, plaid_item_id, plaid_account_id')
      .eq('user_id', userId)
      .eq('plaid_item_id', plaidItemId);

    if (!linkedAccounts || linkedAccounts.length === 0) {
      logger.info({ plaidItemId, userId }, 'No linked accounts for item');
      return;
    }

    const accountByPlaidAccountId = new Map<string, string>();
    linkedAccounts.forEach((acc: { plaid_account_id: string; id: string }) => {
      accountByPlaidAccountId.set(acc.plaid_account_id, acc.id);
    });

    // Get sync state for this item
    const { data: syncState } = await supabase
      .from('user_plaid_sync_state')
      .select('*')
      .eq('user_id', userId)
      .eq('plaid_item_id', plaidItemId)
      .maybeSingle();

    let cursor = (syncState as { sync_cursor?: string } | null)?.sync_cursor || '';

    logger.info({
      userId,
      plaidItemId,
      institution: plaidItem.institution_name,
      hasCursor: !!cursor,
    }, 'Starting webhook-triggered transaction sync');

    // Collect all transactions from paginated sync
    const addedTransactions: TransactionWithDescription[] = [];
    const modifiedTransactions: TransactionWithDescription[] = [];
    const removedTransactions: RemovedTransaction[] = [];

    let hasMore = true;
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: cursor,
        count: 500,
        options: {
          include_original_description: true,
        },
      });

      addedTransactions.push(...(response.data.added as TransactionWithDescription[]));
      modifiedTransactions.push(...(response.data.modified as TransactionWithDescription[]));
      removedTransactions.push(...response.data.removed);

      hasMore = response.data.has_more;
      cursor = response.data.next_cursor;
    }

    logger.info({
      userId,
      plaidItemId,
      added: addedTransactions.length,
      modified: modifiedTransactions.length,
      removed: removedTransactions.length,
    }, 'Fetched transactions from Plaid (webhook sync)');

    // Process ADDED transactions
    if (addedTransactions.length > 0) {
      const transactionsToInsert = addedTransactions
        .map(txn => {
          const linkedAccountId = accountByPlaidAccountId.get(txn.account_id);
          if (!linkedAccountId) return null;

          return {
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
          logger.error({ err: insertError, userId }, 'Failed to insert transactions (webhook)');
        }
      }
    }

    // Process MODIFIED transactions
    if (modifiedTransactions.length > 0) {
      for (const txn of modifiedTransactions) {
        await supabase
          .from('user_plaid_transactions')
          .update({
            name: txn.name,
            original_description: txn.original_description || null,
            amount_cents: Math.round(txn.amount * 100),
            date: txn.date,
            pending: txn.pending,
            category: txn.category || null,
            merchant_name: txn.merchant_name || null,
          })
          .eq('plaid_transaction_id', txn.transaction_id);
      }
    }

    // Process REMOVED transactions
    if (removedTransactions.length > 0) {
      const transactionIds = removedTransactions.map(t => t.transaction_id);
      await supabase
        .from('user_plaid_transactions')
        .delete()
        .in('plaid_transaction_id', transactionIds);
    }

    // Update sync state with new cursor
    await supabase
      .from('user_plaid_sync_state')
      .upsert({
        user_id: userId,
        plaid_item_id: plaidItemId,
        sync_cursor: cursor,
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,plaid_item_id',
      });

    // Also update account balances from the accounts returned in transactionsSync
    // (balances are included in the response for free)
    try {
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      for (const account of accountsResponse.data.accounts) {
        if (account.type === 'credit' || account.subtype === 'credit card') {
          await supabase
            .from('user_linked_accounts')
            .update({
              current_balance: account.balances.current,
              available_balance: account.balances.available,
              credit_limit: account.balances.limit,
              last_balance_update: new Date().toISOString(),
            })
            .eq('plaid_item_id', plaidItemId)
            .eq('plaid_account_id', account.account_id);
        }
      }
    } catch (balanceErr) {
      logger.warn({ err: balanceErr, plaidItemId }, 'Failed to update balances during webhook sync');
    }

    // Run credit matching for new transactions
    if (addedTransactions.length > 0) {
      try {
        const { data: walletCards } = await supabase
          .from('user_wallets')
          .select('id, linked_account_id')
          .eq('user_id', userId)
          .not('linked_account_id', 'is', null);

        if (walletCards && walletCards.length > 0) {
          const linkedAccountIds = walletCards.map((w: { linked_account_id: string }) => w.linked_account_id);

          const { data: recentTransactions } = await supabase
            .from('user_plaid_transactions')
            .select('*')
            .eq('user_id', userId)
            .in('linked_account_id', linkedAccountIds)
            .order('date', { ascending: false })
            .limit(200);

          if (recentTransactions && recentTransactions.length > 0) {
            await matchTransactionsToCredits(supabase, userId, recentTransactions);
          }
        }
      } catch (matchErr) {
        logger.warn({ err: matchErr, userId }, 'Failed to match credits during webhook sync');
      }
    }

    logger.info({ userId, plaidItemId }, 'Webhook-triggered sync complete');
  } catch (error) {
    logger.error({ err: error, plaidItemId, userId }, 'Failed to sync transactions for item (webhook)');
    throw error;
  }
}
