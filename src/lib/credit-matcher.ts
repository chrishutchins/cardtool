import { SupabaseClient } from '@supabase/supabase-js';
import { parseLocalDate } from './utils';
import logger from './logger';

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
  original_description: string | null;
  amount_cents: number;
  date: string;
  authorized_date?: string | null;
  pending: boolean | null;
  category: string[] | null;
  merchant_name: string | null;
}

interface LinkedAccount {
  id: string;
  wallet_card_id: string | null;
}

interface CardCredit {
  id: string;
  card_id: string;
  name: string;
  brand_name: string | null;
  reset_cycle: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'cardmember_year' | 'usage_based';
  reset_day_of_month: number | null;
  default_value_cents: number | null;
  credit_count: number;
  cards?: {
    id: string;
    issuer_id: string | null;
  };
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
  slot_number: number;
}

/**
 * Matches a transaction name against a pattern (case-insensitive)
 * Returns true if the pattern is found anywhere in the text (contains match)
 */
export function matchesPattern(text: string, pattern: string): boolean {
  return text.toLowerCase().includes(pattern.toLowerCase());
}

/**
 * Gets the best description for a transaction (original_description if available, otherwise name)
 */
export function getTransactionDescription(transaction: { name: string; original_description?: string | null }): string {
  return transaction.original_description || transaction.name;
}

/**
 * Matches a transaction against a rule (pattern + optional amount)
 * Prefers original_description for matching (falls back to name if null)
 */
export function matchesRule(
  transaction: { name: string; original_description?: string | null; amount_cents: number },
  rule: MatchingRule
): boolean {
  // Prefer original_description for matching (it has the real bank text)
  // Fall back to normalized name if original_description is not available
  const textToMatch = getTransactionDescription(transaction);
  
  if (!matchesPattern(textToMatch, rule.pattern)) {
    return false;
  }

  // If rule has amount constraint, check it
  if (rule.match_amount_cents !== null) {
    return transaction.amount_cents === rule.match_amount_cents;
  }

  return true;
}

/**
 * Calculates the credit period (start and end dates) for a given date and reset cycle.
 * Accepts either a Date object or a date string (YYYY-MM-DD).
 */
