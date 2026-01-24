import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { plaidClient } from '@/lib/plaid';
import { Products, CountryCode } from 'plaid';
import logger from '@/lib/logger';

/**
 * POST: Create an update mode link token to grant Liabilities consent to an existing Plaid item.
 * This allows users to upgrade a Transactions-only connection to also include statement data.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await request.json();
    
    if (!itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 });
    }

    const supabase = createClient();

    // Verify user has liabilities tier enabled
    const { data: featureFlags } = await supabase
      .from('user_feature_flags')
      .select('plaid_liabilities_enabled')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    if (!featureFlags?.plaid_liabilities_enabled) {
      return NextResponse.json({ 
        error: 'Liabilities feature not enabled for this account' 
      }, { status: 403 });
    }

    // Get the Plaid item
    const { data: item, error: itemError } = await supabase
      .from('user_plaid_items')
      .select('id, access_token, institution_name')
      .eq('id', itemId)
      .eq('user_id', effectiveUserId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    logger.info({ 
      userId: effectiveUserId, 
      itemId, 
      institution: item.institution_name 
    }, 'Creating update link token for Liabilities consent');

    // Create update mode link token with liabilities as additional consented product
    const linkTokenResponse = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: effectiveUserId,
      },
      client_name: 'CardTool',
      access_token: item.access_token,
      additional_consented_products: [Products.Liabilities],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    return NextResponse.json({
      linkToken: linkTokenResponse.data.link_token,
      institution: item.institution_name,
      expiration: linkTokenResponse.data.expiration,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating Liabilities consent link token');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PATCH: Called after user completes Plaid Link update flow to record that consent was granted.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await request.json();
    
    if (!itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get the Plaid item to verify ownership and get access token
    const { data: item, error: itemError } = await supabase
      .from('user_plaid_items')
      .select('id, access_token, consented_products')
      .eq('id', itemId)
      .eq('user_id', effectiveUserId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Verify consent was actually granted by checking with Plaid
    const itemResponse = await plaidClient.itemGet({
      access_token: item.access_token,
    });

    const hasLiabilitiesConsent = itemResponse.data.item.consented_products?.includes(Products.Liabilities) || false;

    if (!hasLiabilitiesConsent) {
      logger.warn({ itemId, effectiveUserId }, 'Liabilities consent not found on item after update');
      return NextResponse.json({ 
        error: 'Consent not granted', 
        hasLiabilitiesConsent: false 
      }, { status: 400 });
    }

    // Update our record of consented products
    const existingProducts = item.consented_products || [];
    const updatedProducts = existingProducts.includes('liabilities') 
      ? existingProducts 
      : [...existingProducts, 'liabilities'];

    await supabase
      .from('user_plaid_items')
      .update({ 
        consented_products: updatedProducts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    logger.info({ itemId, effectiveUserId }, 'Liabilities consent recorded');

    // Optionally, immediately fetch liabilities data
    try {
      const liabilitiesResponse = await plaidClient.liabilitiesGet({
        access_token: item.access_token,
      });

      // Update linked accounts with statement data
      const creditLiabilities = liabilitiesResponse.data.liabilities.credit || [];
      
      for (const liability of creditLiabilities) {
        if (!liability.account_id) continue;
        
        await supabase
          .from('user_linked_accounts')
          .update({
            last_statement_balance: liability.last_statement_balance,
            next_payment_due_date: liability.next_payment_due_date,
          })
          .eq('plaid_account_id', liability.account_id)
          .eq('user_id', effectiveUserId);
      }
    } catch (liabilitiesError) {
      logger.warn({ err: liabilitiesError, itemId }, 'Failed to fetch initial liabilities data after consent');
      // Don't fail the request - consent was granted, we can sync later
    }

    return NextResponse.json({ 
      success: true, 
      hasLiabilitiesConsent: true,
      consentedProducts: updatedProducts,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error recording Liabilities consent');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
