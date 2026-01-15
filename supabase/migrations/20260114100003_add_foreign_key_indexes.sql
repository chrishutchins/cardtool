-- Add indexes for unindexed foreign keys to improve JOIN and CASCADE performance
-- These are safe to add and will help as data grows

-- card_spend_bonuses
CREATE INDEX IF NOT EXISTS idx_card_spend_bonuses_currency_id ON card_spend_bonuses(currency_id);

-- card_welcome_bonuses
CREATE INDEX IF NOT EXISTS idx_card_welcome_bonuses_currency_id ON card_welcome_bonuses(currency_id);

-- credit_account_wallet_links
CREATE INDEX IF NOT EXISTS idx_credit_account_wallet_links_wallet_card_id ON credit_account_wallet_links(wallet_card_id);

-- credit_scores
CREATE INDEX IF NOT EXISTS idx_credit_scores_snapshot_id ON credit_scores(snapshot_id);

-- earning_categories (self-referential)
CREATE INDEX IF NOT EXISTS idx_earning_categories_parent_id ON earning_categories(parent_category_id);

-- earning_multiplier_cards
CREATE INDEX IF NOT EXISTS idx_earning_multiplier_cards_card_id ON earning_multiplier_cards(card_id);

-- earning_multiplier_currencies
CREATE INDEX IF NOT EXISTS idx_earning_multiplier_currencies_currency_id ON earning_multiplier_currencies(currency_id);

-- user_card_debit_pay
CREATE INDEX IF NOT EXISTS idx_user_card_debit_pay_wallet_card_id ON user_card_debit_pay(wallet_card_id);

-- user_card_perks_values
CREATE INDEX IF NOT EXISTS idx_user_card_perks_values_wallet_card_id ON user_card_perks_values(wallet_card_id);

-- user_card_selections
CREATE INDEX IF NOT EXISTS idx_user_card_selections_category_id ON user_card_selections(selected_category_id);

-- user_category_spend
CREATE INDEX IF NOT EXISTS idx_user_category_spend_category_id ON user_category_spend(category_id);

-- user_compare_categories
CREATE INDEX IF NOT EXISTS idx_user_compare_categories_category_id ON user_compare_categories(category_id);

-- user_compare_evaluation_cards
CREATE INDEX IF NOT EXISTS idx_user_compare_evaluation_cards_card_id ON user_compare_evaluation_cards(card_id);

-- user_currency_values
CREATE INDEX IF NOT EXISTS idx_user_currency_values_currency_id ON user_currency_values(currency_id);

-- user_inventory
CREATE INDEX IF NOT EXISTS idx_user_inventory_source_credit_usage_id ON user_inventory(source_credit_usage_id);

-- user_large_purchase_categories
CREATE INDEX IF NOT EXISTS idx_user_large_purchase_categories_category_id ON user_large_purchase_categories(category_id);

-- user_mobile_pay_categories
CREATE INDEX IF NOT EXISTS idx_user_mobile_pay_categories_category_id ON user_mobile_pay_categories(category_id);

-- user_multiplier_tiers (two foreign keys)
CREATE INDEX IF NOT EXISTS idx_user_multiplier_tiers_program_id ON user_multiplier_tiers(program_id);
CREATE INDEX IF NOT EXISTS idx_user_multiplier_tiers_tier_id ON user_multiplier_tiers(tier_id);

-- user_paypal_categories
CREATE INDEX IF NOT EXISTS idx_user_paypal_categories_category_id ON user_paypal_categories(category_id);

-- user_plaid_sync_state
CREATE INDEX IF NOT EXISTS idx_user_plaid_sync_state_plaid_item_id ON user_plaid_sync_state(plaid_item_id);

-- user_plaid_transactions
CREATE INDEX IF NOT EXISTS idx_user_plaid_transactions_matched_rule_id ON user_plaid_transactions(matched_rule_id);

-- user_point_value_settings
CREATE INDEX IF NOT EXISTS idx_user_point_value_settings_template_id ON user_point_value_settings(selected_template_id);

-- user_spend_bonus_values
CREATE INDEX IF NOT EXISTS idx_user_spend_bonus_values_spend_bonus_id ON user_spend_bonus_values(spend_bonus_id);

-- user_spend_bonuses
CREATE INDEX IF NOT EXISTS idx_user_spend_bonuses_currency_id ON user_spend_bonuses(currency_id);

-- user_tracked_currencies
CREATE INDEX IF NOT EXISTS idx_user_tracked_currencies_currency_id ON user_tracked_currencies(currency_id);

-- user_travel_booking_preferences
CREATE INDEX IF NOT EXISTS idx_user_travel_booking_preferences_issuer_id ON user_travel_booking_preferences(portal_issuer_id);

-- user_wallets
CREATE INDEX IF NOT EXISTS idx_user_wallets_product_changed_to_id ON user_wallets(product_changed_to_id);

-- user_welcome_bonus_settings
CREATE INDEX IF NOT EXISTS idx_user_welcome_bonus_settings_card_id ON user_welcome_bonus_settings(card_id);

-- user_welcome_bonus_value_overrides
CREATE INDEX IF NOT EXISTS idx_user_welcome_bonus_value_overrides_bonus_id ON user_welcome_bonus_value_overrides(welcome_bonus_id);

-- user_welcome_bonuses
CREATE INDEX IF NOT EXISTS idx_user_welcome_bonuses_currency_id ON user_welcome_bonuses(currency_id);
