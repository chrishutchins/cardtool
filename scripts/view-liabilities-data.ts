/**
 * View liabilities data for all items with consent
 * 
 * Usage:
 *   npx tsx scripts/view-liabilities-data.ts
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env.local') });

import { Configuration, PlaidApi, PlaidEnvironments, Products } from 'plaid';
import { createClient } from '@supabase/supabase-js';

const plaidConfig = new Configuration({
  basePath: process.env.PLAID_ENV === 'production' 
    ? PlaidEnvironments.production 
    : process.env.PLAID_ENV === 'development'
    ? PlaidEnvironments.development
    : PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LiabilityResult {
  institution: string;
  accountName: string;
  cardType: 'personal' | 'business';
  mask: string | null;
  currentBalance: number | null;
  creditLimit: number | null;
  // Liabilities data
  lastStatementBalance: number | null;
  lastStatementIssueDate: string | null;
  nextPaymentDueDate: string | null;
  minimumPayment: number | null;
  isOverdue: boolean | null;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
}

async function main() {
  console.log('='.repeat(100));
  console.log('LIABILITIES DATA REPORT');
  console.log('='.repeat(100));
  console.log('');

  // Fetch all plaid items
  const { data: plaidItems } = await supabase
    .from('user_plaid_items')
    .select('id, access_token, institution_name')
    .order('institution_name');

  if (!plaidItems || plaidItems.length === 0) {
    console.log('No Plaid items found');
    return;
  }

  const results: LiabilityResult[] = [];
  const noDataInstitutions: string[] = [];

  for (const item of plaidItems) {
    try {
      // Check if has liabilities consent
      const itemResponse = await plaidClient.itemGet({
        access_token: item.access_token,
      });
      
      const hasConsent = itemResponse.data.item.consented_products?.includes(Products.Liabilities);
      
      if (!hasConsent) {
        continue; // Skip items without consent
      }

      // Get accounts
      const accountsResponse = await plaidClient.accountsGet({
        access_token: item.access_token,
      });

      // Get liabilities
      const liabilitiesResponse = await plaidClient.liabilitiesGet({
        access_token: item.access_token,
      });

      const creditAccounts = accountsResponse.data.accounts.filter(
        a => a.type === 'credit' || a.subtype === 'credit card'
      );

      const creditLiabilities = liabilitiesResponse.data.liabilities.credit || [];

      if (creditLiabilities.length === 0 && creditAccounts.length > 0) {
        noDataInstitutions.push(item.institution_name || 'Unknown');
      }

      for (const account of creditAccounts) {
        const liability = creditLiabilities.find(l => l.account_id === account.account_id);
        const isPersonal = !account.name.toLowerCase().includes('business') && 
                          !account.name.toLowerCase().includes('biz');

        results.push({
          institution: item.institution_name || 'Unknown',
          accountName: account.name,
          cardType: isPersonal ? 'personal' : 'business',
          mask: account.mask,
          currentBalance: account.balances.current,
          creditLimit: account.balances.limit,
          lastStatementBalance: liability?.last_statement_balance ?? null,
          lastStatementIssueDate: liability?.last_statement_issue_date ?? null,
          nextPaymentDueDate: liability?.next_payment_due_date ?? null,
          minimumPayment: liability?.minimum_payment_amount ?? null,
          isOverdue: liability?.is_overdue ?? null,
          lastPaymentAmount: liability?.last_payment_amount ?? null,
          lastPaymentDate: liability?.last_payment_date ?? null,
        });
      }
    } catch (error: unknown) {
      const plaidError = error as { response?: { data?: { error_code?: string } } };
      if (plaidError.response?.data?.error_code !== 'ADDITIONAL_CONSENT_REQUIRED') {
        console.log(`Error for ${item.institution_name}: ${plaidError.response?.data?.error_code || 'Unknown'}`);
      }
    }
  }

  // Group by institution
  const byInstitution = results.reduce((acc, r) => {
    if (!acc[r.institution]) acc[r.institution] = [];
    acc[r.institution].push(r);
    return acc;
  }, {} as Record<string, LiabilityResult[]>);

  // Summary stats
  let totalWithStatementBalance = 0;
  let totalWithDueDate = 0;
  let totalWithStatementDate = 0;
  let totalAccounts = results.length;

  // Print results by institution
  for (const [institution, accounts] of Object.entries(byInstitution).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log('');
    console.log('-'.repeat(100));
    console.log(`📦 ${institution} (${accounts.length} accounts)`);
    console.log('-'.repeat(100));

    // Table header
    console.log('');
    console.log(
      'Type'.padEnd(5) +
      'Card Name'.padEnd(35) +
      'Balance'.padStart(12) +
      'Stmt Bal'.padStart(12) +
      'Stmt Date'.padStart(12) +
      'Due Date'.padStart(12) +
      'Min Pay'.padStart(10)
    );
    console.log('-'.repeat(98));

    for (const acc of accounts) {
      const type = acc.cardType === 'business' ? 'Biz' : 'Per';
      const name = (acc.accountName + (acc.mask ? ` (${acc.mask})` : '')).substring(0, 33);
      const balance = acc.currentBalance !== null ? `$${acc.currentBalance.toLocaleString()}` : 'N/A';
      const stmtBal = acc.lastStatementBalance !== null ? `$${acc.lastStatementBalance.toLocaleString()}` : '❌';
      const stmtDate = acc.lastStatementIssueDate || '❌';
      const dueDate = acc.nextPaymentDueDate || '❌';
      const minPay = acc.minimumPayment !== null ? `$${acc.minimumPayment}` : '❌';

      if (acc.lastStatementBalance !== null) totalWithStatementBalance++;
      if (acc.nextPaymentDueDate) totalWithDueDate++;
      if (acc.lastStatementIssueDate) totalWithStatementDate++;

      console.log(
        type.padEnd(5) +
        name.padEnd(35) +
        balance.padStart(12) +
        stmtBal.padStart(12) +
        stmtDate.padStart(12) +
        dueDate.padStart(12) +
        minPay.padStart(10)
      );
    }
  }

  // Summary
  console.log('');
  console.log('='.repeat(100));
  console.log('SUMMARY');
  console.log('='.repeat(100));
  console.log(`Total accounts with consent: ${totalAccounts}`);
  console.log(`Accounts with Statement Balance: ${totalWithStatementBalance} (${Math.round(totalWithStatementBalance/totalAccounts*100)}%)`);
  console.log(`Accounts with Statement Date: ${totalWithStatementDate} (${Math.round(totalWithStatementDate/totalAccounts*100)}%)`);
  console.log(`Accounts with Due Date: ${totalWithDueDate} (${Math.round(totalWithDueDate/totalAccounts*100)}%)`);
  
  if (noDataInstitutions.length > 0) {
    console.log('');
    console.log('⚠️  Institutions with consent but NO liabilities data returned:');
    const unique = [...new Set(noDataInstitutions)];
    for (const inst of unique) {
      console.log(`   - ${inst}`);
    }
  }

  console.log('');
}

main().catch(console.error);
