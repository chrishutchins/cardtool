-- Migration: Update RLS policies for Clerk JWT authentication
-- Uses inline auth.jwt()->>'sub' to get Clerk user ID
--
-- PREREQUISITE: Configure Clerk + Supabase integration:
-- 1. Clerk Dashboard: Integrations → Supabase → Activate
-- 2. Supabase Dashboard: Auth → Third Party → Add Clerk

-- ============================================================================
-- USER TABLES WITH DIRECT user_id COLUMN
-- ============================================================================

-- user_wallets
DROP POLICY IF EXISTS "Users can read their own wallets" ON user_wallets;
DROP POLICY IF EXISTS "Users can insert their own wallets" ON user_wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON user_wallets;
DROP POLICY IF EXISTS "Users can delete their own wallets" ON user_wallets;

CREATE POLICY "Users can read their own wallets"
  ON user_wallets FOR SELECT TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can insert their own wallets"
  ON user_wallets FOR INSERT TO authenticated
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can update their own wallets"
  ON user_wallets FOR UPDATE TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can delete their own wallets"
  ON user_wallets FOR DELETE TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

-- user_category_spend
DROP POLICY IF EXISTS "Users can read their own spend" ON user_category_spend;
DROP POLICY IF EXISTS "Users can manage their own spend" ON user_category_spend;

CREATE POLICY "Users can manage their own spend"
  ON user_category_spend FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_currency_values
DROP POLICY IF EXISTS "Users can read their own currency values" ON user_currency_values;
DROP POLICY IF EXISTS "Users can manage their own currency values" ON user_currency_values;

CREATE POLICY "Users can manage their own currency values"
  ON user_currency_values FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_card_selections
DROP POLICY IF EXISTS "Users can read their own selections" ON user_card_selections;
DROP POLICY IF EXISTS "Users can manage their own selections" ON user_card_selections;

CREATE POLICY "Users can manage their own selections"
  ON user_card_selections FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_multiplier_tiers
DROP POLICY IF EXISTS "Users can read their own tiers" ON user_multiplier_tiers;
DROP POLICY IF EXISTS "Users can manage their own tiers" ON user_multiplier_tiers;

CREATE POLICY "Users can manage their own tiers"
  ON user_multiplier_tiers FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_travel_booking_preferences
DROP POLICY IF EXISTS "Users can read their own preferences" ON user_travel_booking_preferences;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_travel_booking_preferences;

CREATE POLICY "Users can manage their own preferences"
  ON user_travel_booking_preferences FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_card_perks_values
DROP POLICY IF EXISTS "Users can read their own perks" ON user_card_perks_values;
DROP POLICY IF EXISTS "Users can manage their own perks" ON user_card_perks_values;

CREATE POLICY "Users can manage their own perks"
  ON user_card_perks_values FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_mobile_pay_categories
DROP POLICY IF EXISTS "Users can read their own mobile pay" ON user_mobile_pay_categories;
DROP POLICY IF EXISTS "Users can manage their own mobile pay" ON user_mobile_pay_categories;

CREATE POLICY "Users can manage their own mobile pay"
  ON user_mobile_pay_categories FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_feature_flags
DROP POLICY IF EXISTS "Users can read their own flags" ON user_feature_flags;
DROP POLICY IF EXISTS "Users can manage their own flags" ON user_feature_flags;

CREATE POLICY "Users can manage their own flags"
  ON user_feature_flags FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_card_debit_pay
DROP POLICY IF EXISTS "Users can read their own debit pay" ON user_card_debit_pay;
DROP POLICY IF EXISTS "Users can manage their own debit pay" ON user_card_debit_pay;

CREATE POLICY "Users can manage their own debit pay"
  ON user_card_debit_pay FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_compare_categories
DROP POLICY IF EXISTS "Users can read their own compare categories" ON user_compare_categories;
DROP POLICY IF EXISTS "Users can manage their own compare categories" ON user_compare_categories;

CREATE POLICY "Users can manage their own compare categories"
  ON user_compare_categories FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_compare_evaluation_cards
DROP POLICY IF EXISTS "Users can read their own evaluation cards" ON user_compare_evaluation_cards;
DROP POLICY IF EXISTS "Users can manage their own evaluation cards" ON user_compare_evaluation_cards;

