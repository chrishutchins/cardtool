import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { isAdminEmail } from '@/lib/admin';
import { plaidClient } from '@/lib/plaid';
import logger from '@/lib/logger';

/**
 * Admin-only endpoint to trigger a fresh data pull from the financial institution.
 * This uses Plaid's /transactions/refresh endpoint which is a paid add-on.
 * 
 * This is more expensive than regular sync, so it's restricted to admins only.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const userEmail = user.emailAddresses?.[0]?.emailAddress;
    if (!isAdminEmail(userEmail)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Use effective user ID to support admin emulation
    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Optional: specify a single plaid_item_id to refresh
    const body = await request.json().catch(() => ({}));
    const targetItemId = body.plaidItemId as string | undefined;

    // Fetch Plaid items for the user
    let query = supabase
      .from('user_plaid_items')
      .select('id, access_token, item_id, institution_name')
      .eq('user_id', effectiveUserId);

    if (targetItemId) {
      query = query.eq('id', targetItemId);
    }

    const { data: plaidItems, error: itemsError } = await query;

    if (itemsError) {
      logger.error({ err: itemsError, userId: effectiveUserId }, 'Failed to fetch Plaid items');
      return NextResponse.json({ error: 'Failed to fetch linked accounts' }, { status: 500 });
    }

    if (!plaidItems || plaidItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No linked accounts to refresh',
        refreshed: 0,
      });
    }

    const refreshResults: Array<{ institution: string; success: boolean; error?: string }> = [];

    // Trigger refresh for each Plaid item
    for (const plaidItem of plaidItems) {
      try {
        logger.info({
          userId: effectiveUserId,
          plaidItemId: plaidItem.id,
          institution: plaidItem.institution_name,
        }, 'Triggering bank data refresh');

        await plaidClient.transactionsRefresh({
          access_token: plaidItem.access_token,
        });

        refreshResults.push({
          institution: plaidItem.institution_name || 'Unknown',
          success: true,
        });

        logger.info({
          userId: effectiveUserId,
          plaidItemId: plaidItem.id,
          institution: plaidItem.institution_name,
        }, 'Bank data refresh triggered successfully');

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ err, userId: effectiveUserId, plaidItemId: plaidItem.id }, 'Failed to refresh Plaid item');
        
        refreshResults.push({
          institution: plaidItem.institution_name || 'Unknown',
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = refreshResults.filter(r => r.success).length;
    const failCount = refreshResults.filter(r => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      message: `Refresh triggered for ${successCount} institution(s)${failCount > 0 ? `, ${failCount} failed` : ''}. New transactions will appear after syncing.`,
      refreshed: successCount,
      failed: failCount,
      results: refreshResults,
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to refresh bank data');
    return NextResponse.json(
      { error: 'Failed to refresh bank data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

