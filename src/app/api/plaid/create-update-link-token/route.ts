import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { plaidClient } from '@/lib/plaid';
import { CountryCode } from 'plaid';
import { checkRateLimit, ratelimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * POST /api/plaid/create-update-link-token
 * 
 * Creates a Link token for "update mode" - used when an Item needs re-authentication
 * (e.g., after ITEM_LOGIN_REQUIRED error).
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

    // Rate limit: 5 link token requests per minute per user
    const { success } = await checkRateLimit(ratelimit, `plaid-link:${user.id}`);
    if (!success) {
      logger.warn({ userId: effectiveUserId }, 'Plaid update link token rate limited');
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    // Fetch the Plaid item to get the access token
    const supabase = createAdminClient();
    const { data: plaidItem, error: fetchError } = await supabase
      .from('user_plaid_items')
      .select('access_token, institution_name')
      .eq('id', plaidItemId)
      .eq('user_id', effectiveUserId)
      .single();

    if (fetchError || !plaidItem) {
      logger.error({ err: fetchError, plaidItemId, userId: effectiveUserId }, 'Failed to fetch Plaid item');
      return NextResponse.json({ error: 'Plaid item not found' }, { status: 404 });
    }

    logger.info({ 
      plaidItemId,
      institution: plaidItem.institution_name,
      userId: effectiveUserId,
    }, 'Creating Plaid update link token');

    // Create link token in update mode by passing access_token instead of products
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: effectiveUserId,
      },
      client_name: 'CardTool',
      access_token: plaidItem.access_token, // This puts Link in update mode
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    logger.info({ 
      hasLinkToken: !!response.data.link_token,
      plaidItemId,
    }, 'Plaid update link token created successfully');

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    const plaidError = error as { response?: { data?: unknown } };
    logger.error({ 
      err: error,
      plaidErrorData: plaidError.response?.data,
    }, 'Failed to create Plaid update link token');
    return NextResponse.json(
      { error: 'Failed to create update link token' },
      { status: 500 }
    );
  }
}
