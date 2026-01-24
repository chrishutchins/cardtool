/**
 * Test script to check Liabilities support by issuer
 * Lists all linked items grouped by institution
 * 
 * Usage:
 *   npx tsx scripts/test-liabilities-by-issuer.ts
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createClient } from '@supabase/supabase-js';

// Initialize Plaid client
function getPlaidEnvironment() {
  switch (process.env.PLAID_ENV) {
    case 'production':
      return PlaidEnvironments.production;
    case 'development':
      return PlaidEnvironments.development;
    default:
      return PlaidEnvironments.sandbox;
  }
}

const plaidConfig = new Configuration({
  basePath: getPlaidEnvironment(),
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('='.repeat(70));
  console.log('Liabilities Support by Issuer');
  console.log('='.repeat(70));
  console.log('');

  // Fetch all plaid items
  const { data: plaidItems, error: itemsError } = await supabase
    .from('user_plaid_items')
    .select('id, user_id, access_token, institution_name, item_id')
    .order('institution_name');

  if (itemsError || !plaidItems || plaidItems.length === 0) {
    console.error('No Plaid items found');
    return;
  }

  // Group by institution
  const byInstitution = new Map<string, typeof plaidItems>();
  for (const item of plaidItems) {
    const name = item.institution_name || 'Unknown';
    if (!byInstitution.has(name)) {
      byInstitution.set(name, []);
    }
    byInstitution.get(name)!.push(item);
  }

  console.log(`Found ${plaidItems.length} items across ${byInstitution.size} institutions:\n`);

  for (const [institution, items] of byInstitution) {
    console.log('-'.repeat(70));
    console.log(`📦 ${institution} (${items.length} item${items.length > 1 ? 's' : ''})`);
    console.log('-'.repeat(70));

    for (const item of items) {
      console.log(`\n  Item ID: ${item.item_id.substring(0, 20)}...`);
      
      try {
        // Get item details
        const itemResponse = await plaidClient.itemGet({
          access_token: item.access_token,
        });

        const availableProducts = itemResponse.data.item.available_products || [];
        const consentedProducts = itemResponse.data.item.consented_products || [];
        const hasLiabilitiesAvailable = availableProducts.includes('liabilities');
        const hasLiabilitiesConsent = consentedProducts.includes('liabilities');

        console.log(`  Liabilities Available: ${hasLiabilitiesAvailable ? '✅ YES' : '❌ NO'}`);
        console.log(`  Liabilities Consented: ${hasLiabilitiesConsent ? '✅ YES' : '⚠️  NO (needs update)'}`);

        // Get accounts for this item
        const accountsResponse = await plaidClient.accountsGet({
          access_token: item.access_token,
        });

        const creditAccounts = accountsResponse.data.accounts.filter(
          a => a.type === 'credit' || a.subtype === 'credit card'
        );

        console.log(`  Credit Accounts (${creditAccounts.length}):`);
        for (const account of creditAccounts) {
          const isPersonal = !account.name.toLowerCase().includes('business') && 
                            !account.name.toLowerCase().includes('biz');
          const cardType = isPersonal ? '👤 Personal' : '🏢 Business';
          console.log(`    - ${account.name} (${cardType})`);
          console.log(`      Balance: $${account.balances.current} | Limit: ${account.balances.limit ? `$${account.balances.limit}` : 'N/A'}`);
        }

        // If liabilities is consented, try to get the data
        if (hasLiabilitiesConsent) {
          console.log('\n  📊 Fetching Liabilities Data...');
          try {
            const liabilitiesResponse = await plaidClient.liabilitiesGet({
              access_token: item.access_token,
            });

            const creditLiabilities = liabilitiesResponse.data.liabilities.credit || [];
            if (creditLiabilities.length > 0) {
              for (const liability of creditLiabilities) {
                const matchingAccount = creditAccounts.find(a => a.account_id === liability.account_id);
                console.log(`\n  💳 ${matchingAccount?.name || liability.account_id}:`);
                console.log(`      Statement Balance:    ${liability.last_statement_balance !== null ? `$${liability.last_statement_balance}` : '❌ N/A'}`);
                console.log(`      Statement Issue Date: ${liability.last_statement_issue_date || '❌ N/A'}`);
                console.log(`      Payment Due Date:     ${liability.next_payment_due_date || '❌ N/A'}`);
                console.log(`      Minimum Payment:      ${liability.minimum_payment_amount !== null ? `$${liability.minimum_payment_amount}` : '❌ N/A'}`);
                console.log(`      Is Overdue:           ${liability.is_overdue !== null ? (liability.is_overdue ? '⚠️ YES' : 'No') : '❌ N/A'}`);
                console.log(`      Last Payment:         ${liability.last_payment_amount !== null ? `$${liability.last_payment_amount} on ${liability.last_payment_date}` : '❌ N/A'}`);
              }
            } else {
              console.log('  ⚠️  No credit liabilities returned');
            }
          } catch (libError: unknown) {
            const plaidError = libError as { response?: { data?: { error_code?: string } } };
            console.log(`  ❌ Liabilities Error: ${plaidError.response?.data?.error_code || 'Unknown'}`);
          }
        }

      } catch (error: unknown) {
        const plaidError = error as { response?: { data?: { error_code?: string } } };
        console.log(`  ❌ Error: ${plaidError.response?.data?.error_code || 'Unknown'}`);
      }
    }
    console.log('');
  }

  console.log('='.repeat(70));
  console.log('Summary:');
  console.log('- To get Liabilities data, users need to grant consent via Plaid Link');
  console.log('- Use the test endpoint to grant consent for a specific item');
  console.log('='.repeat(70));
}

main().catch(console.error);
