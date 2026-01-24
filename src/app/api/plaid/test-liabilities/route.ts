import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { plaidClient } from '@/lib/plaid';
import { Products, CountryCode } from 'plaid';

// GET: List items and their liabilities status, or get liabilities data for a specific item
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    
    const supabase = createClient();

    // If itemId is provided, fetch liabilities for that specific item
    if (itemId) {
      const { data: item, error: itemError } = await supabase
        .from('user_plaid_items')
        .select('id, access_token, institution_name')
        .eq('id', itemId)
        .eq('user_id', effectiveUserId)
        .single();

      if (itemError || !item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      // Get item status
      const itemResponse = await plaidClient.itemGet({
        access_token: item.access_token,
      });

      const hasLiabilitiesConsent = itemResponse.data.item.consented_products?.includes(Products.Liabilities) || false;

      if (!hasLiabilitiesConsent) {
        return NextResponse.json({
          institution: item.institution_name,
          hasConsent: false,
          message: 'Liabilities consent not granted. Use POST to create update link token.',
        });
      }

      // Fetch accounts
      const accountsResponse = await plaidClient.accountsGet({
        access_token: item.access_token,
      });

      // Fetch liabilities
      const liabilitiesResponse = await plaidClient.liabilitiesGet({
        access_token: item.access_token,
      });

      const creditAccounts = accountsResponse.data.accounts.filter(
        a => a.type === 'credit' || a.subtype === 'credit card'
      );

      const creditLiabilities = liabilitiesResponse.data.liabilities.credit || [];

      // Merge account info with liability info
      const results = creditAccounts.map(account => {
        const liability = creditLiabilities.find(l => l.account_id === account.account_id);
        const isPersonal = !account.name.toLowerCase().includes('business') && 
                          !account.name.toLowerCase().includes('biz');
        
        return {
          accountId: account.account_id,
          name: account.name,
          mask: account.mask,
          type: isPersonal ? 'personal' : 'business',
          balances: {
            current: account.balances.current,
            available: account.balances.available,
            limit: account.balances.limit,
          },
          liabilities: liability ? {
            lastStatementBalance: liability.last_statement_balance,
            lastStatementIssueDate: liability.last_statement_issue_date,
            nextPaymentDueDate: liability.next_payment_due_date,
            minimumPaymentAmount: liability.minimum_payment_amount,
            isOverdue: liability.is_overdue,
            lastPaymentAmount: liability.last_payment_amount,
            lastPaymentDate: liability.last_payment_date,
            aprs: liability.aprs,
          } : null,
        };
      });

      return NextResponse.json({
        institution: item.institution_name,
        hasConsent: true,
        accounts: results,
      });
    }

    // List all items with their status and accounts
    const { data: items, error: itemsError } = await supabase
      .from('user_plaid_items')
      .select('id, institution_name, item_id, access_token')
      .eq('user_id', effectiveUserId)
      .order('institution_name');

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    const itemStatuses = await Promise.all(
      items.map(async (item) => {
        try {
          if (!item.access_token) return { id: item.id, institution: item.institution_name, error: 'No access token' };

          const [itemResponse, accountsResponse] = await Promise.all([
            plaidClient.itemGet({ access_token: item.access_token }),
            plaidClient.accountsGet({ access_token: item.access_token }),
          ]);

          const creditAccounts = accountsResponse.data.accounts
            .filter(a => a.type === 'credit' || a.subtype === 'credit card')
            .map(a => ({
              name: a.name,
              mask: a.mask,
              balance: a.balances.current,
              limit: a.balances.limit,
              type: (a.name.toLowerCase().includes('business') || a.name.toLowerCase().includes('biz')) 
                ? 'business' as const 
                : 'personal' as const,
            }));

          return {
            id: item.id,
            institution: item.institution_name,
            hasLiabilitiesAvailable: itemResponse.data.item.available_products?.includes(Products.Liabilities) || false,
            hasLiabilitiesConsent: itemResponse.data.item.consented_products?.includes(Products.Liabilities) || false,
            accounts: creditAccounts,
          };
        } catch {
          return { id: item.id, institution: item.institution_name, error: 'Failed to get status' };
        }
      })
    );

    return NextResponse.json({ items: itemStatuses });
  } catch (error) {
    console.error('Error in test-liabilities GET:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST: Create update link token for an item to grant liabilities consent
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

    const { data: item, error: itemError } = await supabase
      .from('user_plaid_items')
      .select('id, access_token, institution_name')
      .eq('id', itemId)
      .eq('user_id', effectiveUserId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Create update mode link token with liabilities
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
    console.error('Error in test-liabilities POST:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
