import { SupabaseClient } from '@supabase/supabase-js';

interface MatchingRule {
  id: string;
  credit_id: string;
  pattern: string;
  match_amount_cents: number | null;
}

interface PlaidTransaction {
  id: string;
  user_id: string;
  linked_account_id: string | null;
  plaid_transaction_id: string;
  name: string;
  amount_cents: number;
  date: string;
  pending: boolean | null;
  category: string[] | null;
  merchant_name: string | null;
}

interface CardCredit {
  id: string;
  card_id: string;
  name: string;
  brand_name: string | null;
  reset_cycle: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'cardmember_year' | 'usage_based';
  reset_day_of_month: number | null;
  default_value_cents: number | null;
}

interface UserWallet {
  id: string;
  card_id: string;
  user_id: string;
  approval_date: string | null;
}

interface CreditUsage {
  id: string;
  user_wallet_id: string;
  credit_id: string;
  period_start: string;
  period_end: string;
  amount_used: number;
  auto_detected: boolean;
}

/**
 * Matches a transaction name against a pattern (case-insensitive contains match)
 */
export function matchesPattern(transactionName: string, pattern: string): boolean {
  return transactionName.toLowerCase().includes(pattern.toLowerCase());
}

/**
 * Matches a transaction against a rule (pattern + optional amount)
 */
export function matchesRule(
  transaction: { name: string; amount_cents: number },
  rule: MatchingRule
): boolean {
  // Check pattern match
  if (!matchesPattern(transaction.name, rule.pattern)) {
    return false;
  }

  // If rule has amount constraint, check it
  if (rule.match_amount_cents !== null) {
    return transaction.amount_cents === rule.match_amount_cents;
  }

  return true;
}

/**
 * Calculates the credit period (start and end dates) for a given date and reset cycle
 */
export function calculateCreditPeriod(
  transactionDate: Date,
  resetCycle: CardCredit['reset_cycle'],
  approvalDate?: Date | null,
  resetDayOfMonth?: number | null
): { periodStart: Date; periodEnd: Date } {
  const date = new Date(transactionDate);
  let periodStart: Date;
  let periodEnd: Date;

  switch (resetCycle) {
    case 'monthly': {
      const resetDay = resetDayOfMonth || 1;
      if (date.getDate() >= resetDay) {
        periodStart = new Date(date.getFullYear(), date.getMonth(), resetDay);
        periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, resetDay - 1);
      } else {
        periodStart = new Date(date.getFullYear(), date.getMonth() - 1, resetDay);
        periodEnd = new Date(date.getFullYear(), date.getMonth(), resetDay - 1);
      }
      break;
    }

    case 'quarterly': {
      const quarter = Math.floor(date.getMonth() / 3);
      periodStart = new Date(date.getFullYear(), quarter * 3, 1);
      periodEnd = new Date(date.getFullYear(), (quarter + 1) * 3, 0);
      break;
    }

    case 'semiannual': {
      const half = date.getMonth() < 6 ? 0 : 1;
      periodStart = new Date(date.getFullYear(), half * 6, 1);
      periodEnd = new Date(date.getFullYear(), (half + 1) * 6, 0);
      break;
    }

    case 'annual': {
      periodStart = new Date(date.getFullYear(), 0, 1);
      periodEnd = new Date(date.getFullYear(), 11, 31);
      break;
    }

    case 'cardmember_year': {
      if (approvalDate) {
        const approval = new Date(approvalDate);
        const approvalMonth = approval.getMonth();
        const approvalDay = approval.getDate();

        // Find the cardmember year that contains this transaction
        let yearStart = new Date(date.getFullYear(), approvalMonth, approvalDay);

        // If we're before this year's anniversary, the period started last year
        if (date < yearStart) {
          yearStart = new Date(date.getFullYear() - 1, approvalMonth, approvalDay);
        }

        periodStart = yearStart;
        periodEnd = new Date(yearStart.getFullYear() + 1, approvalMonth, approvalDay - 1);
      } else {
        // Fall back to calendar year if no approval date
        periodStart = new Date(date.getFullYear(), 0, 1);
        periodEnd = new Date(date.getFullYear(), 11, 31);
      }
      break;
    }

    case 'usage_based':
    default: {
      // For usage-based, each usage is its own period
      periodStart = date;
      periodEnd = date;
      break;
    }
  }

  return { periodStart, periodEnd };
}

/**
 * Formats a date as YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Main credit matching function - processes transactions and marks credits as used
 */
