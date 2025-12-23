import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { plaidClient } from '@/lib/plaid';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { public_token, metadata } = await request.json();

    if (!public_token) {
      return NextResponse.json({ error: 'Missing public_token' }, { status: 400 });
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    const supabase = await createClient();

    // Store the Plaid Item
    const { data: plaidItem, error: itemError } = await supabase
      .from('user_plaid_items')
      .insert({
        user_id: user.id,
        access_token: accessToken,
        item_id: itemId,
        institution_id: metadata?.institution?.institution_id || null,
        institution_name: metadata?.institution?.name || null,
      })
      .select()
      .single();

    if (itemError || !plaidItem) {
      console.error('Error storing plaid item:', itemError);
      return NextResponse.json(
        { error: 'Failed to store plaid item' },
        { status: 500 }
      );
    }

    // Fetch accounts and balances with retry logic
    console.log('Fetching balances for item:', plaidItem.id);
    console.log('Metadata accounts from Link:', JSON.stringify(metadata?.accounts, null, 2));
    
    // Helper function to fetch balances with retries
    // Some institutions (like Capital One) require min_last_updated_datetime
    async function fetchBalancesWithRetry(token: string, maxRetries = 3, delayMs = 1000) {
      let lastError: unknown;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Balance fetch attempt ${attempt}/${maxRetries}`);
          
          // Set min_last_updated_datetime to 24 hours ago
          // Required for some institutions like Capital One (ins_128026)
          const minLastUpdated = new Date();
          minLastUpdated.setHours(minLastUpdated.getHours() - 24);
          
          const response = await plaidClient.accountsBalanceGet({
            access_token: token,
            options: {
              min_last_updated_datetime: minLastUpdated.toISOString(),
            },
          });
          console.log('Balance fetch successful on attempt', attempt);
          return response;
        } catch (err) {
          lastError = err;
          console.log(`Balance fetch attempt ${attempt} failed:`, err instanceof Error ? err.message : 'Unknown error');
          if (attempt < maxRetries) {
            console.log(`Waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 2; // Exponential backoff
          }
        }
      }
      throw lastError;
    }
    
    let balanceResponse;
    try {
      balanceResponse = await fetchBalancesWithRetry(accessToken);
    } catch (balanceError: unknown) {
      const errorMessage = balanceError instanceof Error ? balanceError.message : 'Unknown error';
      const errorDetails = balanceError && typeof balanceError === 'object' && 'response' in balanceError
        ? JSON.stringify((balanceError as { response?: { data?: unknown } }).response?.data)
        : '';
      console.error('Error fetching balances from Plaid:', errorMessage, errorDetails);
      
      // Try to use accounts from metadata if balance fetch fails
      const metadataAccounts = metadata?.accounts || [];
      const creditFromMetadata = metadataAccounts.filter(
        (a: { type?: string; subtype?: string }) => a.type === 'credit' || a.subtype === 'credit card'
      );
      
      if (creditFromMetadata.length > 0) {
        console.log('Using', creditFromMetadata.length, 'credit accounts from Link metadata');
        const accountsToInsert = creditFromMetadata.map((account: { id: string; name: string; type: string; subtype?: string; mask?: string }) => ({
          user_id: user.id,
          plaid_item_id: plaidItem.id,
          plaid_account_id: account.id,
          name: account.name,
          official_name: null,
          type: account.type,
          subtype: account.subtype || null,
          mask: account.mask || null,
          current_balance: null,
          available_balance: null,
          credit_limit: null,
          iso_currency_code: 'USD',
          last_balance_update: new Date().toISOString(),
        }));
        
        const { error: insertError } = await supabase
          .from('user_linked_accounts')
          .insert(accountsToInsert);
          
        if (insertError) {
          console.error('Error inserting from metadata:', insertError);
          // Clean up orphaned plaid_item
          await supabase.from('user_plaid_items').delete().eq('id', plaidItem.id);
          return NextResponse.json({
            success: false,
            error: 'Failed to store accounts',
            details: insertError.message,
          }, { status: 500 });
        }
        
        return NextResponse.json({
          success: true,
          institution_name: metadata?.institution?.name,
          accounts_linked: creditFromMetadata.length,
          warning: 'Balance data not available - will sync on next refresh',
        });
      }
      
      // No credit accounts in metadata either - clean up
      await supabase.from('user_plaid_items').delete().eq('id', plaidItem.id);
      return NextResponse.json({
        success: true,
        institution_name: metadata?.institution?.name,
        accounts_linked: 0,
        warning: 'Could not fetch account balances',
      });
    }

    // Log all accounts for debugging (will appear in terminal/Vercel logs)
    console.log('Plaid accounts received from API:', JSON.stringify(balanceResponse.data.accounts.map(a => ({
      account_id: a.account_id,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      balances: a.balances,
    })), null, 2));

    // Store linked accounts - include both type=credit AND subtype=credit card
    // Some institutions (like Capital One) may categorize cards differently
    const creditAccounts = balanceResponse.data.accounts.filter(
      (account) => account.type === 'credit' || account.subtype === 'credit card'
    );

    console.log('Credit accounts after filter:', creditAccounts.length);

    let accountsLinked = 0;

    if (creditAccounts.length > 0) {
      const accountsToInsert = creditAccounts.map((account) => ({
        user_id: user.id,
        plaid_item_id: plaidItem.id,
        plaid_account_id: account.account_id,
        name: account.name,
        official_name: account.official_name || null,
        type: account.type,
        subtype: account.subtype || null,
        mask: account.mask || null,
        current_balance: account.balances.current,
        available_balance: account.balances.available,
        credit_limit: account.balances.limit,
        iso_currency_code: account.balances.iso_currency_code || 'USD',
        last_balance_update: new Date().toISOString(),
      }));

      console.log('Inserting accounts:', JSON.stringify(accountsToInsert, null, 2));

      const { error: accountsError } = await supabase
        .from('user_linked_accounts')
        .insert(accountsToInsert);

      if (accountsError) {
        console.error('Error storing linked accounts:', JSON.stringify(accountsError, null, 2));
        return NextResponse.json(
          { error: 'Failed to store linked accounts', details: accountsError.message, code: accountsError.code },
          { status: 500 }
        );
      }
      
      console.log('Successfully inserted', creditAccounts.length, 'accounts');
      accountsLinked = creditAccounts.length;
    } else {
      // No credit accounts found - delete the plaid_item to avoid orphans
      console.log('No credit accounts found for institution:', metadata?.institution?.name);
      await supabase
        .from('user_plaid_items')
        .delete()
        .eq('id', plaidItem.id);
    }

    return NextResponse.json({
      success: true,
      institution_name: metadata?.institution?.name,
      accounts_linked: accountsLinked,
    });
  } catch (error) {
    // Log detailed error info
    console.error('Error exchanging token:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    return NextResponse.json(
      { error: 'Failed to exchange token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
