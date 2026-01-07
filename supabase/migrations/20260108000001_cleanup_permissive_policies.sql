-- Migration: Remove old permissive RLS policies
-- 
-- This removes the legacy USING(true) policies that were left behind after
-- implementing proper Clerk JWT-based RLS. The secure policies using
-- auth.jwt()->>'sub' remain in place.

-- ============================================================================
-- USER_WALLETS - Remove old permissive policies, keep secure ones
-- ============================================================================
DROP POLICY IF EXISTS "Allow delete own wallets" ON user_wallets;
DROP POLICY IF EXISTS "Allow insert own wallets" ON user_wallets;
DROP POLICY IF EXISTS "Allow read own wallets" ON user_wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON user_wallets;

-- ============================================================================
-- USER_CATEGORY_SPEND - Remove old permissive policies
-- ============================================================================
DROP POLICY IF EXISTS "Allow delete own category spend" ON user_category_spend;
DROP POLICY IF EXISTS "Allow insert own category spend" ON user_category_spend;
DROP POLICY IF EXISTS "Allow read own category spend" ON user_category_spend;
DROP POLICY IF EXISTS "Allow update own category spend" ON user_category_spend;

-- ============================================================================
-- USER_CREDIT_USAGE - Remove old permissive policy
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on user_credit_usage" ON user_credit_usage;

-- ============================================================================
-- USER_LINKED_ACCOUNTS - Remove old permissive policy
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to user_linked_accounts" ON user_linked_accounts;

-- ============================================================================
-- USER_PLAID_TRANSACTIONS - Remove old permissive policy
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to user_plaid_transactions" ON user_plaid_transactions;

-- ============================================================================
-- USER_PLAID_ITEMS - Remove old permissive policy
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to user_plaid_items" ON user_plaid_items;

-- ============================================================================
-- USER_PLAID_SYNC_STATE - Remove old permissive policy
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to user_plaid_sync_state" ON user_plaid_sync_state;

-- ============================================================================
-- USER_CURRENCY_VALUES - Remove old permissive policies
-- ============================================================================
DROP POLICY IF EXISTS "Allow delete own currency values" ON user_currency_values;
DROP POLICY IF EXISTS "Allow insert own currency values" ON user_currency_values;
DROP POLICY IF EXISTS "Allow read own currency values" ON user_currency_values;
DROP POLICY IF EXISTS "Allow update own currency values" ON user_currency_values;

-- ============================================================================
-- USER_POINT_VALUE_SETTINGS - Remove old permissive policies
-- ============================================================================
DROP POLICY IF EXISTS "Allow delete own settings" ON user_point_value_settings;
DROP POLICY IF EXISTS "Allow insert own settings" ON user_point_value_settings;
DROP POLICY IF EXISTS "Allow read own settings" ON user_point_value_settings;
DROP POLICY IF EXISTS "Allow update own settings" ON user_point_value_settings;

-- ============================================================================
-- USER_CREDIT_USAGE_TRANSACTIONS - Remove old permissive policy
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to user_credit_usage_transactions" ON user_credit_usage_transactions;

-- ============================================================================
-- USER_TRAVEL_BOOKING_PREFERENCES - Remove old permissive policy
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to user_travel_booking_preferences" ON user_travel_booking_preferences;

-- ============================================================================
-- OTHER USER TABLES - Remove permissive policies, add secure ones if missing
-- ============================================================================

-- user_card_selections
DROP POLICY IF EXISTS "Allow delete from user_card_selections" ON user_card_selections;
DROP POLICY IF EXISTS "Allow insert to user_card_selections" ON user_card_selections;
DROP POLICY IF EXISTS "Allow read from user_card_selections" ON user_card_selections;
DROP POLICY IF EXISTS "Allow update to user_card_selections" ON user_card_selections;

CREATE POLICY IF NOT EXISTS "Users can manage their own card selections"
  ON user_card_selections FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_paypal_categories
DROP POLICY IF EXISTS "Allow delete own paypal categories" ON user_paypal_categories;
DROP POLICY IF EXISTS "Allow insert own paypal categories" ON user_paypal_categories;
DROP POLICY IF EXISTS "Allow read own paypal categories" ON user_paypal_categories;
DROP POLICY IF EXISTS "Allow update own paypal categories" ON user_paypal_categories;

CREATE POLICY IF NOT EXISTS "Users can manage their own paypal categories"
  ON user_paypal_categories FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_spend_bonuses
