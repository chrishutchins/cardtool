import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { plaidClient } from '@/lib/plaid';
import { Products, CountryCode } from 'plaid';
import { checkRateLimit, ratelimit } from '@/lib/rate-limit';
import logger from '@/lib/logger';

export async function POST() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 5 link token requests per minute per user
    const { success } = await checkRateLimit(ratelimit, `plaid-link:${user.id}`);
    if (!success) {
      logger.warn({ userId: user.id }, 'Plaid link token rate limited');
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    // Log environment for debugging
    const plaidEnv = process.env.PLAID_ENV || 'sandbox';
    logger.info({ 
      plaidEnv,
      hasClientId: !!process.env.PLAID_CLIENT_ID,
      hasSecret: !!process.env.PLAID_SECRET,
      userId: user.id,
    }, 'Creating Plaid link token');

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: user.id,
      },
      client_name: 'CardTool',
      products: [Products.Transactions], // Transactions enables Balance API
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    logger.info({ 
      hasLinkToken: !!response.data.link_token,
      expiration: response.data.expiration,
    }, 'Plaid link token created successfully');

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    const plaidError = error as { response?: { data?: unknown } };
    logger.error({ 
      err: error,
      plaidErrorData: plaidError.response?.data,
      plaidEnv: process.env.PLAID_ENV,
    }, 'Failed to create Plaid link token');
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}
