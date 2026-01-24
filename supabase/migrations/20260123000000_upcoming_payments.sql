-- Migration: Upcoming Payments Feature
-- Adds liabilities data to linked accounts, bank accounts for "Pay From", and payment settings

-- ============================================================================
-- Part 1: Add liabilities columns to user_linked_accounts
-- ============================================================================

ALTER TABLE user_linked_accounts
ADD COLUMN IF NOT EXISTS last_statement_balance numeric,
ADD COLUMN IF NOT EXISTS last_statement_date date,
ADD COLUMN IF NOT EXISTS next_payment_due_date date,
ADD COLUMN IF NOT EXISTS minimum_payment_amount numeric,
ADD COLUMN IF NOT EXISTS is_overdue boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS liabilities_updated_at timestamptz;

-- Index for querying upcoming payments by due date
CREATE INDEX IF NOT EXISTS idx_user_linked_accounts_due_date 
ON user_linked_accounts(user_id, next_payment_due_date) 
WHERE next_payment_due_date IS NOT NULL;

-- ============================================================================
-- Part 2: Create user_bank_accounts table for "Pay From" accounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  plaid_item_id uuid NOT NULL REFERENCES user_plaid_items(id) ON DELETE CASCADE,
  plaid_account_id text NOT NULL,
  
  -- Account details
  name text NOT NULL,
  official_name text,
  mask text,
  institution_name text,
  
  -- Account type
  type text NOT NULL, -- 'depository'
  subtype text, -- 'checking', 'savings'
  
  -- Balance info
  current_balance numeric,
  available_balance numeric,
  iso_currency_code text DEFAULT 'USD',
  last_balance_update timestamptz,
  
  -- User settings
  is_primary boolean DEFAULT false,
  display_name text, -- User-customizable name
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique plaid account per user
  CONSTRAINT unique_user_plaid_bank_account UNIQUE (user_id, plaid_account_id)
);

-- Indexes for bank accounts
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_user_id ON user_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_plaid_item ON user_bank_accounts(plaid_item_id);

-- Enable RLS
ALTER TABLE user_bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own bank accounts
CREATE POLICY "Users can manage their own bank accounts"
ON user_bank_accounts FOR ALL TO authenticated
USING (user_id = (auth.jwt()->>'sub'))
WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- ============================================================================
-- Part 3: Create user_card_payment_settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_card_payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  wallet_card_id uuid NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
  
  -- Pay from account (nullable - user may not have linked a bank yet)
  pay_from_account_id uuid REFERENCES user_bank_accounts(id) ON DELETE SET NULL,
  
  -- Auto-pay settings
  is_autopay boolean DEFAULT false,
  autopay_type text CHECK (autopay_type IN ('full_balance', 'statement_balance', 'minimum', 'fixed_amount')),
  fixed_autopay_amount numeric, -- Only used when autopay_type = 'fixed_amount'
  
  -- Payment reminder preferences
  reminder_days_before integer DEFAULT 3, -- Days before due date to remind
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One settings record per wallet card
  CONSTRAINT unique_wallet_card_settings UNIQUE (wallet_card_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_card_payment_settings_user ON user_card_payment_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_card_payment_settings_wallet ON user_card_payment_settings(wallet_card_id);
CREATE INDEX IF NOT EXISTS idx_user_card_payment_settings_pay_from ON user_card_payment_settings(pay_from_account_id);

-- Enable RLS
ALTER TABLE user_card_payment_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own payment settings
CREATE POLICY "Users can manage their own payment settings"
ON user_card_payment_settings FOR ALL TO authenticated
USING (user_id = (auth.jwt()->>'sub'))
WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- ============================================================================
-- Part 4: Add consented_products tracking to user_plaid_items
-- ============================================================================

ALTER TABLE user_plaid_items
ADD COLUMN IF NOT EXISTS consented_products text[] DEFAULT '{}';

-- ============================================================================
-- Part 5: Create function to ensure only one primary bank account per user
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_single_primary_bank_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE user_bank_accounts 
    SET is_primary = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_single_primary_bank_account ON user_bank_accounts;
CREATE TRIGGER trigger_single_primary_bank_account
BEFORE INSERT OR UPDATE ON user_bank_accounts
FOR EACH ROW
EXECUTE FUNCTION ensure_single_primary_bank_account();

-- ============================================================================
-- Part 6: Create view for upcoming payments with calculated amounts
-- ============================================================================

CREATE OR REPLACE VIEW user_upcoming_payments AS
SELECT 
  ula.id as linked_account_id,
  ula.user_id,
  ula.wallet_card_id,
  uw.custom_name,
  c.name as card_name,
  c.image_url as card_image,
  i.name as issuer_name,
  ula.mask,
  ula.last_statement_balance,
  ula.last_statement_date,
  ula.next_payment_due_date,
  ula.minimum_payment_amount,
  ula.is_overdue,
  ula.current_balance,
  ucps.pay_from_account_id,
  ucps.is_autopay,
  ucps.autopay_type,
  uba.name as pay_from_account_name,
  uba.institution_name as pay_from_institution,
  uba.available_balance as pay_from_available_balance,
  uba.current_balance as pay_from_current_balance
FROM user_linked_accounts ula
LEFT JOIN user_wallets uw ON ula.wallet_card_id = uw.id
LEFT JOIN cards c ON uw.card_id = c.id
LEFT JOIN issuers i ON c.issuer_id = i.id
LEFT JOIN user_card_payment_settings ucps ON uw.id = ucps.wallet_card_id
LEFT JOIN user_bank_accounts uba ON ucps.pay_from_account_id = uba.id
WHERE ula.type = 'credit';
