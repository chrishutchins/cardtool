-- DEMO ACCOUNT DUPLICATION SCRIPT
-- Source: user_37o9nGH41MRtpG6ha598X6G4BuG (your real account)
-- Target: user_388z6WGBzjLXQN9Yz3Vr2QBdcQ0 (demo account)
--
-- Run this in Supabase SQL Editor
-- After running, you can delete unwanted cards from the demo account

DO $$
DECLARE
  source_user_id TEXT := 'user_37o9nGH41MRtpG6ha598X6G4BuG';
  target_user_id TEXT := 'user_388z6WGBzjLXQN9Yz3Vr2QBdcQ0';
BEGIN

-- ============================================================
-- STEP 1: Create temporary mapping tables
-- ============================================================

CREATE TEMP TABLE wallet_mapping (
  old_id UUID,
  new_id UUID,
  card_id UUID
);

CREATE TEMP TABLE linked_account_mapping (
  old_id UUID,
  new_id UUID
);

CREATE TEMP TABLE credit_usage_mapping (
  old_id UUID,
  new_id UUID
);

CREATE TEMP TABLE transaction_mapping (
  old_id UUID,
  new_id UUID
);

CREATE TEMP TABLE inventory_mapping (
  old_id UUID,
  new_id UUID
);

-- ============================================================
-- STEP 2: Simple tables (no FK dependencies on user tables)
-- ============================================================

-- user_feature_flags
INSERT INTO user_feature_flags (user_id, debit_pay_enabled, account_linking_enabled, credit_tracking_enabled, onboarding_completed)
SELECT target_user_id, debit_pay_enabled, account_linking_enabled, credit_tracking_enabled, onboarding_completed
FROM user_feature_flags WHERE user_id = source_user_id
ON CONFLICT (user_id) DO NOTHING;

-- user_players
INSERT INTO user_players (user_id, player_number, description)
SELECT target_user_id, player_number, description
FROM user_players WHERE user_id = source_user_id;

-- user_category_spend
INSERT INTO user_category_spend (user_id, category_id, annual_spend_cents, large_purchase_spend_cents)
SELECT target_user_id, category_id, annual_spend_cents, large_purchase_spend_cents
FROM user_category_spend WHERE user_id = source_user_id;

-- user_currency_values
INSERT INTO user_currency_values (user_id, currency_id, value_cents)
SELECT target_user_id, currency_id, value_cents
FROM user_currency_values WHERE user_id = source_user_id;

-- user_point_value_settings
INSERT INTO user_point_value_settings (user_id, selected_template_id)
SELECT target_user_id, selected_template_id
FROM user_point_value_settings WHERE user_id = source_user_id;

-- user_card_selections
INSERT INTO user_card_selections (user_id, cap_id, selected_category_id)
SELECT target_user_id, cap_id, selected_category_id
FROM user_card_selections WHERE user_id = source_user_id;

-- user_multiplier_tiers
INSERT INTO user_multiplier_tiers (user_id, program_id, tier_id)
SELECT target_user_id, program_id, tier_id
FROM user_multiplier_tiers WHERE user_id = source_user_id;

-- user_travel_booking_preferences
INSERT INTO user_travel_booking_preferences (user_id, category_slug, preference_type, brand_name, portal_issuer_id)
SELECT target_user_id, category_slug, preference_type, brand_name, portal_issuer_id
FROM user_travel_booking_preferences WHERE user_id = source_user_id;

-- user_mobile_pay_categories
INSERT INTO user_mobile_pay_categories (user_id, category_id)
SELECT target_user_id, category_id
FROM user_mobile_pay_categories WHERE user_id = source_user_id;

-- user_paypal_categories
INSERT INTO user_paypal_categories (user_id, category_id)
SELECT target_user_id, category_id
FROM user_paypal_categories WHERE user_id = source_user_id;

-- user_large_purchase_categories
INSERT INTO user_large_purchase_categories (user_id, category_id)
SELECT target_user_id, category_id
FROM user_large_purchase_categories WHERE user_id = source_user_id;

