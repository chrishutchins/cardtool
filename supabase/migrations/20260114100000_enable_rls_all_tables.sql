-- Migration: Enable RLS on all public tables
-- This ensures all tables are protected. Service role bypasses RLS.

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

-- User tables (direct user_id)
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_category_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_currency_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_card_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_multiplier_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_travel_booking_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_card_perks_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mobile_pay_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_card_debit_pay ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_compare_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_compare_evaluation_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_large_purchase_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_point_value_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_paypal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_welcome_bonus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_welcome_bonus_value_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_spend_bonus_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bonus_display_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_spend_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_welcome_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plaid_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plaid_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_point_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_point_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sync_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tracked_currencies ENABLE ROW LEVEL SECURITY;

-- User tables via wallet/credit relationships
ALTER TABLE user_credit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credit_usage_transactions ENABLE ROW LEVEL SECURITY;

-- Credit report tables (user_id based)
ALTER TABLE credit_report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_account_wallet_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_inquiry_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_inquiry_group_members ENABLE ROW LEVEL SECURITY;

-- Reference tables (read-only for authenticated)
ALTER TABLE issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE earning_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_earning_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_caps ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_cap_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE earning_multiplier_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE earning_multiplier_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE earning_multiplier_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE earning_multiplier_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_value_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_currency_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_welcome_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_spend_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_matching_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_exclusion_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_transfer_partners ENABLE ROW LEVEL SECURITY;

-- Service role only tables (RLS enabled, no policies = blocked except for service role)
ALTER TABLE stripe_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_configs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE POLICIES FOR USER TABLES (direct user_id) - tables that may be missing policies
-- ============================================================================

-- user_point_balances
DROP POLICY IF EXISTS "Users can manage their own point balances" ON user_point_balances;
CREATE POLICY "Users can manage their own point balances"
  ON user_point_balances FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_point_balance_history
DROP POLICY IF EXISTS "Users can manage their own balance history" ON user_point_balance_history;
CREATE POLICY "Users can manage their own balance history"
  ON user_point_balance_history FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_sync_tokens
DROP POLICY IF EXISTS "Users can manage their own sync tokens" ON user_sync_tokens;
CREATE POLICY "Users can manage their own sync tokens"
  ON user_sync_tokens FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- user_tracked_currencies
DROP POLICY IF EXISTS "Users can manage their own tracked currencies" ON user_tracked_currencies;
CREATE POLICY "Users can manage their own tracked currencies"
  ON user_tracked_currencies FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- ============================================================================
-- CREATE POLICIES FOR CREDIT REPORT TABLES
-- ============================================================================

-- credit_report_snapshots
DROP POLICY IF EXISTS "Users can manage their own credit report snapshots" ON credit_report_snapshots;
CREATE POLICY "Users can manage their own credit report snapshots"
  ON credit_report_snapshots FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- credit_scores
DROP POLICY IF EXISTS "Users can manage their own credit scores" ON credit_scores;
CREATE POLICY "Users can manage their own credit scores"
  ON credit_scores FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- credit_accounts
DROP POLICY IF EXISTS "Users can manage their own credit accounts" ON credit_accounts;
CREATE POLICY "Users can manage their own credit accounts"
  ON credit_accounts FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- credit_inquiries
DROP POLICY IF EXISTS "Users can manage their own credit inquiries" ON credit_inquiries;
CREATE POLICY "Users can manage their own credit inquiries"
  ON credit_inquiries FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- credit_account_wallet_links
DROP POLICY IF EXISTS "Users can manage their own credit account wallet links" ON credit_account_wallet_links;
CREATE POLICY "Users can manage their own credit account wallet links"
  ON credit_account_wallet_links FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- credit_inquiry_groups
DROP POLICY IF EXISTS "Users can manage their own credit inquiry groups" ON credit_inquiry_groups;
CREATE POLICY "Users can manage their own credit inquiry groups"
  ON credit_inquiry_groups FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- credit_inquiry_group_members (via group)
DROP POLICY IF EXISTS "Users can manage their own inquiry group members" ON credit_inquiry_group_members;
CREATE POLICY "Users can manage their own inquiry group members"
  ON credit_inquiry_group_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM credit_inquiry_groups
      WHERE credit_inquiry_groups.id = credit_inquiry_group_members.group_id
      AND credit_inquiry_groups.user_id = (auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_inquiry_groups
      WHERE credit_inquiry_groups.id = credit_inquiry_group_members.group_id
      AND credit_inquiry_groups.user_id = (auth.jwt()->>'sub')
    )
  );

-- ============================================================================
-- CREATE POLICIES FOR REFERENCE TABLES (read-only for authenticated)
-- ============================================================================

-- issuers
DROP POLICY IF EXISTS "Authenticated users can read issuers" ON issuers;
CREATE POLICY "Authenticated users can read issuers"
  ON issuers FOR SELECT TO authenticated
  USING (true);