DROP POLICY IF EXISTS "Users can delete their own spend bonuses" ON user_spend_bonuses;
DROP POLICY IF EXISTS "Users can insert their own spend bonuses" ON user_spend_bonuses;
DROP POLICY IF EXISTS "Users can read their own spend bonuses" ON user_spend_bonuses;
DROP POLICY IF EXISTS "Users can update their own spend bonuses" ON user_spend_bonuses;

CREATE POLICY IF NOT EXISTS "Users can manage their own spend bonuses"
  ON user_spend_bonuses FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_welcome_bonuses
DROP POLICY IF EXISTS "Users can delete their own welcome bonuses" ON user_welcome_bonuses;
DROP POLICY IF EXISTS "Users can insert their own welcome bonuses" ON user_welcome_bonuses;
DROP POLICY IF EXISTS "Users can read their own welcome bonuses" ON user_welcome_bonuses;
DROP POLICY IF EXISTS "Users can update their own welcome bonuses" ON user_welcome_bonuses;

CREATE POLICY IF NOT EXISTS "Users can manage their own welcome bonuses"
  ON user_welcome_bonuses FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_feature_flags
DROP POLICY IF EXISTS "Allow all operations on user_feature_flags" ON user_feature_flags;

CREATE POLICY IF NOT EXISTS "Users can manage their own feature flags"
  ON user_feature_flags FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_feedback
DROP POLICY IF EXISTS "Users can insert own feedback" ON user_feedback;
DROP POLICY IF EXISTS "Users can read own feedback" ON user_feedback;

CREATE POLICY IF NOT EXISTS "Users can manage their own feedback"
  ON user_feedback FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_bonus_display_settings
DROP POLICY IF EXISTS "Allow all operations for user_bonus_display_settings" ON user_bonus_display_settings;

CREATE POLICY IF NOT EXISTS "Users can manage their own bonus display settings"
  ON user_bonus_display_settings FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_card_debit_pay
DROP POLICY IF EXISTS "Allow all operations on user_card_debit_pay" ON user_card_debit_pay;

CREATE POLICY IF NOT EXISTS "Users can manage their own card debit pay"
  ON user_card_debit_pay FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_card_perks_values
DROP POLICY IF EXISTS "Allow all operations on user_card_perks_values" ON user_card_perks_values;

CREATE POLICY IF NOT EXISTS "Users can manage their own card perks values"
  ON user_card_perks_values FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_compare_categories
DROP POLICY IF EXISTS "Allow all operations on user_compare_categories" ON user_compare_categories;

CREATE POLICY IF NOT EXISTS "Users can manage their own compare categories"
  ON user_compare_categories FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_compare_evaluation_cards
DROP POLICY IF EXISTS "Allow all operations on user_compare_evaluation_cards" ON user_compare_evaluation_cards;

CREATE POLICY IF NOT EXISTS "Users can manage their own compare evaluation cards"
  ON user_compare_evaluation_cards FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_credit_settings
DROP POLICY IF EXISTS "Allow all operations on user_credit_settings" ON user_credit_settings;

CREATE POLICY IF NOT EXISTS "Users can manage their own credit settings"
  ON user_credit_settings FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_large_purchase_categories
DROP POLICY IF EXISTS "Allow all operations on user_large_purchase_categories" ON user_large_purchase_categories;

CREATE POLICY IF NOT EXISTS "Users can manage their own large purchase categories"
  ON user_large_purchase_categories FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_mobile_pay_categories
DROP POLICY IF EXISTS "Allow all operations on user_mobile_pay_categories" ON user_mobile_pay_categories;

CREATE POLICY IF NOT EXISTS "Users can manage their own mobile pay categories"
  ON user_mobile_pay_categories FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_multiplier_tiers
DROP POLICY IF EXISTS "Anyone can manage user tiers" ON user_multiplier_tiers;

CREATE POLICY IF NOT EXISTS "Users can manage their own multiplier tiers"
  ON user_multiplier_tiers FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_spend_bonus_values
DROP POLICY IF EXISTS "Allow all operations for user_spend_bonus_values" ON user_spend_bonus_values;

CREATE POLICY IF NOT EXISTS "Users can manage their own spend bonus values"
  ON user_spend_bonus_values FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_welcome_bonus_settings
DROP POLICY IF EXISTS "Allow all operations for user_welcome_bonus_settings" ON user_welcome_bonus_settings;

CREATE POLICY IF NOT EXISTS "Users can manage their own welcome bonus settings"
  ON user_welcome_bonus_settings FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_welcome_bonus_value_overrides
DROP POLICY IF EXISTS "Allow all operations for user_welcome_bonus_value_overrides" ON user_welcome_bonus_value_overrides;

CREATE POLICY IF NOT EXISTS "Users can manage their own welcome bonus value overrides"
  ON user_welcome_bonus_value_overrides FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