-- user_bonus_display_settings
INSERT INTO user_bonus_display_settings (user_id, include_welcome_bonuses, include_spend_bonuses, include_debit_pay, show_available_credit)
SELECT target_user_id, include_welcome_bonuses, include_spend_bonuses, include_debit_pay, show_available_credit
FROM user_bonus_display_settings WHERE user_id = source_user_id;

-- user_tracked_currencies
INSERT INTO user_tracked_currencies (user_id, currency_id, is_archived)
SELECT target_user_id, currency_id, is_archived
FROM user_tracked_currencies WHERE user_id = source_user_id;

-- user_point_balances
INSERT INTO user_point_balances (user_id, currency_id, player_number, balance, expiration_date, notes, last_update_source)
SELECT target_user_id, currency_id, player_number, balance, expiration_date, notes, last_update_source
FROM user_point_balances WHERE user_id = source_user_id;

-- ============================================================
-- STEP 3: user_wallets (need ID mapping for FK references)
-- ============================================================

INSERT INTO wallet_mapping (old_id, new_id, card_id)
SELECT id, gen_random_uuid(), card_id
FROM user_wallets WHERE user_id = source_user_id;

INSERT INTO user_wallets (id, user_id, card_id, custom_name, added_at, approval_date, player_number, closed_date, closed_reason, product_changed_to_id, statement_close_day, payment_due_day, manual_balance_cents, manual_credit_limit_cents)
SELECT 
  wm.new_id,
  target_user_id,
  uw.card_id,
  uw.custom_name,
  uw.added_at,
  uw.approval_date,
  uw.player_number,
  uw.closed_date,
  uw.closed_reason,
  -- Map product_changed_to_id if it references another wallet card
  (SELECT wm2.new_id FROM wallet_mapping wm2 WHERE wm2.old_id = uw.product_changed_to_id),
  uw.statement_close_day,
  uw.payment_due_day,
  uw.manual_balance_cents,
  uw.manual_credit_limit_cents
FROM user_wallets uw
JOIN wallet_mapping wm ON uw.id = wm.old_id;

-- ============================================================
-- STEP 4: Tables that reference user_wallets.id
-- ============================================================

-- user_card_perks_values
INSERT INTO user_card_perks_values (user_id, wallet_card_id, perks_value, perk_name, notes)
SELECT target_user_id, wm.new_id, perks_value, perk_name, notes
FROM user_card_perks_values ucpv
JOIN wallet_mapping wm ON ucpv.wallet_card_id = wm.old_id
WHERE ucpv.user_id = source_user_id;

-- user_card_debit_pay
INSERT INTO user_card_debit_pay (user_id, wallet_card_id, debit_pay_percent)
SELECT target_user_id, wm.new_id, debit_pay_percent
FROM user_card_debit_pay ucdp
JOIN wallet_mapping wm ON ucdp.wallet_card_id = wm.old_id
WHERE ucdp.user_id = source_user_id;

-- user_credit_settings
INSERT INTO user_credit_settings (user_wallet_id, credit_id, is_hidden, notes)
SELECT wm.new_id, credit_id, is_hidden, notes
FROM user_credit_settings ucs
JOIN wallet_mapping wm ON ucs.user_wallet_id = wm.old_id;

-- user_welcome_bonuses
INSERT INTO user_welcome_bonuses (user_id, wallet_card_id, is_active, component_type, spend_requirement_cents, time_period_months, points_amount, currency_id, cash_amount_cents, benefit_description, value_cents)
SELECT target_user_id, wm.new_id, is_active, component_type, spend_requirement_cents, time_period_months, points_amount, currency_id, cash_amount_cents, benefit_description, value_cents
FROM user_welcome_bonuses uwb
JOIN wallet_mapping wm ON uwb.wallet_card_id = wm.old_id
WHERE uwb.user_id = source_user_id;