-- reward_currencies
DROP POLICY IF EXISTS "Authenticated users can read reward currencies" ON reward_currencies;
CREATE POLICY "Authenticated users can read reward currencies"
  ON reward_currencies FOR SELECT TO authenticated
  USING (true);

-- earning_categories
DROP POLICY IF EXISTS "Authenticated users can read earning categories" ON earning_categories;
CREATE POLICY "Authenticated users can read earning categories"
  ON earning_categories FOR SELECT TO authenticated
  USING (true);

-- cards
DROP POLICY IF EXISTS "Authenticated users can read cards" ON cards;
CREATE POLICY "Authenticated users can read cards"
  ON cards FOR SELECT TO authenticated
  USING (true);

-- card_earning_rules
DROP POLICY IF EXISTS "Authenticated users can read card earning rules" ON card_earning_rules;
CREATE POLICY "Authenticated users can read card earning rules"
  ON card_earning_rules FOR SELECT TO authenticated
  USING (true);

-- spending_defaults
DROP POLICY IF EXISTS "Authenticated users can read spending defaults" ON spending_defaults;
CREATE POLICY "Authenticated users can read spending defaults"
  ON spending_defaults FOR SELECT TO authenticated
  USING (true);

-- card_caps
DROP POLICY IF EXISTS "Authenticated users can read card caps" ON card_caps;
CREATE POLICY "Authenticated users can read card caps"
  ON card_caps FOR SELECT TO authenticated
  USING (true);

-- card_cap_categories
DROP POLICY IF EXISTS "Authenticated users can read card cap categories" ON card_cap_categories;
CREATE POLICY "Authenticated users can read card cap categories"
  ON card_cap_categories FOR SELECT TO authenticated
  USING (true);

-- earning_multiplier_programs
DROP POLICY IF EXISTS "Authenticated users can read earning multiplier programs" ON earning_multiplier_programs;
CREATE POLICY "Authenticated users can read earning multiplier programs"
  ON earning_multiplier_programs FOR SELECT TO authenticated
  USING (true);

-- earning_multiplier_tiers
DROP POLICY IF EXISTS "Authenticated users can read earning multiplier tiers" ON earning_multiplier_tiers;
CREATE POLICY "Authenticated users can read earning multiplier tiers"
  ON earning_multiplier_tiers FOR SELECT TO authenticated
  USING (true);

-- earning_multiplier_currencies
DROP POLICY IF EXISTS "Authenticated users can read earning multiplier currencies" ON earning_multiplier_currencies;
CREATE POLICY "Authenticated users can read earning multiplier currencies"
  ON earning_multiplier_currencies FOR SELECT TO authenticated
  USING (true);

-- earning_multiplier_cards
DROP POLICY IF EXISTS "Authenticated users can read earning multiplier cards" ON earning_multiplier_cards;
CREATE POLICY "Authenticated users can read earning multiplier cards"
  ON earning_multiplier_cards FOR SELECT TO authenticated
  USING (true);

-- point_value_templates
DROP POLICY IF EXISTS "Authenticated users can read point value templates" ON point_value_templates;
CREATE POLICY "Authenticated users can read point value templates"
  ON point_value_templates FOR SELECT TO authenticated
  USING (true);

-- template_currency_values
DROP POLICY IF EXISTS "Authenticated users can read template currency values" ON template_currency_values;
CREATE POLICY "Authenticated users can read template currency values"
  ON template_currency_values FOR SELECT TO authenticated
  USING (true);

-- card_welcome_bonuses
DROP POLICY IF EXISTS "Authenticated users can read card welcome bonuses" ON card_welcome_bonuses;
CREATE POLICY "Authenticated users can read card welcome bonuses"
  ON card_welcome_bonuses FOR SELECT TO authenticated
  USING (true);

-- card_spend_bonuses
DROP POLICY IF EXISTS "Authenticated users can read card spend bonuses" ON card_spend_bonuses;
CREATE POLICY "Authenticated users can read card spend bonuses"
  ON card_spend_bonuses FOR SELECT TO authenticated
  USING (true);

-- card_credits
DROP POLICY IF EXISTS "Authenticated users can read card credits" ON card_credits;
CREATE POLICY "Authenticated users can read card credits"
  ON card_credits FOR SELECT TO authenticated
  USING (true);

-- transaction_exclusion_patterns
DROP POLICY IF EXISTS "Authenticated users can read transaction exclusion patterns" ON transaction_exclusion_patterns;
CREATE POLICY "Authenticated users can read transaction exclusion patterns"
  ON transaction_exclusion_patterns FOR SELECT TO authenticated
  USING (true);

-- currency_transfer_partners
DROP POLICY IF EXISTS "Authenticated users can read currency transfer partners" ON currency_transfer_partners;
CREATE POLICY "Authenticated users can read currency transfer partners"
  ON currency_transfer_partners FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- SERVICE ROLE ONLY TABLES (no policies = blocked for non-service-role)
-- stripe_members and site_configs have RLS enabled but no policies
-- This means only service role can access them
-- ============================================================================
