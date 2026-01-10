import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { matchTransactionsToCredits } from '@/lib/credit-matcher';
import logger from '@/lib/logger';

/**
 * POST /api/plaid/rematch
 * Re-runs credit matching on all unmatched transactions without fetching new data from Plaid.
 * Useful when rules have been added/updated.
 */
export async function POST() {
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

    // Get all unmatched transactions
    // Note: Supabase has a default row limit, so we fetch in batches to get all transactions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allUnmatchedTxns: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from('user_plaid_transactions')
        .select('*')
        .eq('user_id', effectiveUserId)
        .is('matched_credit_id', null)
        .eq('dismissed', false)
        .eq('pending', false)
        .range(offset, offset + batchSize - 1);

      if (batchError) {
        logger.error({ err: batchError, userId: effectiveUserId }, 'Failed to fetch unmatched transactions');
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
      }

      if (batch && batch.length > 0) {
        allUnmatchedTxns.push(...batch);
        offset += batchSize;
        hasMore = batch.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    const unmatchedTxns = allUnmatchedTxns;

    if (!unmatchedTxns || unmatchedTxns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unmatched transactions to process',
        matched: 0,
        clawbacks: 0,
      });
    }

    logger.info({ userId: effectiveUserId, count: unmatchedTxns.length }, 'Starting rematch for unmatched transactions');

    const matchResult = await matchTransactionsToCredits(supabase, effectiveUserId, unmatchedTxns);

    logger.info({
      userId: effectiveUserId,
      matched: matchResult.matched,
      clawbacks: matchResult.clawbacks,
      errors: matchResult.errors.length,
    }, 'Rematch completed');

    return NextResponse.json({
      success: true,
      message: `Matched ${matchResult.matched} transactions, ${matchResult.clawbacks} clawbacks`,
      totalUnmatched: unmatchedTxns.length,
      matched: matchResult.matched,
      clawbacks: matchResult.clawbacks,
      errors: matchResult.errors.length > 0 ? matchResult.errors : undefined,
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to rematch transactions');
    return NextResponse.json(
      { error: 'Failed to rematch', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

