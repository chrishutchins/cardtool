import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { isAdminEmail } from '@/lib/admin';
import { plaidClient } from '@/lib/plaid';
import logger from '@/lib/logger';

/**
 * Admin-only endpoint to backfill consented_products for all Plaid items.
 * This queries Plaid to get the actual consent status and updates our database.
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

    // Fetch all Plaid items for the user
    const { data: plaidItems, error: itemsError } = await supabase
      .from('user_plaid_items')
      .select('id, access_token, institution_name, consented_products')
      .eq('user_id', effectiveUserId);

    if (itemsError) {
      logger.error({ err: itemsError, userId: effectiveUserId }, 'Failed to fetch Plaid items');
      return NextResponse.json({ error: 'Failed to fetch Plaid items' }, { status: 500 });
    }

    if (!plaidItems || plaidItems.length === 0) {
      return NextResponse.json({ success: true, message: 'No Plaid items to update', updated: 0 });
    }

    const results: Array<{ institution: string; consented: string[]; updated: boolean }> = [];

    for (const item of plaidItems) {
      try {
        // Query Plaid for actual consent status
        const itemResponse = await plaidClient.itemGet({
          access_token: item.access_token,
        });

        const consentedProducts = itemResponse.data.item.consented_products || [];
        
        // Convert Plaid product enum values to lowercase strings for storage
        const consentedStrings = consentedProducts.map(p => p.toLowerCase());

        // Update our database
        const { error: updateError } = await supabase
          .from('user_plaid_items')
          .update({ 
            consented_products: consentedStrings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (updateError) {
          logger.error({ err: updateError, itemId: item.id }, 'Failed to update consented_products');
          results.push({
            institution: item.institution_name || 'Unknown',
            consented: consentedStrings,
            updated: false,
          });
        } else {
          results.push({
            institution: item.institution_name || 'Unknown',
            consented: consentedStrings,
            updated: true,
          });
        }

        logger.info({
          itemId: item.id,
          institution: item.institution_name,
          consented: consentedStrings,
        }, 'Updated consented_products for Plaid item');

      } catch (err) {
        logger.error({ err, itemId: item.id }, 'Failed to get item status from Plaid');
        results.push({
          institution: item.institution_name || 'Unknown',
          consented: [],
          updated: false,
        });
      }
    }

    const updatedCount = results.filter(r => r.updated).length;

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} of ${plaidItems.length} items`,
      updated: updatedCount,
      results,
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to backfill consent data');
    return NextResponse.json(
      { error: 'Failed to backfill consent data' },
      { status: 500 }
    );
  }
}
