/**
 * Account Matching Utilities
 *
 * Matches credit accounts across bureaus using multiple signals since:
 * - Creditor names vary: "AMEX" vs "AMERICAN EXPRESS"
 * - Account numbers formatted differently: "xxxx 1234" vs "414709XXXXXX" vs "414709786075****"
 * - Only date_opened, credit_limit, and balance are reliable cross-bureau
 */

type CreditBureau = "equifax" | "experian" | "transunion";

export interface CreditAccount {
  id: string;
  bureau: CreditBureau;
  account_name: string;
  account_number_masked: string | null;
  creditor_name: string | null;
  status: string;
  date_opened: string | null;
  date_updated: string | null;
  date_closed: string | null;
  credit_limit_cents: number | null;
  high_balance_cents: number | null;
  balance_cents: number | null;
  monthly_payment_cents: number | null;
  account_type: string;
  loan_type: string;
  responsibility: string;
  terms: string | null;
  payment_status: string | null;
}

export interface AccountGroup {
  id: string; // Unique group ID
  displayName: string;
  loanType: string;
  status: string;
  dateOpened: string | null;
  accounts: CreditAccount[]; // All accounts in this group
  byBureau: Map<CreditBureau, CreditAccount[]>; // Accounts by bureau (may have dupes within bureau)
}

// Canonical creditor name mappings
// Key: lowercase normalized name -> canonical name
const CREDITOR_ALIASES: Record<string, string> = {
  // American Express variations
  amex: "american express",
  "american express": "american express",

  // Chase variations
  "jpmcb card": "chase",
  "jpmcb card services": "chase",
  chase: "chase",
  "chase bank": "chase",

  // Capital One variations
  "capital one": "capital one",
  "capital one bank usa na": "capital one",
  "capital one bank": "capital one",

  // Bank of America variations
  "bank of america": "bank of america",
  "bank of america na": "bank of america",
  bofa: "bank of america",

  // Wells Fargo variations
  "wells fargo": "wells fargo",
  "wells fargo bank na": "wells fargo",
  wfbna: "wells fargo",
  "wf card services": "wells fargo",

  // Citi variations
  "citicards cbna": "citi",
  citibank: "citi",
  "citi cards": "citi",
  citi: "citi",

  // Credit Union One
  "credit union 1": "credit union one",
  "credit union one": "credit union one",

  // BlockFi variations
  blockfi: "blockfi",
  "deserve/blockfi": "blockfi",
  "deserve/blockfi/evolve": "blockfi",

  // Discover
  discover: "discover",
  "discover bank": "discover",
  "discover financial": "discover",

  // US Bank
  "us bank": "us bank",
  "us bank na": "us bank",
  "u.s. bank": "us bank",
  "usb card services": "us bank",

  // Barclays
  barclays: "barclays",
  "barclays bank delaware": "barclays",
  "barclaycard us": "barclays",

  // Synchrony
  synchrony: "synchrony",
  "synchrony bank": "synchrony",
  "synchrony financial": "synchrony",

  // TD
  "td bank": "td bank",
  "td auto finance": "td bank",
  "td bank usa": "td bank",
};

/**
 * Normalize creditor name to canonical form
 */
function normalizeCreditorName(name: string | null): string {
  if (!name) return "";
  const cleaned = name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

  // Check for exact alias match
  if (CREDITOR_ALIASES[cleaned]) {
    return CREDITOR_ALIASES[cleaned];
  }

  // Check if any alias is contained in the name
  for (const [alias, canonical] of Object.entries(CREDITOR_ALIASES)) {
    if (cleaned.includes(alias) || alias.includes(cleaned)) {
      return canonical;
    }
  }

  return cleaned;
}

/**
 * Extract last 4 digits from various masked number formats
 * Handles:
 * - "xxxxxxxxxxxx 1234" -> "1234"
 * - "414709XXXXXX" -> null (no last 4)
 * - "414709786075****" -> "6075"
 * - "XXXX" -> null
 */
function extractLast4(masked: string | null): string | null {
  if (!masked) return null;

  // Pattern 1: "xxxx 1234" or "xxxx1234" at end
  const endMatch = masked.match(/(\d{4})\s*$/);
  if (endMatch) return endMatch[1];

  // Pattern 2: "123456789012****" - digits before asterisks
  const beforeAsterisks = masked.match(/(\d{4})\*+$/);
  if (beforeAsterisks) return beforeAsterisks[1];

  // Pattern 3: Just 4 digits at the end of any format
  const anyDigits = masked.match(/(\d{4})(?:\D*)$/);
  if (anyDigits) return anyDigits[1];

  return null;
}