export function calculateCreditPeriod(
  transactionDate: Date | string,
  resetCycle: CardCredit['reset_cycle'],
  approvalDate?: Date | string | null,
  resetDayOfMonth?: number | null
): { periodStart: Date; periodEnd: Date } {
  // Handle both Date objects and strings - use parseLocalDate for strings to avoid timezone issues
  const date = typeof transactionDate === 'string' ? parseLocalDate(transactionDate) : new Date(transactionDate);
  const approval = approvalDate 
    ? (typeof approvalDate === 'string' ? parseLocalDate(approvalDate) : new Date(approvalDate))
    : null;
  
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
      if (approval) {
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
 * Finds the next available slot for a multi-use credit in a given period
 */
async function findAvailableSlot(
  supabase: SupabaseClient,
  walletId: string,
  creditId: string,
  periodStart: string,
  creditCount: number
): Promise<number | null> {
  // Get all used slots for this credit in this period
  const { data: usages } = await supabase
    .from('user_credit_usage')
    .select('slot_number')
    .eq('user_wallet_id', walletId)
    .eq('credit_id', creditId)
    .eq('period_start', periodStart);

  const usedSlots = new Set(usages?.map(u => u.slot_number) || []);

  // Find the first available slot
  for (let slot = 1; slot <= creditCount; slot++) {
    if (!usedSlots.has(slot)) {
      return slot;
    }
  }

  return null; // All slots are used
}

/**
 * Finds a matching credit for a transaction based on:
 * 1. The wallet the transaction actually came from (via linked_account)
 * 2. The rule's credit name and issuer (allowing matching across cards from same issuer)
 * 
 * This ensures transactions are ONLY matched to credits on the card they were made on.
 */
function findCreditForTransaction(
  rule: MatchingRule,
  transactionWallet: UserWallet | undefined,
  creditById: Map<string, CardCredit>,
  creditsByCardId: Map<string, CardCredit[]>
): CardCredit | null {
  if (!transactionWallet) return null;
  
  const ruleCredit = creditById.get(rule.credit_id);
  if (!ruleCredit) return null;

  // Get the issuer of the rule's credit
  const issuerId = ruleCredit.cards?.issuer_id;

  // Find a credit on the TRANSACTION'S wallet that matches the rule's credit name and issuer
  const creditsOnTransactionCard = creditsByCardId.get(transactionWallet.card_id) || [];
  
  for (const credit of creditsOnTransactionCard) {
    if (
      credit.name === ruleCredit.name &&
      credit.cards?.issuer_id === issuerId
    ) {
      return credit;
    }
  }

  return null;
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

  // Fetch user's active wallet cards with card details (closed cards don't have linked accounts)
  const { data: walletCards, error: walletError } = await supabase
    .from('user_wallets')
    .select(`
      id,
      card_id,
      user_id,
      approval_date,
      cards:card_id (
        id,
        issuer_id
      )
    `)
    .eq('user_id', userId)
    .is('closed_date', null);

  if (walletError) {
    errors.push(`Failed to fetch wallet cards: ${walletError.message}`);
    return { matched, clawbacks, errors };
  }

  // Fetch user's linked accounts to map linked_account_id -> wallet_id
  const { data: linkedAccounts, error: linkedError } = await supabase
    .from('user_linked_accounts')
    .select('id, wallet_card_id')
    .eq('user_id', userId);

  if (linkedError) {
    errors.push(`Failed to fetch linked accounts: ${linkedError.message}`);
    return { matched, clawbacks, errors };
  }

  // Build map: linked_account_id -> wallet_id
  const walletByLinkedAccountId = new Map<string, string>();
  linkedAccounts?.forEach(la => {
    if (la.wallet_card_id) {
      walletByLinkedAccountId.set(la.id, la.wallet_card_id);
    }
  });

  // Fetch credits for user's cards (with issuer info via cards)
  const cardIds = walletCards?.map(wc => wc.card_id) || [];
  const { data: credits, error: creditsError } = await supabase
    .from('card_credits')
    .select(`
      *,
      cards:card_id (
        id,
        issuer_id
      )
    `)
    .in('card_id', cardIds.length > 0 ? cardIds : ['none'])
    .eq('is_active', true);

  if (creditsError) {
    errors.push(`Failed to fetch credits: ${creditsError.message}`);
    return { matched, clawbacks, errors };
  }

  // Also fetch all credits for rule matching (rules may reference credits on cards user doesn't have)
  const { data: allCreditsForRules, error: allCreditsError } = await supabase
    .from('card_credits')
    .select(`
      *,
      cards:card_id (
        id,
        issuer_id
      )
    `)
    .eq('is_active', true);

  if (allCreditsError) {
    errors.push(`Failed to fetch all credits for rules: ${allCreditsError.message}`);
    return { matched, clawbacks, errors };
  }

  // Create lookup maps
  const creditById = new Map<string, CardCredit>();
  allCreditsForRules?.forEach(c => creditById.set(c.id, c as CardCredit));

  // Map: card_id -> credits on that card
  const creditsByCardId = new Map<string, CardCredit[]>();
  credits?.forEach(c => {
    const existing = creditsByCardId.get(c.card_id) || [];
    existing.push(c as CardCredit);
    creditsByCardId.set(c.card_id, existing);
  });

  // Map: wallet_id -> wallet
  const walletById = new Map<string, UserWallet>();
  walletCards?.forEach(w => walletById.set(w.id, w as unknown as UserWallet));

  // Debug: Log matcher state
  logger.info({
    transactionCount: transactions.length,
    rulesCount: rules.length,
    walletsCount: walletById.size,
    linkedAccountsCount: walletByLinkedAccountId.size,
    creditsByCardIdKeys: Array.from(creditsByCardId.keys()),
    walletByIdKeys: Array.from(walletById.keys()).slice(0, 10),
    walletByLinkedAccountIdEntries: Array.from(walletByLinkedAccountId.entries()).slice(0, 10),
  }, '[credit-matcher] Starting match');

  // Process each transaction
  for (const txn of transactions) {
    // Skip pending transactions
    if (txn.pending) {
      continue;
    }

    // Skip transactions without a linked account
    if (!txn.linked_account_id) {
      logger.warn({ txnId: txn.id }, '[credit-matcher] Skipping - no linked_account_id');
      continue;
    }

    // Find the wallet this transaction belongs to
    const walletId = walletByLinkedAccountId.get(txn.linked_account_id);
    if (!walletId) {
      logger.warn({ 
        txnId: txn.id, 
        linkedAccountId: txn.linked_account_id,
        availableLinkedAccounts: Array.from(walletByLinkedAccountId.keys()).slice(0, 5)
      }, '[credit-matcher] Skipping - linked_account_id not in map');
      continue;
    }
    
    const wallet = walletById.get(walletId);
    if (!wallet) {
      logger.warn({ 
        txnId: txn.id, 
        walletId,
        availableWallets: Array.from(walletById.keys()).slice(0, 5)
      }, '[credit-matcher] Skipping - walletId not in walletById');
      continue;
    }

    // Debug: Log wallet structure to find card_id issue
    logger.info({
      txnId: txn.id,
      walletId: wallet.id,
      walletCardId: wallet.card_id,
      walletKeys: Object.keys(wallet),
      walletRaw: JSON.stringify(wallet).slice(0, 500),
    }, '[credit-matcher] Wallet object structure');

    // Find matching rule
    const matchingRule = rules.find(rule => matchesRule(txn, rule));

    if (!matchingRule) {
      continue;
    }

    // Find the credit on this transaction's wallet that matches the rule
    const credit = findCreditForTransaction(matchingRule, wallet, creditById, creditsByCardId);
    if (!credit) {
      const ruleCredit = creditById.get(matchingRule.credit_id);
      const creditsOnCard = creditsByCardId.get(wallet.card_id);
      logger.warn({ 
        txnId: txn.id,
        txnName: txn.name,
        walletCardId: wallet.card_id,
        ruleCreditName: ruleCredit?.name,
        ruleCreditIssuerId: ruleCredit?.cards?.issuer_id,
        creditsOnCard: creditsOnCard?.map(c => ({ name: c.name, issuerId: c.cards?.issuer_id })),
      }, '[credit-matcher] Skipping - no credit found on wallet card');
      continue;
    }

    // Determine if this is a credit or clawback
    const isClawback = txn.amount_cents > 0;

    // Use authorized_date when available (the date the user actually made the transaction)
    // Fall back to date (posted date) if authorized_date is not available
    const effectiveDate = txn.authorized_date || txn.date;

    // Calculate the period for this transaction
    // Pass date strings directly so parseLocalDate handles timezone correctly
    const { periodStart, periodEnd } = calculateCreditPeriod(
      effectiveDate,
      credit.reset_cycle,
      wallet.approval_date,
      credit.reset_day_of_month
    );

    const periodStartStr = formatDateString(periodStart);
    const periodEndStr = formatDateString(periodEnd);

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
        // Check if this clawback transaction is already linked
        const { data: existingClawbackLink } = await supabase
          .from('user_credit_usage_transactions')
          .select('id')
          .eq('transaction_id', txn.id)
          .maybeSingle();

        if (existingClawbackLink) {
          // Clawback already processed - skip to avoid double-deduction
          clawbacks++;
          continue;
        }

        // For clawbacks, find the usage record in this period and reduce the amount
        // Find existing usage record for this period
        const { data: existingUsage } = await supabase
          .from('user_credit_usage')
          .select('id, amount_used')
          .eq('user_wallet_id', wallet.id)
          .eq('credit_id', credit.id)
          .eq('period_start', periodStartStr)
          .order('slot_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingUsage) {
          // Reduce the usage amount by the clawback (positive amount = debit = reduction)
          const clawbackAmount = txn.amount_cents / 100;
          const newAmount = Math.max(0, existingUsage.amount_used - clawbackAmount);
          
          await supabase
            .from('user_credit_usage')
            .update({ amount_used: newAmount })
            .eq('id', existingUsage.id);

          // Link clawback transaction to usage record
          await supabase
            .from('user_credit_usage_transactions')
            .upsert({
              usage_id: existingUsage.id,
              transaction_id: txn.id,
              amount_cents: -txn.amount_cents, // Store as negative to indicate clawback
            }, {
              onConflict: 'usage_id,transaction_id',
            });
        } else {
          // No existing usage to adjust - create a clawback record for tracking
          const { data: clawbackUsage, error: insertError } = await supabase
            .from('user_credit_usage')
            .insert({
              user_wallet_id: wallet.id,
              credit_id: credit.id,
              period_start: periodStartStr,
              period_end: periodEndStr,
              amount_used: 0, // Clawback with no prior usage
              auto_detected: true,
              is_clawback: true,
              used_at: effectiveDate,
              slot_number: 1,
            })
            .select('id')
            .single();

          if (!insertError && clawbackUsage) {
            await supabase
              .from('user_credit_usage_transactions')
              .upsert({
                usage_id: clawbackUsage.id,
                transaction_id: txn.id,
                amount_cents: -txn.amount_cents,
              }, {
                onConflict: 'usage_id,transaction_id',
              });
          }
        }
        
        clawbacks++;
      } else {
        // For credits (negative amounts), find or create usage record for this period
        const absoluteAmount = Math.abs(txn.amount_cents);
        const creditCount = credit.credit_count || 1;

        // Check if this transaction is already linked to a usage record
        // This prevents double-counting if rematch runs multiple times
        const { data: existingLink } = await supabase
          .from('user_credit_usage_transactions')
          .select('id')
          .eq('transaction_id', txn.id)
          .maybeSingle();

        if (existingLink) {
          // Transaction already linked - skip to avoid double-counting
          matched++;
          continue;
        }

        // Check if usage record exists for this period (for any slot)
        const { data: existingUsages } = await supabase
          .from('user_credit_usage')
          .select('id, amount_used, slot_number')
          .eq('user_wallet_id', wallet.id)
          .eq('credit_id', credit.id)
          .eq('period_start', periodStartStr)
          .order('slot_number', { ascending: true });

        let usageId: string;

        if (existingUsages && existingUsages.length > 0) {
          // Find an existing slot that isn't full, or use the first one
          const creditValue = credit.default_value_cents || 0;
          const targetUsage = existingUsages.find(u => 
            creditValue === 0 || u.amount_used * 100 < creditValue
          );

          if (!targetUsage && existingUsages.length < creditCount) {
            // All existing slots are full but we have more slots available
            // Find the first available slot number (handles gaps from deleted usage records)
            const usedSlots = new Set(existingUsages.map(u => u.slot_number ?? 1));
            let nextSlot = 1;
            while (usedSlots.has(nextSlot) && nextSlot <= creditCount) {
              nextSlot++;
            }
            const { data: newUsage, error: insertError } = await supabase
              .from('user_credit_usage')
              .insert({
                user_wallet_id: wallet.id,
                credit_id: credit.id,
                period_start: periodStartStr,
                period_end: periodEndStr,
                amount_used: absoluteAmount / 100,
                auto_detected: true,
                used_at: effectiveDate,
                slot_number: nextSlot,
              })
              .select('id')
              .single();

            if (insertError || !newUsage) {
              errors.push(`Failed to create usage record: ${insertError?.message}`);
              continue;
            }
            usageId = newUsage.id;
          } else if (targetUsage) {
            // Update existing usage record
            const newAmount = targetUsage.amount_used + absoluteAmount / 100;
            await supabase
              .from('user_credit_usage')
              .update({ amount_used: newAmount })
              .eq('id', targetUsage.id);
            usageId = targetUsage.id;
          } else {
            // All slots are full, add to first slot anyway
            const firstUsage = existingUsages[0];
            const newAmount = firstUsage.amount_used + absoluteAmount / 100;
            await supabase
              .from('user_credit_usage')
              .update({ amount_used: newAmount })
              .eq('id', firstUsage.id);
            usageId = firstUsage.id;
          }
        } else {
          // Create new usage record for slot 1
          const { data: newUsage, error: insertError } = await supabase
            .from('user_credit_usage')
            .insert({
              user_wallet_id: wallet.id,
              credit_id: credit.id,
              period_start: periodStartStr,
              period_end: periodEndStr,
              amount_used: absoluteAmount / 100,
              auto_detected: true,
              used_at: effectiveDate,
              slot_number: 1,
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
  transaction: { name: string; original_description?: string | null; amount_cents: number },
  brandNames: string[]
): boolean {
  // Must be a credit (negative amount)
  if (transaction.amount_cents >= 0) return false;

  // Use original_description when available for more accurate matching
  const description = getTransactionDescription(transaction).toLowerCase();

  // Check if description contains "credit"
  if (description.includes('credit')) return true;

  // Check if description matches any brand
  for (const brand of brandNames) {
    if (description.includes(brand)) return true;
  }

  return false;
}