-- user_spend_bonuses
INSERT INTO user_spend_bonuses (user_id, wallet_card_id, is_active, name, bonus_type, spend_threshold_cents, reward_type, points_amount, currency_id, cash_amount_cents, benefit_description, value_cents, period, per_spend_cents, elite_unit_name, unit_value_cents, cap_amount, cap_period)
SELECT target_user_id, wm.new_id, is_active, name, bonus_type, spend_threshold_cents, reward_type, points_amount, currency_id, cash_amount_cents, benefit_description, value_cents, period, per_spend_cents, elite_unit_name, unit_value_cents, cap_amount, cap_period
FROM user_spend_bonuses usb
JOIN wallet_mapping wm ON usb.wallet_card_id = wm.old_id
WHERE usb.user_id = source_user_id;

-- ============================================================
-- STEP 5: Linked accounts (with placeholder Plaid item)
-- ============================================================

-- Create a placeholder Plaid item for demo user
-- Uses an invalid access_token so cron will skip it (API call will fail)
INSERT INTO user_plaid_items (id, user_id, plaid_item_id, access_token, institution_name)
VALUES (
  gen_random_uuid(),
  target_user_id,
  'demo_placeholder_item',
  'DEMO_INVALID_TOKEN_DO_NOT_SYNC',  -- Invalid token = cron API calls will fail gracefully
  'Demo Accounts (Read-Only)'
);

-- Get the placeholder item ID we just created
CREATE TEMP TABLE demo_plaid_item AS
SELECT id FROM user_plaid_items 
WHERE user_id = target_user_id AND plaid_item_id = 'demo_placeholder_item';

INSERT INTO linked_account_mapping (old_id, new_id)
SELECT id, gen_random_uuid()
FROM user_linked_accounts WHERE user_id = source_user_id;

INSERT INTO user_linked_accounts (id, user_id, plaid_item_id, plaid_account_id, name, official_name, type, subtype, mask, current_balance, available_balance, credit_limit, manual_credit_limit, iso_currency_code, last_balance_update, wallet_card_id)
SELECT 
  lam.new_id,
  target_user_id,
  (SELECT id FROM demo_plaid_item),  -- Point to placeholder item
  ula.plaid_account_id || '_demo',   -- Make unique
  ula.name,
  ula.official_name,
  ula.type,
  ula.subtype,
  NULL,  -- Hide account mask for demo
  ula.current_balance,
  ula.available_balance,
  ula.credit_limit,
  ula.manual_credit_limit,
  ula.iso_currency_code,
  ula.last_balance_update,
  wm.new_id  -- Map to new wallet card ID
FROM user_linked_accounts ula
JOIN linked_account_mapping lam ON ula.id = lam.old_id
LEFT JOIN wallet_mapping wm ON ula.wallet_card_id = wm.old_id
WHERE ula.user_id = source_user_id;

DROP TABLE demo_plaid_item;

-- ============================================================
-- STEP 6: Transactions (snapshot copy)
-- ============================================================

INSERT INTO transaction_mapping (old_id, new_id)
SELECT id, gen_random_uuid()
FROM user_plaid_transactions WHERE user_id = source_user_id;

INSERT INTO user_plaid_transactions (id, user_id, linked_account_id, plaid_transaction_id, name, original_description, amount_cents, date, authorized_date, pending, category, merchant_name, matched_credit_id, matched_rule_id, dismissed, is_clawback)
SELECT 
  tm.new_id,
  target_user_id,
  lam.new_id,  -- Map to new linked account ID
  upt.plaid_transaction_id || '_demo',  -- Make unique to avoid conflicts
  upt.name,
  upt.original_description,
  upt.amount_cents,
  upt.date,
  upt.authorized_date,
  upt.pending,
  upt.category,
  upt.merchant_name,
  upt.matched_credit_id,
  upt.matched_rule_id,
  upt.dismissed,
  upt.is_clawback
FROM user_plaid_transactions upt
JOIN transaction_mapping tm ON upt.id = tm.old_id
JOIN linked_account_mapping lam ON upt.linked_account_id = lam.old_id
WHERE upt.user_id = source_user_id;

-- ============================================================
-- STEP 7: Credit usage (need ID mapping)
-- ============================================================

