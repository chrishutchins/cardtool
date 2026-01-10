-- Add new fields to user_wallets for manual card tracking
-- These fields allow users to track statement dates and balances for cards
-- not linked via Plaid

-- Statement close day (1-31) - the day of the month the statement closes
ALTER TABLE user_wallets ADD COLUMN statement_close_day INTEGER;
ALTER TABLE user_wallets ADD CONSTRAINT user_wallets_statement_close_day_check 
  CHECK (statement_close_day IS NULL OR (statement_close_day >= 1 AND statement_close_day <= 31));

-- Payment due day (1-31) - the day of the month payment is due
ALTER TABLE user_wallets ADD COLUMN payment_due_day INTEGER;
ALTER TABLE user_wallets ADD CONSTRAINT user_wallets_payment_due_day_check 
  CHECK (payment_due_day IS NULL OR (payment_due_day >= 1 AND payment_due_day <= 31));

-- Manual balance in cents - for users without Plaid linking
ALTER TABLE user_wallets ADD COLUMN manual_balance_cents INTEGER;

-- Manual credit limit in cents - for users without Plaid linking
ALTER TABLE user_wallets ADD COLUMN manual_credit_limit_cents INTEGER;

-- Add indexes for common queries
CREATE INDEX idx_user_wallets_statement_close_day ON user_wallets(statement_close_day) 
  WHERE statement_close_day IS NOT NULL;
CREATE INDEX idx_user_wallets_payment_due_day ON user_wallets(payment_due_day) 
  WHERE payment_due_day IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN user_wallets.statement_close_day IS 'Day of month (1-31) when statement closes';
COMMENT ON COLUMN user_wallets.payment_due_day IS 'Day of month (1-31) when payment is due';
COMMENT ON COLUMN user_wallets.manual_balance_cents IS 'Manually entered current balance in cents (for non-Plaid users)';
COMMENT ON COLUMN user_wallets.manual_credit_limit_cents IS 'Manually entered credit limit in cents (for non-Plaid users)';