export async function matchTransactionsToCredits(
  supabase: SupabaseClient,
  userId: string,
  transactions: PlaidTransaction[]
): Promise<{
  matched: number;
  clawbacks: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let matched = 0;
  let clawbacks = 0;

  // Fetch all matching rules
  const { data: rules, error: rulesError } = await supabase
    .from('credit_matching_rules')
    .select('*');

  if (rulesError || !rules) {
    errors.push(`Failed to fetch matching rules: ${rulesError?.message}`);
    return { matched, clawbacks, errors };
  }

  // Fetch user's wallet cards with card details
  const { data: walletCards, error: walletError } = await supabase
    .from('user_wallets')
    .select(`
      id,
      card_id,
      user_id,
      approval_date,
      cards:card_id (
        id
      )
    `)
    .eq('user_id', userId);

  if (walletError) {
    errors.push(`Failed to fetch wallet cards: ${walletError.message}`);
    return { matched, clawbacks, errors };
  }

  // Fetch credits for user's cards
  const cardIds = walletCards?.map(wc => wc.card_id) || [];
  const { data: credits, error: creditsError } = await supabase
    .from('card_credits')
    .select('*')
    .in('card_id', cardIds.length > 0 ? cardIds : ['none'])
    .eq('is_active', true);

  if (creditsError) {
    errors.push(`Failed to fetch credits: ${creditsError.message}`);
    return { matched, clawbacks, errors };
  }

  // Create lookup maps
  const creditById = new Map<string, CardCredit>();
  credits?.forEach(c => creditById.set(c.id, c));

  const walletByCardId = new Map<string, UserWallet>();
  walletCards?.forEach(w => walletByCardId.set(w.card_id, w as unknown as UserWallet));

  // Process each transaction
  for (const txn of transactions) {
    // Skip pending transactions
    if (txn.pending) continue;

    // Find matching rule
    const matchingRule = rules.find(rule => matchesRule(txn, rule));

    if (!matchingRule) continue;

    const credit = creditById.get(matchingRule.credit_id);
    if (!credit) continue;

    const wallet = walletByCardId.get(credit.card_id);
    if (!wallet) continue;

    // Determine if this is a credit or clawback
    const isClawback = txn.amount_cents > 0;

    // Calculate the period for this transaction
    const { periodStart, periodEnd } = calculateCreditPeriod(
      new Date(txn.date),
      credit.reset_cycle,
      wallet.approval_date ? new Date(wallet.approval_date) : null,
      credit.reset_day_of_month
    );

    try {
      // Update transaction with matched credit info
      await supabase
        .from('user_plaid_transactions')
        .update({
          matched_credit_id: credit.id,
          matched_rule_id: matchingRule.id,
          is_clawback: isClawback,
        })
        .eq('id', txn.id);

      if (isClawback) {
        // For clawbacks, we need to find and update the original usage record
        // or create a negative adjustment
        clawbacks++;
      } else {
        // For credits (negative amounts), find or create usage record for this period
        const periodStartStr = formatDateString(periodStart);
        const periodEndStr = formatDateString(periodEnd);

        // Check if usage record exists for this period
        const { data: existingUsage } = await supabase
          .from('user_credit_usage')
          .select('id, amount_used')
          .eq('user_wallet_id', wallet.id)
          .eq('credit_id', credit.id)
          .eq('period_start', periodStartStr)
          .single();

        let usageId: string;
        const absoluteAmount = Math.abs(txn.amount_cents);

        if (existingUsage) {
          // Update existing usage record
          const newAmount = existingUsage.amount_used + absoluteAmount / 100;
          await supabase
            .from('user_credit_usage')
            .update({ amount_used: newAmount })
            .eq('id', existingUsage.id);
          usageId = existingUsage.id;
        } else {
          // Create new usage record
          const { data: newUsage, error: insertError } = await supabase
            .from('user_credit_usage')
            .insert({
              user_wallet_id: wallet.id,
              credit_id: credit.id,
              period_start: periodStartStr,
              period_end: periodEndStr,
              amount_used: absoluteAmount / 100,
              auto_detected: true,
              used_at: txn.date,
            })
            .select('id')
            .single();

          if (insertError || !newUsage) {
            errors.push(`Failed to create usage record: ${insertError?.message}`);
            continue;
          }
          usageId = newUsage.id;
        }

        // Link transaction to usage record
        await supabase
          .from('user_credit_usage_transactions')
          .upsert({
            usage_id: usageId,
            transaction_id: txn.id,
            amount_cents: absoluteAmount,
          }, {
            onConflict: 'usage_id,transaction_id',
          });

        matched++;
      }
    } catch (err) {
      errors.push(`Error processing transaction ${txn.id}: ${err}`);
    }
  }

  return { matched, clawbacks, errors };
}

/**
 * Gets all brand names from card_credits for filtering potential credit transactions
 */
export async function getCreditBrandNames(supabase: SupabaseClient): Promise<string[]> {
  const { data: credits } = await supabase
    .from('card_credits')
    .select('brand_name, name')
    .eq('is_active', true);

  const brands = new Set<string>();

  credits?.forEach(c => {
    if (c.brand_name) {
      brands.add(c.brand_name.toLowerCase());
    }
    // Also add credit name words that might appear in transactions
    const words = c.name.split(/\s+/);
    words.forEach((word: string) => {
      if (word.length > 3) { // Skip short words
        brands.add(word.toLowerCase());
      }
    });
  });

  return Array.from(brands);
}

/**
 * Checks if a transaction looks like a potential credit based on amount, name, and brand matches
 */
export function isPotentialCreditTransaction(
  transaction: { name: string; amount_cents: number },
  brandNames: string[]
): boolean {
  // Must be a credit (negative amount)
  if (transaction.amount_cents >= 0) return false;

  const nameLower = transaction.name.toLowerCase();

  // Check if name contains "credit"
  if (nameLower.includes('credit')) return true;

  // Check if name matches any brand
  for (const brand of brandNames) {
    if (nameLower.includes(brand)) return true;
  }

  return false;
}

