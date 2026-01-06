-- Fix RLS policies to properly check user_id instead of allowing all authenticated users

-- Drop existing overly-permissive policies for user_plaid_transactions
DROP POLICY IF EXISTS "Users can read their own transactions" ON user_plaid_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON user_plaid_transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON user_plaid_transactions;

-- Create proper policies for user_plaid_transactions
CREATE POLICY "Users can read their own transactions"
  ON user_plaid_transactions FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON user_plaid_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own transactions"
  ON user_plaid_transactions FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Drop existing overly-permissive policies for user_credit_usage_transactions
DROP POLICY IF EXISTS "Users can read their own usage transactions" ON user_credit_usage_transactions;
DROP POLICY IF EXISTS "Users can insert their own usage transactions" ON user_credit_usage_transactions;
DROP POLICY IF EXISTS "Users can delete their own usage transactions" ON user_credit_usage_transactions;

-- Create proper policies for user_credit_usage_transactions
-- These need to check via the usage_id -> user_credit_usage -> user_wallets -> user_id chain
CREATE POLICY "Users can read their own usage transactions"
  ON user_credit_usage_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_credit_usage ucu
      JOIN user_wallets uw ON ucu.user_wallet_id = uw.id
      WHERE ucu.id = user_credit_usage_transactions.usage_id
      AND uw.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert their own usage transactions"
  ON user_credit_usage_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_credit_usage ucu
      JOIN user_wallets uw ON ucu.user_wallet_id = uw.id
      WHERE ucu.id = user_credit_usage_transactions.usage_id
      AND uw.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete their own usage transactions"
  ON user_credit_usage_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_credit_usage ucu
      JOIN user_wallets uw ON ucu.user_wallet_id = uw.id
      WHERE ucu.id = user_credit_usage_transactions.usage_id
      AND uw.user_id = auth.uid()::text
    )
  );

-- Drop existing overly-permissive policies for user_plaid_sync_state
DROP POLICY IF EXISTS "Users can read their own sync state" ON user_plaid_sync_state;
DROP POLICY IF EXISTS "Users can insert their own sync state" ON user_plaid_sync_state;
DROP POLICY IF EXISTS "Users can update their own sync state" ON user_plaid_sync_state;

-- Create proper policies for user_plaid_sync_state
CREATE POLICY "Users can read their own sync state"
  ON user_plaid_sync_state FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own sync state"
  ON user_plaid_sync_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own sync state"
  ON user_plaid_sync_state FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