INSERT INTO credit_usage_mapping (old_id, new_id)
SELECT id, gen_random_uuid()
FROM user_credit_usage ucu
WHERE ucu.user_wallet_id IN (SELECT old_id FROM wallet_mapping);

INSERT INTO user_credit_usage (id, user_wallet_id, credit_id, period_start, period_end, slot_number, amount_used, used_at, notes, auto_detected, is_clawback, perceived_value_cents)
SELECT 
  cum.new_id,
  wm.new_id,  -- Map to new wallet ID
  ucu.credit_id,
  ucu.period_start,
  ucu.period_end,
  ucu.slot_number,
  ucu.amount_used,
  ucu.used_at,
  ucu.notes,
  ucu.auto_detected,
  ucu.is_clawback,
  ucu.perceived_value_cents
FROM user_credit_usage ucu
JOIN credit_usage_mapping cum ON ucu.id = cum.old_id
JOIN wallet_mapping wm ON ucu.user_wallet_id = wm.old_id;

-- ============================================================
-- STEP 8: Credit usage → Transaction links
-- ============================================================

INSERT INTO user_credit_usage_transactions (usage_id, transaction_id, amount_cents)
SELECT 
  cum.new_id,  -- Map to new usage ID
  tm.new_id,   -- Map to new transaction ID
  ucut.amount_cents
FROM user_credit_usage_transactions ucut
JOIN credit_usage_mapping cum ON ucut.usage_id = cum.old_id
JOIN transaction_mapping tm ON ucut.transaction_id = tm.old_id;

-- ============================================================
-- STEP 9: Inventory (if any, references credit_usage)
-- ============================================================

INSERT INTO inventory_mapping (old_id, new_id)
SELECT id, gen_random_uuid()
FROM user_inventory WHERE user_id = source_user_id;

INSERT INTO user_inventory (id, user_id, type_id, name, brand, original_value_cents, remaining_value_cents, quantity, quantity_used, expiration_date, no_expiration, code, pin, url, notes, is_used, used_at, source_credit_usage_id)
SELECT 
  im.new_id,
  target_user_id,
  ui.type_id,
  ui.name,
  ui.brand,
  ui.original_value_cents,
  ui.remaining_value_cents,
  ui.quantity,
  ui.quantity_used,
  ui.expiration_date,
  ui.no_expiration,
  ui.code,
  ui.pin,
  ui.url,
  ui.notes,
  ui.is_used,
  ui.used_at,
  cum.new_id  -- Map to new credit usage ID
FROM user_inventory ui
JOIN inventory_mapping im ON ui.id = im.old_id
LEFT JOIN credit_usage_mapping cum ON ui.source_credit_usage_id = cum.old_id
WHERE ui.user_id = source_user_id;

-- ============================================================
-- CLEANUP: Drop temporary tables
-- ============================================================

DROP TABLE wallet_mapping;
DROP TABLE linked_account_mapping;
DROP TABLE credit_usage_mapping;
DROP TABLE transaction_mapping;
DROP TABLE inventory_mapping;

RAISE NOTICE 'Demo account duplication complete!';
RAISE NOTICE 'Source: %', source_user_id;
RAISE NOTICE 'Target: %', target_user_id;

END $$;

-- ============================================================
-- VERIFICATION QUERIES (run these after to check)
-- ============================================================

-- Check wallet cards copied
-- SELECT COUNT(*) as card_count FROM user_wallets WHERE user_id = 'user_388z6WGBzjLXQN9Yz3Vr2QBdcQ0';

-- Check transactions copied
-- SELECT COUNT(*) as txn_count FROM user_plaid_transactions WHERE user_id = 'user_388z6WGBzjLXQN9Yz3Vr2QBdcQ0';

-- Check credit usage copied
-- SELECT COUNT(*) as usage_count FROM user_credit_usage ucu 
-- JOIN user_wallets uw ON ucu.user_wallet_id = uw.id 
-- WHERE uw.user_id = 'user_388z6WGBzjLXQN9Yz3Vr2QBdcQ0';
