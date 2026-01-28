import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { plaidClient } from '@/lib/plaid';
import logger from '@/lib/logger';

/**
 * POST - Refresh real-time balance for a single account
 * 
 * This uses the paid accountsBalanceGet endpoint which fetches real-time balances
 * directly from the bank. Only available for users with plaid_on_demand_refresh_enabled.
 * 
 * Body: { accountId: string, accountType: 'bank' | 'credit' }
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

    const { accountId, accountType } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }

    if (!accountType || !['bank', 'credit'].includes(accountType)) {
      return NextResponse.json({ error: 'Invalid accountType' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if user has on-demand refresh enabled
    const { data: featureFlags } = await supabase
      .from('user_feature_flags')
      .select('plaid_on_demand_refresh_enabled')
      .eq('user_id', effectiveUserId)
      .single();

    if (!featureFlags?.plaid_on_demand_refresh_enabled) {
      return NextResponse.json(
        { error: 'Real-time balance refresh not enabled for this account' },
        { status: 403 }
      );
    }

    // Get the account and its associated Plaid item
    let plaidItemId: string;
    let plaidAccountId: string;
    let tableName: 'user_bank_accounts' | 'user_linked_accounts';

    if (accountType === 'bank') {
      tableName = 'user_bank_accounts';
      const { data: account, error: accountError } = await supabase
        .from('user_bank_accounts')
        .select('id, plaid_item_id, plaid_account_id, is_manual')
        .eq('id', accountId)
        .eq('user_id', effectiveUserId)
        .single();

      if (accountError || !account) {
        logger.error({ err: accountError, accountId, userId: effectiveUserId }, 'Bank account not found');
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      if (account.is_manual || !account.plaid_item_id) {
        return NextResponse.json(
          { error: 'Cannot refresh balance for manual accounts' },
          { status: 400 }
        );
      }

      plaidItemId = account.plaid_item_id;
      plaidAccountId = account.plaid_account_id;
    } else {
      tableName = 'user_linked_accounts';
      const { data: account, error: accountError } = await supabase
        .from('user_linked_accounts')
        .select('id, plaid_item_id, plaid_account_id')
        .eq('id', accountId)
        .eq('user_id', effectiveUserId)
        .single();

      if (accountError || !account) {
        logger.error({ err: accountError, accountId, userId: effectiveUserId }, 'Linked account not found');
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      if (!account.plaid_item_id) {
        return NextResponse.json(
          { error: 'Account not linked to Plaid' },
          { status: 400 }
        );
      }

      plaidItemId = account.plaid_item_id;
      plaidAccountId = account.plaid_account_id;
    }

    // Get the access token for the Plaid item
    const { data: plaidItem, error: itemError } = await supabase
      .from('user_plaid_items')
      .select('access_token')
      .eq('id', plaidItemId)
      .eq('user_id', effectiveUserId)
      .single();

    if (itemError || !plaidItem) {
      logger.error({ err: itemError, plaidItemId, userId: effectiveUserId }, 'Plaid item not found');
      return NextResponse.json({ error: 'Plaid connection not found' }, { status: 404 });
    }

    // Call Plaid's accountsBalanceGet for real-time balance (paid Balance product)
    logger.info({ accountId, accountType, plaidAccountId, userId: effectiveUserId }, 'Fetching real-time balance');
    
    let balanceResponse;
    try {
      // First try without min_last_updated_datetime (works for most institutions)
      balanceResponse = await plaidClient.accountsBalanceGet({
        access_token: plaidItem.access_token,
        options: {
          account_ids: [plaidAccountId],
        },
      });
    } catch (firstError: unknown) {
      // Check if the error is because the institution requires min_last_updated_datetime
      const firstAxiosError = firstError as { 
        response?: { data?: { error_message?: string } } 
      };
      const firstErrorMessage = firstAxiosError?.response?.data?.error_message || '';
      
      if (firstErrorMessage.includes('min_last_updated_datetime parameter required')) {
        // Retry with the parameter - set to 24 hours ago to get most recent available data
        logger.info({ accountId, plaidAccountId }, 'Retrying with min_last_updated_datetime parameter');
        try {
          const minLastUpdated = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          balanceResponse = await plaidClient.accountsBalanceGet({
            access_token: plaidItem.access_token,
            options: {
              account_ids: [plaidAccountId],
              min_last_updated_datetime: minLastUpdated,
            },
          });
        } catch (retryError: unknown) {
          const retryAxiosError = retryError as { 
            response?: { data?: { error_message?: string } } 
          };
          const retryErrorMessage = retryAxiosError?.response?.data?.error_message || '';
          
          // Check if bank only updates at certain times
          if (retryErrorMessage.includes('requested datetime out of range')) {
            logger.info({ accountId, retryErrorMessage }, 'Bank has limited refresh frequency');
            return NextResponse.json({ 
              error: 'This bank only updates balances at certain times. Try again later or use the regular refresh.' 
            }, { status: 400 });
          }
          
          throw retryError; // Re-throw for generic handling below
        }
      } else {
        throw firstError; // Re-throw for generic handling below
      }
    }
    
    // If we still don't have a response, something went wrong
    if (!balanceResponse) {
      return NextResponse.json({ error: 'Failed to fetch balance from Plaid' }, { status: 500 });
    }

    const plaidAccount = balanceResponse.data.accounts[0];
    if (!plaidAccount) {
      logger.error({ accountId, plaidAccountId }, 'Account not found in Plaid response');
      return NextResponse.json({ error: 'Account not found in Plaid' }, { status: 404 });
    }

    // Update the account in our database
    const now = new Date().toISOString();
    
    if (accountType === 'bank') {
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          current_balance: plaidAccount.balances.current,
          available_balance: plaidAccount.balances.available,
          last_balance_update: now,
        })
        .eq('id', accountId)
        .eq('user_id', effectiveUserId);

      if (updateError) {
        logger.error({ err: updateError, accountId }, 'Failed to update bank account balance');
        return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
      }

      logger.info(
        { accountId, currentBalance: plaidAccount.balances.current, availableBalance: plaidAccount.balances.available },
        'Bank account balance refreshed'
      );

      return NextResponse.json({
        success: true,
        balance: {
          current_balance: plaidAccount.balances.current,
          available_balance: plaidAccount.balances.available,
          last_balance_update: now,
        },
      });
    } else {
      // For credit accounts, update credit-specific fields
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          current_balance: plaidAccount.balances.current,
          available_balance: plaidAccount.balances.available,
          credit_limit: plaidAccount.balances.limit,
          last_balance_update: now,
        })
        .eq('id', accountId)
        .eq('user_id', effectiveUserId);

      if (updateError) {
        logger.error({ err: updateError, accountId }, 'Failed to update linked account balance');
        return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
      }

      logger.info(
        { accountId, currentBalance: plaidAccount.balances.current, creditLimit: plaidAccount.balances.limit },
        'Credit account balance refreshed'
      );

      return NextResponse.json({
        success: true,
        balance: {
          current_balance: plaidAccount.balances.current,
          available_balance: plaidAccount.balances.available,
          credit_limit: plaidAccount.balances.limit,
          last_balance_update: now,
        },
      });
    }
  } catch (error) {
    // Extract detailed error info from Plaid response if available
    const axiosError = error as { 
      response?: { 
        data?: { 
          error_code?: string;
          error_message?: string;
          error_type?: string;
        } 
      };
      message?: string;
    };
    
    const plaidErrorCode = axiosError?.response?.data?.error_code;
    const plaidErrorMessage = axiosError?.response?.data?.error_message;
    const genericMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error({ 
      err: error, 
      errorCode: plaidErrorCode,
      errorMessage: plaidErrorMessage,
    }, 'Failed to refresh balance');
    
    // Return specific error messages based on error code
    if (plaidErrorCode === 'ITEM_LOGIN_REQUIRED') {
      return NextResponse.json({ error: 'Bank connection needs to be refreshed. Please reconnect in Settings.' }, { status: 400 });
    }
    
    if (plaidErrorCode === 'INVALID_ACCOUNT_ID') {
      return NextResponse.json({ error: 'Account no longer exists at the bank. Try unlinking and re-linking.' }, { status: 400 });
    }
    
    if (plaidErrorCode === 'PRODUCTS_NOT_SUPPORTED') {
      return NextResponse.json({ error: 'This bank does not support real-time balance refresh.' }, { status: 400 });
    }
    
    // Use the detailed Plaid error message if available
    const displayError = plaidErrorMessage || genericMessage;
    return NextResponse.json(
      { error: `Plaid error: ${displayError}` },
      { status: 500 }
    );
  }
}