CREATE POLICY "Users can manage their own evaluation cards"
  ON user_compare_evaluation_cards FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_large_purchase_categories
DROP POLICY IF EXISTS "Users can read their own large purchase categories" ON user_large_purchase_categories;
DROP POLICY IF EXISTS "Users can manage their own large purchase categories" ON user_large_purchase_categories;

CREATE POLICY "Users can manage their own large purchase categories"
  ON user_large_purchase_categories FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_point_value_settings
DROP POLICY IF EXISTS "Users can read their own point value settings" ON user_point_value_settings;
DROP POLICY IF EXISTS "Users can manage their own point value settings" ON user_point_value_settings;

CREATE POLICY "Users can manage their own point value settings"
  ON user_point_value_settings FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_paypal_categories
DROP POLICY IF EXISTS "Users can read their own paypal categories" ON user_paypal_categories;
DROP POLICY IF EXISTS "Users can manage their own paypal categories" ON user_paypal_categories;

CREATE POLICY "Users can manage their own paypal categories"
  ON user_paypal_categories FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_welcome_bonus_settings
DROP POLICY IF EXISTS "Users can read their own welcome bonus settings" ON user_welcome_bonus_settings;
DROP POLICY IF EXISTS "Users can manage their own welcome bonus settings" ON user_welcome_bonus_settings;

CREATE POLICY "Users can manage their own welcome bonus settings"
  ON user_welcome_bonus_settings FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_welcome_bonus_value_overrides
DROP POLICY IF EXISTS "Users can read their own welcome bonus overrides" ON user_welcome_bonus_value_overrides;
DROP POLICY IF EXISTS "Users can manage their own welcome bonus overrides" ON user_welcome_bonus_value_overrides;

CREATE POLICY "Users can manage their own welcome bonus overrides"
  ON user_welcome_bonus_value_overrides FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_spend_bonus_values
DROP POLICY IF EXISTS "Users can read their own spend bonus values" ON user_spend_bonus_values;
DROP POLICY IF EXISTS "Users can manage their own spend bonus values" ON user_spend_bonus_values;

CREATE POLICY "Users can manage their own spend bonus values"
  ON user_spend_bonus_values FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_bonus_display_settings
DROP POLICY IF EXISTS "Users can read their own bonus display settings" ON user_bonus_display_settings;
DROP POLICY IF EXISTS "Users can manage their own bonus display settings" ON user_bonus_display_settings;

CREATE POLICY "Users can manage their own bonus display settings"
  ON user_bonus_display_settings FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_plaid_items
DROP POLICY IF EXISTS "Users can read their own plaid items" ON user_plaid_items;
DROP POLICY IF EXISTS "Users can manage their own plaid items" ON user_plaid_items;

CREATE POLICY "Users can manage their own plaid items"
  ON user_plaid_items FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_linked_accounts
DROP POLICY IF EXISTS "Users can read their own linked accounts" ON user_linked_accounts;
DROP POLICY IF EXISTS "Users can manage their own linked accounts" ON user_linked_accounts;

CREATE POLICY "Users can manage their own linked accounts"
  ON user_linked_accounts FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_spend_bonuses
DROP POLICY IF EXISTS "Users can read their own spend bonuses" ON user_spend_bonuses;
DROP POLICY IF EXISTS "Users can manage their own spend bonuses" ON user_spend_bonuses;

CREATE POLICY "Users can manage their own spend bonuses"
  ON user_spend_bonuses FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_welcome_bonuses
DROP POLICY IF EXISTS "Users can read their own welcome bonuses" ON user_welcome_bonuses;
DROP POLICY IF EXISTS "Users can manage their own welcome bonuses" ON user_welcome_bonuses;

CREATE POLICY "Users can manage their own welcome bonuses"
  ON user_welcome_bonuses FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_feedback
DROP POLICY IF EXISTS "Users can read their own feedback" ON user_feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON user_feedback;

CREATE POLICY "Users can read their own feedback"
  ON user_feedback FOR SELECT TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can insert their own feedback"
  ON user_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_plaid_transactions
DROP POLICY IF EXISTS "Users can read their own transactions" ON user_plaid_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON user_plaid_transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON user_plaid_transactions;

