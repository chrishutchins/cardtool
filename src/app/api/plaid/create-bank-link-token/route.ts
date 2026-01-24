import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { plaidClient } from '@/lib/plaid';
import { Products, CountryCode, DepositoryAccountSubtype } from 'plaid';
import { checkRateLimit, ratelimit } from '@/lib/rate-limit';
import logger from '@/lib/logger';

/**
 * Creates a Plaid Link token specifically for linking depository (bank) accounts.
 * These accounts are used as "Pay From" accounts for credit card payments.
 */
export async function POST() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use effective user ID (respects DEV_USER_ID_OVERRIDE in development)
    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 5 link token requests per minute per user
    const { success } = await checkRateLimit(ratelimit, `plaid-bank-link:${user.id}`);
    if (!success) {
      logger.warn({ userId: effectiveUserId }, 'Plaid bank link token rate limited');
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    // Log environment for debugging
    const plaidEnv = process.env.PLAID_ENV || 'sandbox';
    logger.info({ 
      plaidEnv,
      userId: effectiveUserId,
    }, 'Creating Plaid bank link token');

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: effectiveUserId,
      },
      client_name: 'CardTool',
      // Auth only - we just need account info and balances, not transaction history
      // This is cheaper and avoids duplicate charges if user already has transactions for credit cards
      products: [Products.Auth],
      country_codes: [CountryCode.Us],
      language: 'en',
      // Only allow depository accounts (checking/savings)
      account_filters: {
        depository: {
          account_subtypes: [DepositoryAccountSubtype.Checking, DepositoryAccountSubtype.Savings],
        },
      },
    });

    logger.info({ 
      hasLinkToken: !!response.data.link_token,
      expiration: response.data.expiration,
    }, 'Plaid bank link token created successfully');

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    const plaidError = error as { response?: { data?: unknown } };
    logger.error({ 
      err: error,
      plaidErrorData: plaidError.response?.data,
      plaidEnv: process.env.PLAID_ENV,
    }, 'Failed to create Plaid bank link token');
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}
