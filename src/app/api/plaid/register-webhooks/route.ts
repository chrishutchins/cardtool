import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { isAdminEmail } from '@/lib/admin';
import { plaidClient } from '@/lib/plaid';
import logger from '@/lib/logger';

/**
 * Admin-only endpoint to register webhook URLs for existing Plaid items.
 * This is needed because items created before webhook support was added
 * won't have webhooks registered.
 */
export async function POST() {
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

    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cardtool.app';
    const webhookUrl = `${baseUrl}/api/plaid/webhook`;

    // Fetch all Plaid items for the user
    const { data: plaidItems, error: itemsError } = await supabase
      .from('user_plaid_items')
      .select('id, access_token, institution_name')
      .eq('user_id', effectiveUserId);

    if (itemsError) {
      logger.error({ err: itemsError, userId: effectiveUserId }, 'Failed to fetch Plaid items');
      return NextResponse.json({ error: 'Failed to fetch Plaid items' }, { status: 500 });
    }

    if (!plaidItems || plaidItems.length === 0) {
      return NextResponse.json({ success: true, message: 'No Plaid items to update', updated: 0 });
    }

    const results: Array<{ institution: string; success: boolean; error?: string }> = [];

    for (const item of plaidItems) {
      try {
        // Update webhook URL for this item
        await plaidClient.itemWebhookUpdate({
          access_token: item.access_token,
          webhook: webhookUrl,
        });

        results.push({
          institution: item.institution_name || 'Unknown',
          success: true,
        });

        logger.info({
          itemId: item.id,
          institution: item.institution_name,
          webhookUrl,
        }, 'Registered webhook for Plaid item');

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ err, itemId: item.id }, 'Failed to register webhook for Plaid item');
        results.push({
          institution: item.institution_name || 'Unknown',
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Registered webhooks for ${successCount} of ${plaidItems.length} items`,
      webhookUrl,
      updated: successCount,
      results,
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to register webhooks');
    return NextResponse.json(
      { error: 'Failed to register webhooks' },
      { status: 500 }
    );
  }
}
