import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { matchTransactionsToCredits } from '@/lib/credit-matcher';
import logger from '@/lib/logger';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.emailAddresses?.[0]?.emailAddress?.toLowerCase() || '';
    if (!ADMIN_EMAILS.includes(userEmail)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch all unmatched transactions for the specified user
    const { data: unmatchedTxns, error: txnError } = await supabase
      .from('user_plaid_transactions')
      .select('*')
      .eq('user_id', userId)
      .is('matched_credit_id', null)
      .eq('dismissed', false)
      .eq('pending', false);

    if (txnError) {
      logger.error({ err: txnError, userId }, 'Failed to fetch unmatched transactions');
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    if (!unmatchedTxns || unmatchedTxns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unmatched transactions to process',
        matched: 0,
        clawbacks: 0,
      });
    }

    logger.info({ userId, count: unmatchedTxns.length }, 'Starting rematch for user');

    // Run the matching
    const result = await matchTransactionsToCredits(supabase, userId, unmatchedTxns);

    logger.info({
      userId,
      matched: result.matched,
      clawbacks: result.clawbacks,
      errors: result.errors.length,
    }, 'Rematch completed');

    return NextResponse.json({
      success: true,
      matched: result.matched,
      clawbacks: result.clawbacks,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to rematch credits');
    return NextResponse.json(
      { error: 'Failed to rematch credits', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