/**
 * Extract first 6 digits (BIN) from various masked number formats
 * Handles:
 * - "414709XXXXXX" -> "414709"
 * - "414709786075****" -> "414709"
 */
function extractFirst6(masked: string | null): string | null {
  if (!masked) return null;

  const match = masked.match(/^(\d{6})/);
  return match ? match[1] : null;
}

/**
 * Calculate match score between two accounts
 * Higher score = more likely same account
 */
function calculateMatchScore(a: CreditAccount, b: CreditAccount): number {
  // Different bureaus required (we're matching across bureaus)
  if (a.bureau === b.bureau) return 0;

  let score = 0;

  // Same date_opened is strongest signal (+50)
  if (a.date_opened && b.date_opened && a.date_opened === b.date_opened) {
    score += 50;
  }

  // Same credit_limit when both have values (+30)
  if (
    a.credit_limit_cents &&
    b.credit_limit_cents &&
    a.credit_limit_cents === b.credit_limit_cents
  ) {
    score += 30;
  }

  // Same balance within 1% (+20)
  if (a.balance_cents && b.balance_cents) {
    const diff = Math.abs(a.balance_cents - b.balance_cents);
    const avg = (a.balance_cents + b.balance_cents) / 2;
    if (diff / avg < 0.01) {
      score += 20;
    }
  }

  // Normalized creditor name match (+15)
  const normA = normalizeCreditorName(a.creditor_name ?? a.account_name);
  const normB = normalizeCreditorName(b.creditor_name ?? b.account_name);
  if (normA && normB && normA === normB) {
    score += 15;
  }

  // Last 4 digits match (+25)
  const last4A = extractLast4(a.account_number_masked);
  const last4B = extractLast4(b.account_number_masked);
  if (last4A && last4B && last4A === last4B) {
    score += 25;
  }

  // First 6 digits (BIN) match (+20)
  const first6A = extractFirst6(a.account_number_masked);
  const first6B = extractFirst6(b.account_number_masked);
  if (first6A && first6B && first6A === first6B) {
    score += 20;
  }

  // Same loan type bonus (+5)
  if (a.loan_type === b.loan_type) {
    score += 5;
  }

  // Same status bonus (+5)
  if (a.status === b.status) {
    score += 5;
  }

  return score;
}

/**
 * Deduplicate accounts within the same bureau
 * Groups by: bureau + creditor_name + last4/masked + date_opened
 */
