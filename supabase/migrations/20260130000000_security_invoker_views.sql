-- ============================================================================
-- Fix Supabase linter: views must use SECURITY INVOKER (not DEFINER)
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
-- ============================================================================

-- user_upcoming_payments: run with querying user's permissions so RLS applies
CREATE OR REPLACE VIEW user_upcoming_payments
WITH (security_invoker = true)
AS
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

-- card_with_currency: run with querying user's permissions so RLS applies
CREATE OR REPLACE VIEW card_with_currency
WITH (security_invoker = true)
AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.annual_fee,
    c.default_earn_rate,
    c.default_perks_value,
    c.is_active,
    c.exclude_from_recommendations,
    c.product_type,
    c.created_by_user_id,
    c.is_approved,
    c.original_name,
    c.network,
    c.brand,
    c.brand_id,
    b.name as brand_name,
    i.name as issuer_name,
    pc.name as primary_currency_name,
    sc.name as secondary_currency_name
FROM cards c
LEFT JOIN issuers i ON c.issuer_id = i.id
LEFT JOIN brands b ON c.brand_id = b.id
LEFT JOIN reward_currencies pc ON c.primary_currency_id = pc.id
LEFT JOIN reward_currencies sc ON c.secondary_currency_id = sc.id;
