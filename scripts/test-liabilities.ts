/**
 * Test script to explore Plaid Liabilities API
 * 
 * Usage:
 *   npx tsx scripts/test-liabilities.ts
 *   
 * Or with a specific user ID:
 *   npx tsx scripts/test-liabilities.ts user_xxx
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
  const targetUserId = process.argv[2];
  
  console.log('='.repeat(60));
  console.log('Plaid Liabilities API Explorer');
  console.log('='.repeat(60));
  console.log(`Plaid Environment: ${process.env.PLAID_ENV || 'sandbox'}`);
  console.log(`Target User: ${targetUserId || 'all users'}`);
  console.log('');

  // Fetch plaid items
  let query = supabase
    .from('user_plaid_items')
    .select('id, user_id, access_token, institution_name, item_id');
  
  if (targetUserId) {
    query = query.eq('user_id', targetUserId);
  }
  
  const { data: plaidItems, error: itemsError } = await query.limit(10);

  if (itemsError) {
    console.error('Error fetching plaid items:', itemsError);
    return;
  }

  if (!plaidItems || plaidItems.length === 0) {
    console.log('No Plaid items found.');
    return;
  }

  console.log(`Found ${plaidItems.length} Plaid item(s)\n`);

  // Test liabilities for each item
  for (const item of plaidItems) {
    console.log('-'.repeat(60));
    console.log(`Institution: ${item.institution_name || 'Unknown'}`);
    console.log(`Item ID: ${item.item_id}`);
    console.log(`User ID: ${item.user_id}`);
    console.log('');

    try {
      // First, let's see what accounts are on this item
      console.log('Fetching accounts...');
      const accountsResponse = await plaidClient.accountsGet({
        access_token: item.access_token,
      });
      
      console.log(`\nAccounts (${accountsResponse.data.accounts.length}):`);
      for (const account of accountsResponse.data.accounts) {
        console.log(`  - ${account.name} (${account.type}/${account.subtype})`);
        console.log(`    Account ID: ${account.account_id}`);
        console.log(`    Mask: ****${account.mask}`);
        console.log(`    Balance: $${account.balances.current}`);
        console.log(`    Limit: ${account.balances.limit ? `$${account.balances.limit}` : 'N/A'}`);
      }

      // Now try liabilities
      console.log('\n📋 Fetching liabilities...');
      
      const liabilitiesResponse = await plaidClient.liabilitiesGet({
        access_token: item.access_token,
      });

      const { liabilities } = liabilitiesResponse.data;
      
      console.log('\n✅ Liabilities Response:');
      console.log(JSON.stringify(liabilities, null, 2));

      // Parse credit card liabilities specifically
      if (liabilities.credit && liabilities.credit.length > 0) {
        console.log('\n💳 Credit Card Liabilities:');
        for (const credit of liabilities.credit) {
          console.log(`\n  Account ID: ${credit.account_id}`);
          console.log(`  Last Statement Balance: ${credit.last_statement_balance !== null ? `$${credit.last_statement_balance}` : 'N/A'}`);
          console.log(`  Last Statement Date: ${credit.last_statement_issue_date || 'N/A'}`);
          console.log(`  Next Payment Due Date: ${credit.next_payment_due_date || 'N/A'}`);
          console.log(`  Minimum Payment: ${credit.minimum_payment_amount !== null ? `$${credit.minimum_payment_amount}` : 'N/A'}`);
          console.log(`  Is Overdue: ${credit.is_overdue}`);
          console.log(`  Last Payment Amount: ${credit.last_payment_amount !== null ? `$${credit.last_payment_amount}` : 'N/A'}`);
          console.log(`  Last Payment Date: ${credit.last_payment_date || 'N/A'}`);
          
          if (credit.aprs && credit.aprs.length > 0) {
            console.log(`  APRs:`);
            for (const apr of credit.aprs) {
              console.log(`    - ${apr.apr_type}: ${apr.apr_percentage}%`);
            }
          }
        }
      } else {
        console.log('\n⚠️  No credit card liabilities found (this may be expected if liabilities product was not requested during Link)');
      }

      // Check for student loans
      if (liabilities.student && liabilities.student.length > 0) {
        console.log(`\n📚 Student Loans: ${liabilities.student.length} found`);
      }

      // Check for mortgages  
      if (liabilities.mortgage && liabilities.mortgage.length > 0) {
        console.log(`\n🏠 Mortgages: ${liabilities.mortgage.length} found`);
      }

    } catch (error: unknown) {
      const plaidError = error as { response?: { data?: { error_code?: string; error_message?: string } } };
      
      if (plaidError.response?.data) {
        const { error_code, error_message } = plaidError.response.data;
        console.log(`\n❌ Plaid Error: ${error_code}`);
        console.log(`   ${error_message}`);
        
        if (error_code === 'PRODUCTS_NOT_SUPPORTED') {
          console.log('\n💡 This institution does not support the Liabilities product.');
          console.log('   Statement data may not be available for this account.');
        } else if (error_code === 'PRODUCT_NOT_ENABLED') {
          console.log('\n💡 The Liabilities product was not enabled when this item was linked.');
          console.log('   You may need to re-link the account with Liabilities enabled.');
        }
      } else {
        console.error('\n❌ Error:', error);
      }
    }
    
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('Done!');
}

main().catch(console.error);