function dedupeWithinBureau(accounts: CreditAccount[]): CreditAccount[] {
  const seen = new Map<string, CreditAccount>();

  for (const account of accounts) {
    const creditor = normalizeCreditorName(account.creditor_name ?? account.account_name);
    const last4 = extractLast4(account.account_number_masked) ?? account.account_number_masked ?? "";
    const dateOpened = account.date_opened ?? "";

    const key = `${account.bureau}|${creditor}|${last4}|${dateOpened}`;

    // Keep the one with more data (has credit_limit or balance)
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, account);
    } else {
      const existingScore =
        (existing.credit_limit_cents ? 1 : 0) +
        (existing.balance_cents ? 1 : 0) +
        (existing.date_updated ? 1 : 0);
      const newScore =
        (account.credit_limit_cents ? 1 : 0) +
        (account.balance_cents ? 1 : 0) +
        (account.date_updated ? 1 : 0);
      if (newScore > existingScore) {
        seen.set(key, account);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Group accounts across bureaus using match scoring
 * Returns groups of accounts that represent the same underlying account
 */
export function groupAccountsAcrossBureaus(accounts: CreditAccount[]): AccountGroup[] {
  // Step 1: Dedupe within each bureau
  const deduped = dedupeWithinBureau(accounts);

  // Step 2: Build groups using Union-Find with scoring
  const groups: AccountGroup[] = [];
  const accountToGroup = new Map<string, AccountGroup>();

  // Sort by date_opened to process oldest first (more stable)
  const sorted = [...deduped].sort((a, b) => {
    const dateA = a.date_opened ?? "9999";
    const dateB = b.date_opened ?? "9999";
    return dateA.localeCompare(dateB);
  });

  for (const account of sorted) {
    let bestGroup: AccountGroup | null = null;
    let bestScore = 0;

    // Find best matching existing group
    for (const group of groups) {
      // Check match score against all accounts in group
      for (const groupAccount of group.accounts) {
        const score = calculateMatchScore(account, groupAccount);
        if (score > bestScore && score >= 50) {
          // Threshold: need at least 50 points
          bestScore = score;
          bestGroup = group;
        }
      }
    }

    if (bestGroup) {
      // Add to existing group
      bestGroup.accounts.push(account);
      if (!bestGroup.byBureau.has(account.bureau)) {
        bestGroup.byBureau.set(account.bureau, []);
      }
      bestGroup.byBureau.get(account.bureau)!.push(account);
      accountToGroup.set(account.id, bestGroup);

      // Update display name if this account has better info
      if (
        account.creditor_name &&
        !bestGroup.displayName.includes(account.creditor_name)
      ) {
        // Prefer longer, more descriptive names
        if (account.creditor_name.length > bestGroup.displayName.length) {
          bestGroup.displayName = account.creditor_name;
        }
      }
    } else {
      // Create new group
      const newGroup: AccountGroup = {
        id: account.id, // Use first account's ID as group ID
        displayName: account.creditor_name ?? account.account_name,
        loanType: account.loan_type,
        status: account.status,
        dateOpened: account.date_opened,
        accounts: [account],
        byBureau: new Map([[account.bureau, [account]]]),
      };
      groups.push(newGroup);
      accountToGroup.set(account.id, newGroup);
    }
  }

  // Reconcile group status: if ANY account is closed, the group is closed
  // This handles inconsistencies across bureaus conservatively
  for (const group of groups) {
    const hasClosedAccount = group.accounts.some((a) => a.status === "closed");
    if (hasClosedAccount) {
      group.status = "closed";
    }
  }

  // Sort groups by status (open first), then by date opened (newest first)
  groups.sort((a, b) => {
    const aOpen = a.status === "open" ? 0 : 1;
    const bOpen = b.status === "open" ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;

    const dateA = a.dateOpened ?? "0000";
    const dateB = b.dateOpened ?? "0000";
    return dateB.localeCompare(dateA);
  });

  return groups;
}

/**
 * Get the best account data from a group (most complete)
 */
export function getBestAccountFromGroup(group: AccountGroup): CreditAccount {
  let best = group.accounts[0];
  let bestScore = 0;

  for (const account of group.accounts) {
    const score =
      (account.creditor_name ? 1 : 0) +
      (account.credit_limit_cents ? 2 : 0) +
      (account.balance_cents ? 2 : 0) +
      (account.date_opened ? 1 : 0) +
      (account.date_updated ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = account;
    }
  }

  return best;
}

/**
 * Get which bureaus report this account group
 */
export function getBureausForGroup(group: AccountGroup): CreditBureau[] {
  return Array.from(group.byBureau.keys()).sort();
}

/**
 * Get account for a specific bureau from a group
 * Returns the best account if multiple exist for that bureau
 */
export function getAccountForBureau(
  group: AccountGroup,
  bureau: CreditBureau
): CreditAccount | null {
  const accounts = group.byBureau.get(bureau);
  if (!accounts || accounts.length === 0) return null;

  // Return the one with most data
  return accounts.reduce((best, current) => {
    const bestScore =
      (best.credit_limit_cents ? 1 : 0) + (best.balance_cents ? 1 : 0);
    const currentScore =
      (current.credit_limit_cents ? 1 : 0) + (current.balance_cents ? 1 : 0);
    return currentScore > bestScore ? current : best;
  });
}

// ============= DEBUG / ADMIN FUNCTIONS =============

export interface MatchDebugInfo {
  account1: {
    id: string;
    bureau: CreditBureau;
    creditor: string;
    masked: string | null;
    dateOpened: string | null;
    limit: number | null;
    balance: number | null;
  };
  account2: {
    id: string;
    bureau: CreditBureau;
    creditor: string;
    masked: string | null;
    dateOpened: string | null;
    limit: number | null;
    balance: number | null;
  };
  score: number;
  breakdown: {
    dateMatch: number;
    limitMatch: number;
    balanceMatch: number;
    creditorMatch: number;
    last4Match: number;
    first6Match: number;
    loanTypeMatch: number;
    statusMatch: number;
  };
  matched: boolean;
}

export interface GroupDebugInfo {
  groupId: string;
  displayName: string;
  accountCount: number;
  bureaus: CreditBureau[];
  dateOpened: string | null;
  status: string;
  loanType: string;
  accounts: Array<{
    id: string;
    bureau: CreditBureau;
    creditor: string;
    masked: string | null;
    limit: number | null;
    balance: number | null;
  }>;
  matchScores: MatchDebugInfo[];
}

/**
 * Calculate detailed match score with breakdown
 */
function calculateMatchScoreDetailed(a: CreditAccount, b: CreditAccount): MatchDebugInfo {
  const breakdown = {
    dateMatch: 0,
    limitMatch: 0,
    balanceMatch: 0,
    creditorMatch: 0,
    last4Match: 0,
    first6Match: 0,
    loanTypeMatch: 0,
    statusMatch: 0,
  };

  // Same date_opened (+50)
  if (a.date_opened && b.date_opened && a.date_opened === b.date_opened) {
    breakdown.dateMatch = 50;
  }

  // Same credit_limit (+30)
  if (a.credit_limit_cents && b.credit_limit_cents && a.credit_limit_cents === b.credit_limit_cents) {
    breakdown.limitMatch = 30;
  }

  // Same balance within 1% (+20)
  if (a.balance_cents && b.balance_cents) {
    const diff = Math.abs(a.balance_cents - b.balance_cents);
    const avg = (a.balance_cents + b.balance_cents) / 2;
    if (diff / avg < 0.01) {
      breakdown.balanceMatch = 20;
    }
  }

  // Creditor name match (+15)
  const normA = normalizeCreditorName(a.creditor_name ?? a.account_name);
  const normB = normalizeCreditorName(b.creditor_name ?? b.account_name);
  if (normA && normB && normA === normB) {
    breakdown.creditorMatch = 15;
  }

  // Last 4 digits match (+25)
  const last4A = extractLast4(a.account_number_masked);
  const last4B = extractLast4(b.account_number_masked);
  if (last4A && last4B && last4A === last4B) {
    breakdown.last4Match = 25;
  }

  // First 6 digits match (+20)
  const first6A = extractFirst6(a.account_number_masked);
  const first6B = extractFirst6(b.account_number_masked);
  if (first6A && first6B && first6A === first6B) {
    breakdown.first6Match = 20;
  }

  // Loan type match (+5)
  if (a.loan_type === b.loan_type) {
    breakdown.loanTypeMatch = 5;
  }

  // Status match (+5)
  if (a.status === b.status) {
    breakdown.statusMatch = 5;
  }

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  return {
    account1: {
      id: a.id,
      bureau: a.bureau,
      creditor: a.creditor_name ?? a.account_name,
      masked: a.account_number_masked,
      dateOpened: a.date_opened,
      limit: a.credit_limit_cents,
      balance: a.balance_cents,
    },
    account2: {
      id: b.id,
      bureau: b.bureau,
      creditor: b.creditor_name ?? b.account_name,
      masked: b.account_number_masked,
      dateOpened: b.date_opened,
      limit: b.credit_limit_cents,
      balance: b.balance_cents,
    },
    score,
    breakdown,
    matched: a.bureau !== b.bureau && score >= 50,
  };
}

/**
 * Get debug info for all account groups including match scores
 */
export function getMatchingDebugInfo(accounts: CreditAccount[]): GroupDebugInfo[] {
  const groups = groupAccountsAcrossBureaus(accounts);

  return groups.map((group) => {
    const matchScores: MatchDebugInfo[] = [];

    // Calculate match scores between all pairs in the group
    for (let i = 0; i < group.accounts.length; i++) {
      for (let j = i + 1; j < group.accounts.length; j++) {
        const a = group.accounts[i];
        const b = group.accounts[j];
        // Only show cross-bureau matches
        if (a.bureau !== b.bureau) {
          matchScores.push(calculateMatchScoreDetailed(a, b));
        }
      }
    }

    return {
      groupId: group.id,
      displayName: group.displayName,
      accountCount: group.accounts.length,
      bureaus: Array.from(group.byBureau.keys()),
      dateOpened: group.dateOpened,
      status: group.status,
      loanType: group.loanType,
      accounts: group.accounts.map((a) => ({
        id: a.id,
        bureau: a.bureau,
        creditor: a.creditor_name ?? a.account_name,
        masked: a.account_number_masked,
        limit: a.credit_limit_cents,
        balance: a.balance_cents,
      })),
      matchScores,
    };
  });
}
