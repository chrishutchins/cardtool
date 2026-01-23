import { NextRequest, NextResponse } from 'next/server';

// Akoya sandbox credentials - move to env vars for production
const AKOYA_CLIENT_ID = '52d5dc75-98e0-4df4-b1ff-809a2c06a387';
const AKOYA_CLIENT_SECRET = 'jJBEwwl2mgSQ4IfL~UooyLij0C';
const AKOYA_SANDBOX_TOKEN_URL = 'https://sandbox-idp.ddp.akoya.com/token';
const AKOYA_SANDBOX_API_URL = 'https://sandbox-products.ddp.akoya.com';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // Contains provider ID
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Redirect URL for the test page
  const testPageUrl = new URL('/akoya-test.html', request.nextUrl.origin);

  if (error) {
    console.error('Akoya OAuth error:', error, errorDescription);
    testPageUrl.searchParams.set('error', error);
    testPageUrl.searchParams.set('details', errorDescription || '');
    return NextResponse.redirect(testPageUrl);
  }

  if (!code) {
    testPageUrl.searchParams.set('error', 'no_code');
    testPageUrl.searchParams.set('details', 'No authorization code received');
    return NextResponse.redirect(testPageUrl);
  }

  const provider = state || 'unknown';
  console.log('Akoya callback received:', { code: code.substring(0, 20) + '...', provider });

  try {
    // Exchange authorization code for tokens
    const redirectUri = new URL('/api/akoya/callback', request.nextUrl.origin).toString();
    
    const tokenResponse = await fetch(AKOYA_SANDBOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${AKOYA_CLIENT_ID}:${AKOYA_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      testPageUrl.searchParams.set('error', 'token_exchange_failed');
      testPageUrl.searchParams.set('details', `Status ${tokenResponse.status}: ${errorText}`);
      return NextResponse.redirect(testPageUrl);
    }

    const tokens = await tokenResponse.json();
    console.log('Token exchange successful, got tokens:', Object.keys(tokens));

    const idToken = tokens.id_token;
    if (!idToken) {
      testPageUrl.searchParams.set('error', 'no_id_token');
      testPageUrl.searchParams.set('details', 'No ID token in response');
      return NextResponse.redirect(testPageUrl);
    }

    // Fetch accounts
    const accountsResponse = await fetch(
      `${AKOYA_SANDBOX_API_URL}/accounts-info/v2/${provider}`,
      {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Accept': 'application/json',
        },
      }
    );

    let accountsData = null;
    if (accountsResponse.ok) {
      accountsData = await accountsResponse.json();
      console.log('Accounts fetched:', accountsData);
    } else {
      const errorText = await accountsResponse.text();
      console.error('Failed to fetch accounts:', accountsResponse.status, errorText);
      accountsData = { error: `Failed to fetch: ${accountsResponse.status}`, details: errorText };
    }

    // Get the first account ID for transactions
    let transactionsData = null;
    const accounts = accountsData?.accounts || accountsData?.depositAccounts || [];
    const firstAccountId = accounts[0]?.accountId;

    if (firstAccountId) {
      // Fetch transactions for the first account
      const transactionsResponse = await fetch(
        `${AKOYA_SANDBOX_API_URL}/transactions/v2/${provider}/${firstAccountId}`,
        {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (transactionsResponse.ok) {
        transactionsData = await transactionsResponse.json();
        console.log('Transactions fetched:', transactionsData);
      } else {
        const errorText = await transactionsResponse.text();
        console.error('Failed to fetch transactions:', transactionsResponse.status, errorText);
        transactionsData = { error: `Failed to fetch: ${transactionsResponse.status}`, details: errorText };
      }
    }

    // Redirect back to test page with data
    testPageUrl.searchParams.set('provider', provider);
    testPageUrl.searchParams.set('accounts', encodeURIComponent(JSON.stringify(accountsData)));
    if (transactionsData) {
      testPageUrl.searchParams.set('transactions', encodeURIComponent(JSON.stringify(transactionsData)));
    }

    return NextResponse.redirect(testPageUrl);

  } catch (err) {
    console.error('Akoya callback error:', err);
    testPageUrl.searchParams.set('error', 'exception');
    testPageUrl.searchParams.set('details', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.redirect(testPageUrl);
  }
}
