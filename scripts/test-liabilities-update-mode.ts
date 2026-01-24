/**
 * Test script to see if we can add Liabilities product via update mode
 * 
 * Usage:
 *   npx tsx scripts/test-liabilities-update-mode.ts
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
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
  console.log('='.repeat(60));
  console.log('Testing Update Mode with Liabilities Product');
  console.log('='.repeat(60));
  console.log(`Plaid Environment: ${process.env.PLAID_ENV || 'sandbox'}`);
  console.log('');

  // Get one plaid item to test with
  const { data: plaidItems, error: itemsError } = await supabase
    .from('user_plaid_items')
    .select('id, user_id, access_token, institution_name, item_id')
    .limit(1);

  if (itemsError || !plaidItems || plaidItems.length === 0) {
    console.error('No Plaid items found');
    return;
  }

  const item = plaidItems[0];
  console.log(`Testing with: ${item.institution_name}`);
  console.log(`Item ID: ${item.item_id}`);
  console.log('');

  // First, let's check what products this item currently has
  console.log('📋 Checking current item status...');
  try {
    const itemResponse = await plaidClient.itemGet({
      access_token: item.access_token,
    });
    
    console.log('\nCurrent Item Status:');
    console.log(`  Available Products: ${itemResponse.data.item.available_products?.join(', ') || 'none'}`);
    console.log(`  Billed Products: ${itemResponse.data.item.billed_products?.join(', ') || 'none'}`);
    console.log(`  Consented Products: ${itemResponse.data.item.consented_products?.join(', ') || 'none'}`);
    console.log(`  Products: ${itemResponse.data.item.products?.join(', ') || 'none'}`);
    
  } catch (error: unknown) {
    const plaidError = error as { response?: { data?: unknown } };
    console.error('Error getting item:', plaidError.response?.data || error);
  }

  // Try to create an update mode link token with liabilities
  console.log('\n📝 Attempting to create update mode link token with Liabilities...');
  
  try {
    const linkTokenResponse = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: item.user_id,
      },
      client_name: 'CardTool',
      access_token: item.access_token,
      // Try adding liabilities as additional consented product
      additional_consented_products: [Products.Liabilities],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
    
    console.log('\n✅ Update mode link token created successfully!');
    console.log(`Link Token: ${linkTokenResponse.data.link_token.substring(0, 50)}...`);
    console.log(`Expiration: ${linkTokenResponse.data.expiration}`);
    console.log('\n💡 This link token can be used to prompt the user to grant Liabilities consent');
    console.log('   The user would need to go through the Plaid Link flow again.');
    
  } catch (error: unknown) {
    const plaidError = error as { response?: { data?: { error_code?: string; error_message?: string } } };
    if (plaidError.response?.data) {
      console.error('\n❌ Error creating update mode link token:');
      console.error(`   Code: ${plaidError.response.data.error_code}`);
      console.error(`   Message: ${plaidError.response.data.error_message}`);
    } else {
      console.error('\n❌ Error:', error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log('- Existing items need user re-consent to access Liabilities');
  console.log('- Update mode can request additional product consent');
  console.log('- User must complete the Link flow to grant consent');
  console.log('='.repeat(60));
}

main().catch(console.error);
