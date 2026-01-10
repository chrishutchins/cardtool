/**
 * Statement Balance Calculator
 * 
 * Estimates statement balance by subtracting post-statement transactions
 * from the current balance. This is an approximation - actual statement
 * balances may differ due to interest, fees, and timing differences.
 */

export interface StatementEstimate {
  /** Estimated statement balance in cents */
  statementBalanceCents: number;
  /** Total charges after statement close (positive = spending) */
  postStatementSpendCents: number;
  /** Total credits/payments after statement close (positive = credits/refunds) */
  postStatementCreditsCents: number;
  /** The statement close date used for calculation */
  lastStatementCloseDate: Date;
  /** Number of transactions after statement close */
  transactionCount: number;
  /** Current balance used in calculation (cents) */
  currentBalanceCents: number;
  /** Always true - indicates this is a calculated estimate */
  isEstimate: true;
}

export interface TransactionForCalculation {
  /** Transaction amount in cents (positive = charge, negative = credit/payment) */
  amount_cents: number;
  /** Transaction date in YYYY-MM-DD format */
  date: string;
}

/**
 * Calculate estimated statement balance based on current balance and transactions.
 * 
 * Formula: Statement Balance = Current Balance - Post-Statement Charges + Post-Statement Credits
 * 
 * Note: In Plaid, transaction amounts are:
 * - Positive for charges/purchases (money going out)
 * - Negative for credits/payments (money coming in)
 * 
 * Credit card balances in Plaid are:
 * - Positive when you owe money
 * - The current balance includes all posted transactions
 * 
 * So to get statement balance:
 * - Start with current balance
 * - Subtract charges made after statement close (they increased the balance)
 * - Add back credits made after statement close (they decreased the balance)
 * 
 * @param currentBalanceCents - Current balance from Plaid (in cents, positive = amount owed)
 * @param transactions - All transactions for the account
 * @param lastStatementCloseDate - The date the last statement closed
 * @returns Statement estimate with breakdown
 */
export function calculateStatementBalance(
  currentBalanceCents: number,
  transactions: TransactionForCalculation[],
  lastStatementCloseDate: Date
): StatementEstimate {
  // Normalize the close date to start of day for comparison
  const closeDate = new Date(lastStatementCloseDate);
  closeDate.setHours(0, 0, 0, 0);
  
  // Filter to transactions AFTER the statement close date
  // (transactions on the close date are included in the statement)
  const postStatementTransactions = transactions.filter(t => {
    // Parse YYYY-MM-DD as local date (not UTC) to avoid timezone issues
    const [year, month, day] = t.date.split('-').map(Number);
    const txDate = new Date(year, month - 1, day); // month is 0-indexed
    txDate.setHours(0, 0, 0, 0);
    return txDate > closeDate;
  });
  
  // Sum up charges (positive amounts) and credits (negative amounts)
  let postStatementSpendCents = 0;
  let postStatementCreditsCents = 0;
  
  for (const tx of postStatementTransactions) {
    if (tx.amount_cents > 0) {
      // Charge/purchase
      postStatementSpendCents += tx.amount_cents;
    } else {
      // Credit/payment/refund (negative in Plaid, we store as positive credit)
      postStatementCreditsCents += Math.abs(tx.amount_cents);
    }
  }
  
  // Calculate statement balance
  // Current = Statement + PostCharges - PostCredits
  // Therefore: Statement = Current - PostCharges + PostCredits
  const statementBalanceCents = currentBalanceCents - postStatementSpendCents + postStatementCreditsCents;
  
  return {
    statementBalanceCents,
    postStatementSpendCents,
    postStatementCreditsCents,
    lastStatementCloseDate: closeDate,
    transactionCount: postStatementTransactions.length,
    currentBalanceCents,
    isEstimate: true,
  };
}

/**
 * Format a statement estimate for display/debugging.
 */
export function formatStatementEstimate(estimate: StatementEstimate): string {
  const formatCents = (cents: number) => {
    const dollars = cents / 100;
    return dollars < 0 ? `-$${Math.abs(dollars).toFixed(2)}` : `$${dollars.toFixed(2)}`;
  };
  
  return [
    `Statement Balance (Est): ${formatCents(estimate.statementBalanceCents)}`,
    `  Current Balance: ${formatCents(estimate.currentBalanceCents)}`,
    `  Post-Statement Charges: ${formatCents(estimate.postStatementSpendCents)}`,
    `  Post-Statement Credits: ${formatCents(estimate.postStatementCreditsCents)}`,
    `  Transactions After Close: ${estimate.transactionCount}`,
    `  Statement Close: ${estimate.lastStatementCloseDate.toLocaleDateString()}`,
  ].join('\n');
}
