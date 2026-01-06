-- Credit Matching Rules: stores patterns for auto-detecting credits from transactions
CREATE TABLE credit_matching_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id uuid REFERENCES card_credits(id) ON DELETE CASCADE,
  pattern text NOT NULL,
  match_amount_cents integer,         -- NULL = any amount, otherwise exact match
  created_at timestamptz DEFAULT now(),
  created_by text
);

-- Index for looking up rules by credit
CREATE INDEX idx_credit_matching_rules_credit ON credit_matching_rules(credit_id);

-- User Plaid Transactions: stores all transaction data from Plaid
CREATE TABLE user_plaid_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  linked_account_id uuid REFERENCES user_linked_accounts(id) ON DELETE CASCADE,
  plaid_transaction_id text NOT NULL UNIQUE,
  name text NOT NULL,
  amount_cents integer NOT NULL,       -- negative = credit, positive = debit
  date date NOT NULL,                  -- posted date from Plaid
  authorized_date date,                -- authorized date from Plaid (when transaction actually occurred)
  pending boolean DEFAULT false,
  category text[],
  merchant_name text,
  -- Matching fields
  matched_credit_id uuid REFERENCES card_credits(id),
  matched_rule_id uuid REFERENCES credit_matching_rules(id),
  is_clawback boolean DEFAULT false,
  dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_plaid_txn_user ON user_plaid_transactions(user_id);
CREATE INDEX idx_plaid_txn_amount ON user_plaid_transactions(amount_cents);
CREATE INDEX idx_plaid_txn_date ON user_plaid_transactions(date);
CREATE INDEX idx_plaid_txn_linked_account ON user_plaid_transactions(linked_account_id);
CREATE INDEX idx_plaid_txn_matched_credit ON user_plaid_transactions(matched_credit_id);

-- Junction table linking multiple transactions to a single usage record
CREATE TABLE user_credit_usage_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_id uuid REFERENCES user_credit_usage(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES user_plaid_transactions(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,      -- amount this transaction contributed
  created_at timestamptz DEFAULT now(),
  UNIQUE(usage_id, transaction_id)
);

CREATE INDEX idx_usage_txn_usage ON user_credit_usage_transactions(usage_id);
CREATE INDEX idx_usage_txn_transaction ON user_credit_usage_transactions(transaction_id);

-- Add columns to user_credit_usage for clawback, auto-detection, and multi-slot tracking
ALTER TABLE user_credit_usage 
ADD COLUMN is_clawback boolean DEFAULT false,
ADD COLUMN auto_detected boolean DEFAULT false,
ADD COLUMN slot_number integer DEFAULT 1;

-- Plaid sync state: tracks last sync per user/plaid item
CREATE TABLE user_plaid_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  plaid_item_id uuid REFERENCES user_plaid_items(id) ON DELETE CASCADE,
  last_synced_at timestamptz,
  last_transaction_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, plaid_item_id)
);

CREATE INDEX idx_plaid_sync_state_user ON user_plaid_sync_state(user_id);

-- Enable RLS on new tables
ALTER TABLE credit_matching_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plaid_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credit_usage_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plaid_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_matching_rules (read-only for all authenticated, write for service role)
CREATE POLICY "Anyone can read matching rules"
  ON credit_matching_rules FOR SELECT
  TO authenticated
  USING (true);

-- NOTE: RLS policies use USING (true) because this app uses Clerk for authentication,
-- not Supabase Auth. auth.uid() is always NULL in this context.
-- Authorization is enforced at the application layer via Clerk session validation.
-- Server-side code uses createAdminClient() (service role) to bypass RLS after
-- verifying user identity through Clerk.

-- RLS Policies for user_plaid_transactions
CREATE POLICY "Users can read their own transactions"
  ON user_plaid_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own transactions"
  ON user_plaid_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own transactions"
  ON user_plaid_transactions FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for user_credit_usage_transactions
CREATE POLICY "Users can read their own usage transactions"
  ON user_credit_usage_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own usage transactions"
  ON user_credit_usage_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete their own usage transactions"
  ON user_credit_usage_transactions FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for user_plaid_sync_state
CREATE POLICY "Users can read their own sync state"
  ON user_plaid_sync_state FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own sync state"
  ON user_plaid_sync_state FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own sync state"
  ON user_plaid_sync_state FOR UPDATE
  TO authenticated
  USING (true);

