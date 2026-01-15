import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { createAdminClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * POST /api/plaid/clear-reauth
 * 
 * Clears the requires_reauth flag after a successful Link update mode session.
 * 
 * Body: { plaidItemId: string }
 */
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plaidItemId } = body;

    if (!plaidItemId) {
      return NextResponse.json({ error: 'Missing plaidItemId' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Clear the reauth flags
    const { error: updateError } = await supabase
      .from('user_plaid_items')
      .update({
        requires_reauth: false,
        error_code: null,
        error_message: null,
        error_detected_at: null,
      })
      .eq('id', plaidItemId)
      .eq('user_id', effectiveUserId);

    if (updateError) {
      logger.error({ err: updateError, plaidItemId, userId: effectiveUserId }, 'Failed to clear reauth flag');
      return NextResponse.json({ error: 'Failed to clear reauth flag' }, { status: 500 });
    }

    logger.info({ plaidItemId, userId: effectiveUserId }, 'Cleared reauth flag after successful reconnection');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to clear reauth flag');
    return NextResponse.json(
      { error: 'Failed to clear reauth flag' },
      { status: 500 }
    );
  }
}