CREATE POLICY "Users can read their own transactions"
  ON user_plaid_transactions FOR SELECT TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can insert their own transactions"
  ON user_plaid_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can update their own transactions"
  ON user_plaid_transactions FOR UPDATE TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

-- user_plaid_sync_state
DROP POLICY IF EXISTS "Users can read their own sync state" ON user_plaid_sync_state;
DROP POLICY IF EXISTS "Users can insert their own sync state" ON user_plaid_sync_state;
DROP POLICY IF EXISTS "Users can update their own sync state" ON user_plaid_sync_state;

CREATE POLICY "Users can read their own sync state"
  ON user_plaid_sync_state FOR SELECT TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can insert their own sync state"
  ON user_plaid_sync_state FOR INSERT TO authenticated
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "Users can update their own sync state"
  ON user_plaid_sync_state FOR UPDATE TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

-- ============================================================================
-- TABLES THAT NEED RLS ENABLED
-- ============================================================================

-- Enable RLS on user_inventory
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own inventory"
  ON user_inventory FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- Enable RLS on user_players
ALTER TABLE user_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own players"
  ON user_players FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- ============================================================================
-- TABLES WITH INDIRECT USER RELATIONSHIP (via user_wallets)
-- ============================================================================

-- user_credit_usage
DROP POLICY IF EXISTS "Users can read their own credit usage" ON user_credit_usage;
DROP POLICY IF EXISTS "Users can manage their own credit usage" ON user_credit_usage;

CREATE POLICY "Users can manage their own credit usage"
  ON user_credit_usage FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_wallets
      WHERE user_wallets.id = user_credit_usage.user_wallet_id
      AND user_wallets.user_id = (auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_wallets
      WHERE user_wallets.id = user_credit_usage.user_wallet_id
      AND user_wallets.user_id = (auth.jwt()->>'sub')
    )
  );

-- user_credit_settings
DROP POLICY IF EXISTS "Users can read their own credit settings" ON user_credit_settings;
DROP POLICY IF EXISTS "Users can manage their own credit settings" ON user_credit_settings;

CREATE POLICY "Users can manage their own credit settings"
  ON user_credit_settings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_wallets
      WHERE user_wallets.id = user_credit_settings.user_wallet_id
      AND user_wallets.user_id = (auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_wallets
      WHERE user_wallets.id = user_credit_settings.user_wallet_id
      AND user_wallets.user_id = (auth.jwt()->>'sub')
    )
  );

-- user_credit_usage_transactions
DROP POLICY IF EXISTS "Users can read their own usage transactions" ON user_credit_usage_transactions;
DROP POLICY IF EXISTS "Users can insert their own usage transactions" ON user_credit_usage_transactions;
DROP POLICY IF EXISTS "Users can delete their own usage transactions" ON user_credit_usage_transactions;

CREATE POLICY "Users can read their own usage transactions"
  ON user_credit_usage_transactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_credit_usage
      JOIN user_wallets ON user_wallets.id = user_credit_usage.user_wallet_id
      WHERE user_credit_usage.id = user_credit_usage_transactions.usage_id
      AND user_wallets.user_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can insert their own usage transactions"
  ON user_credit_usage_transactions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_credit_usage
      JOIN user_wallets ON user_wallets.id = user_credit_usage.user_wallet_id
      WHERE user_credit_usage.id = user_credit_usage_transactions.usage_id
      AND user_wallets.user_id = (auth.jwt()->>'sub')
    )
  );

CREATE POLICY "Users can delete their own usage transactions"
  ON user_credit_usage_transactions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_credit_usage
      JOIN user_wallets ON user_wallets.id = user_credit_usage.user_wallet_id
      WHERE user_credit_usage.id = user_credit_usage_transactions.usage_id
      AND user_wallets.user_id = (auth.jwt()->>'sub')
    )
  );

-- ============================================================================
-- REFERENCE TABLES (read-only for authenticated users)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can read matching rules" ON credit_matching_rules;

CREATE POLICY "Authenticated users can read matching rules"
  ON credit_matching_rules FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role only" ON stripe_members;

ALTER TABLE inventory_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read inventory types"
  ON inventory_types FOR SELECT TO authenticated
  USING (true);

ALTER TABLE application_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read application rules"
  ON application_rules FOR SELECT TO authenticated
  USING (true);
