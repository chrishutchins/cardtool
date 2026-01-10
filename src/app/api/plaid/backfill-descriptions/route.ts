import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { plaidClient } from '@/lib/plaid';
import { isAdminEmail } from '@/lib/admin';
import logger from '@/lib/logger';

/**
 * One-time backfill endpoint to fetch original_description for transactions
 * that were synced before we enabled include_original_description.
 * 
 * POST /api/plaid/backfill-descriptions
 * Body: { pattern: "hilton" } - pattern to match transaction names (case-insensitive)
 * Body: { matchedOnly: true } - backfill only matched credit transactions
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin only
    const isAdmin = isAdminEmail(user.emailAddresses?.[0]?.emailAddress);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pattern, matchedOnly } = await request.json();
    if (!pattern && !matchedOnly) {
      return NextResponse.json({ error: 'Missing pattern or matchedOnly parameter' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Build query for transactions needing backfill
    let query = supabase
      .from('user_plaid_transactions')
      .select(`
        id,
        plaid_transaction_id,
        name,
        date,
        linked_account_id,
        user_linked_accounts:linked_account_id (
          plaid_account_id,
          plaid_item_id,
          user_plaid_items:plaid_item_id (
            id,
            access_token,
            institution_name
          )
        )
      `)
      .eq('user_id', effectiveUserId)
      .is('original_description', null);

    // Apply filter based on parameters
    if (matchedOnly) {
      query = query.not('matched_credit_id', 'is', null);
    } else if (pattern) {
      query = query.ilike('name', `%${pattern}%`);
    }

    const { data: transactionsToBackfill, error: txnError } = await query;

    if (txnError) {
      logger.error({ err: txnError }, 'Failed to fetch transactions for backfill');
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    if (!transactionsToBackfill || transactionsToBackfill.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No transactions found needing backfill',
        updated: 0 
      });
    }

    logger.info({ count: transactionsToBackfill.length, pattern }, 'Starting backfill');

    // Group transactions by plaid_item for efficient API calls
    const txnsByItem = new Map<string, {
      accessToken: string;
      institutionName: string;
      transactions: typeof transactionsToBackfill;
    }>();

    for (const txn of transactionsToBackfill) {
      const linkedAccount = txn.user_linked_accounts as {
        plaid_account_id: string;
        plaid_item_id: string;
        user_plaid_items: {
          id: string;
          access_token: string;
          institution_name: string;
        };
      } | null;

      if (!linkedAccount?.user_plaid_items) continue;

      const itemId = linkedAccount.user_plaid_items.id;
      if (!txnsByItem.has(itemId)) {
        txnsByItem.set(itemId, {
          accessToken: linkedAccount.user_plaid_items.access_token,
          institutionName: linkedAccount.user_plaid_items.institution_name,
          transactions: [],
        });
      }
      txnsByItem.get(itemId)!.transactions.push(txn);
    }

    let totalUpdated = 0;
    const errors: string[] = [];

    // For each plaid item, fetch transactions with original descriptions
    for (const [itemId, itemData] of txnsByItem) {
      try {
        // Find date range for this item's transactions
        const dates = itemData.transactions.map(t => t.date).sort();
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        logger.info({ 
          itemId, 
          institution: itemData.institutionName,
          startDate,
          endDate,
          txnCount: itemData.transactions.length 
        }, 'Fetching transactions from Plaid');

        // Fetch transactions with original descriptions
        const response = await plaidClient.transactionsGet({
          access_token: itemData.accessToken,
          start_date: startDate,
          end_date: endDate,
          options: {
            include_original_description: true,
            count: 500,
            offset: 0,
          },
        });

        // Create lookup map: plaid_transaction_id -> original_description
        const originalDescriptions = new Map<string, string>();
        for (const plaidTxn of response.data.transactions) {
          if (plaidTxn.original_description) {
            originalDescriptions.set(plaidTxn.transaction_id, plaidTxn.original_description);
          }
        }

        logger.info({ 
          itemId,
          fetchedCount: response.data.transactions.length,
          withDescriptions: originalDescriptions.size 
        }, 'Fetched transactions from Plaid');

        // Update our transactions with original descriptions
        for (const txn of itemData.transactions) {
          const originalDesc = originalDescriptions.get(txn.plaid_transaction_id);
          if (originalDesc) {
            const { error: updateError } = await supabase
              .from('user_plaid_transactions')
              .update({ original_description: originalDesc })
              .eq('id', txn.id);

            if (updateError) {
              logger.error({ err: updateError, txnId: txn.id }, 'Failed to update transaction');
              errors.push(`Failed to update ${txn.name}: ${updateError.message}`);
            } else {
              totalUpdated++;
              logger.debug({ txnId: txn.id, name: txn.name, originalDesc }, 'Updated transaction');
            }
          } else {
            logger.warn({ txnId: txn.id, plaidTxnId: txn.plaid_transaction_id }, 'No original description found');
          }
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ err, itemId }, 'Failed to fetch from Plaid');
        errors.push(`${itemData.institutionName}: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${totalUpdated} of ${transactionsToBackfill.length} transactions`,
      updated: totalUpdated,
      total: transactionsToBackfill.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to backfill descriptions');
    return NextResponse.json(
      { error: 'Failed to backfill', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

