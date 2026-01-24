-- Wallet Page Enhancements Migration
-- Features: search_aliases, annual_fee_override, notes, network field, wholesale_club_networks, user_card_selections per-wallet, user-submitted cards

-- ============================================================================
-- 0. User-submitted cards columns
-- ============================================================================
ALTER TABLE cards ADD COLUMN IF NOT EXISTS created_by_user_id text DEFAULT NULL;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS original_name text DEFAULT NULL;

COMMENT ON COLUMN cards.created_by_user_id IS 'Clerk user ID who created this card (null for system cards)';
COMMENT ON COLUMN cards.is_approved IS 'Whether the card is approved for all users (false = only visible to creator)';
COMMENT ON COLUMN cards.original_name IS 'Original name before admin edits (for preserving user custom names)';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_cards_created_by_user ON cards(created_by_user_id) WHERE created_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_is_approved ON cards(is_approved) WHERE is_approved = false;

-- ============================================================================
-- 1. Add search_aliases to cards table
-- ============================================================================
ALTER TABLE cards ADD COLUMN IF NOT EXISTS search_aliases text[] DEFAULT NULL;

COMMENT ON COLUMN cards.search_aliases IS 'Array of search terms/aliases for this card (e.g., csr, reserve for Sapphire Reserve)';

-- ============================================================================
-- 2. Add annual_fee_override and notes to user_wallets
-- ============================================================================
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS annual_fee_override integer DEFAULT NULL;
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;

COMMENT ON COLUMN user_wallets.annual_fee_override IS 'User override for annual fee (in dollars), null uses card default';
COMMENT ON COLUMN user_wallets.notes IS 'User notes for this card';

-- ============================================================================
-- 3. Add network enum and columns
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE card_network AS ENUM ('visa', 'mastercard', 'amex', 'discover');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE cards ADD COLUMN IF NOT EXISTS network card_network DEFAULT NULL;
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS network_override card_network DEFAULT NULL;

COMMENT ON COLUMN cards.network IS 'Card network (Visa, Mastercard, Amex, Discover). NULL for cards like Capital One where it varies.';
COMMENT ON COLUMN user_wallets.network_override IS 'User override for network when card default is null or incorrect';

-- ============================================================================
-- 4. Add wholesale_club_networks to user_feature_flags
-- ============================================================================
ALTER TABLE user_feature_flags ADD COLUMN IF NOT EXISTS wholesale_club_networks text[] DEFAULT NULL;

COMMENT ON COLUMN user_feature_flags.wholesale_club_networks IS 'Networks accepted at wholesale clubs (visa, mastercard, amex, discover). NULL = all accepted.';

-- ============================================================================
-- 5. Add wallet_card_id to user_card_selections for per-card category selections
-- ============================================================================
ALTER TABLE user_card_selections ADD COLUMN IF NOT EXISTS wallet_card_id uuid DEFAULT NULL;

-- Add foreign key constraint
ALTER TABLE user_card_selections 
    DROP CONSTRAINT IF EXISTS user_card_selections_wallet_card_id_fkey;
ALTER TABLE user_card_selections 
    ADD CONSTRAINT user_card_selections_wallet_card_id_fkey 
    FOREIGN KEY (wallet_card_id) REFERENCES user_wallets(id) ON DELETE CASCADE;

-- Drop old unique constraint and add new one that includes wallet_card_id
ALTER TABLE user_card_selections DROP CONSTRAINT IF EXISTS user_card_selections_user_id_cap_id_key;
ALTER TABLE user_card_selections DROP CONSTRAINT IF EXISTS user_card_selections_user_id_cap_id_wallet_card_id_key;
ALTER TABLE user_card_selections 
    ADD CONSTRAINT user_card_selections_user_id_cap_id_wallet_card_id_key 
    UNIQUE (user_id, cap_id, wallet_card_id);

COMMENT ON COLUMN user_card_selections.wallet_card_id IS 'Wallet card this selection applies to. NULL = legacy/default for all cards of this type.';

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_user_card_selections_wallet_card_id ON user_card_selections(wallet_card_id);

-- ============================================================================
-- 6. Populate network field for existing cards
-- ============================================================================

-- Amex issuer cards get Amex network
UPDATE cards SET network = 'amex'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express')
AND network IS NULL;

-- Coinbase issuer cards get Amex network
UPDATE cards SET network = 'amex'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'Coinbase')
AND network IS NULL;

-- Discover issuer cards get Discover network
UPDATE cards SET network = 'discover'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'Discover')
AND network IS NULL;

-- Chase Mastercards: Freedom Flex, IHG cards, Aeroplan, Doordash, Instacart
UPDATE cards SET network = 'mastercard'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase')
AND (
    name ILIKE '%freedom flex%'
    OR name ILIKE '%ihg%'
    OR name ILIKE '%aeroplan%'
    OR name ILIKE '%doordash%'
    OR name ILIKE '%instacart%'
)
AND network IS NULL;

-- BoA Mastercards: Spirit and all business cards (except Alaska biz which is Visa)
UPDATE cards SET network = 'mastercard'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'Bank of America')
AND (
    name ILIKE '%spirit%'
    OR (product_type = 'business' AND name NOT ILIKE '%alaska%')
)
AND network IS NULL;

-- Bilt: All Mastercard
UPDATE cards SET network = 'mastercard'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'Bilt')
AND network IS NULL;

-- Citi: All Mastercard except Costco cards (which are Visa)
UPDATE cards SET network = 'mastercard'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'Citi')
AND name NOT ILIKE '%costco%'
AND network IS NULL;

-- Apple Card: Mastercard
UPDATE cards SET network = 'mastercard'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'Apple')
AND network IS NULL;

-- Barclays: All Mastercard except Wyndham (which is Visa)
UPDATE cards SET network = 'mastercard'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'Barclays')
AND name NOT ILIKE '%wyndham%'
AND network IS NULL;

-- Sam's Club: Mastercard
UPDATE cards SET network = 'mastercard'
WHERE name ILIKE '%sam%s club%' OR name ILIKE '%sams club%'
AND network IS NULL;

-- Gemini: Mastercard
UPDATE cards SET network = 'mastercard'
WHERE name ILIKE '%gemini%'
AND network IS NULL;

-- PayPal: Mastercard
UPDATE cards SET network = 'mastercard'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'PayPal')
AND network IS NULL;

-- FNBO Amtrak: Mastercard
UPDATE cards SET network = 'mastercard'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'FNBO')
AND name ILIKE '%amtrak%'
AND network IS NULL;

-- Wells Fargo Attune: Mastercard
UPDATE cards SET network = 'mastercard'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'Wells Fargo')
AND name ILIKE '%attune%'
AND network IS NULL;

-- Capital One Venture X cards: Visa (the rest stay NULL for user to specify)
UPDATE cards SET network = 'visa'
WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'Capital One')
AND name ILIKE '%venture x%'
AND network IS NULL;

-- Everything else (non-Capital One) that doesn't have a network: Visa
UPDATE cards SET network = 'visa'
WHERE issuer_id NOT IN (SELECT id FROM issuers WHERE name = 'Capital One')
AND network IS NULL;

-- ============================================================================
-- 7. Populate search_aliases for common cards
-- ============================================================================

-- Chase cards
UPDATE cards SET search_aliases = ARRAY['csr', 'reserve'] WHERE name = 'Sapphire Reserve' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');
UPDATE cards SET search_aliases = ARRAY['csp'] WHERE name = 'Sapphire Preferred' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');
UPDATE cards SET search_aliases = ARRAY['cip', 'ink preferred', 'ink pref'] WHERE name ILIKE '%ink%preferred%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');
UPDATE cards SET search_aliases = ARRAY['cic', 'ink cash'] WHERE name ILIKE '%ink%cash%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');
UPDATE cards SET search_aliases = ARRAY['ciu', 'ink unlimited'] WHERE name ILIKE '%ink%unlimited%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');
UPDATE cards SET search_aliases = ARRAY['cff', 'ff', 'flex'] WHERE name ILIKE '%freedom flex%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');
UPDATE cards SET search_aliases = ARRAY['cfu', 'fu'] WHERE name ILIKE '%freedom unlimited%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');
UPDATE cards SET search_aliases = ARRAY['cf'] WHERE name = 'Freedom' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');
UPDATE cards SET search_aliases = ARRAY['amazon', 'prime', 'prime visa'] WHERE name ILIKE '%amazon%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');

-- Amex cards
UPDATE cards SET search_aliases = ARRAY['plat', 'platinum'] WHERE name = 'Platinum Card' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express');
UPDATE cards SET search_aliases = ARRAY['gold', 'amex gold'] WHERE name = 'Gold Card' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express');
UPDATE cards SET search_aliases = ARRAY['green', 'amex green'] WHERE name = 'Green Card' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express');
UPDATE cards SET search_aliases = ARRAY['biz plat', 'business platinum'] WHERE name ILIKE '%business platinum%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express');
UPDATE cards SET search_aliases = ARRAY['biz gold', 'business gold'] WHERE name ILIKE '%business gold%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express');
UPDATE cards SET search_aliases = ARRAY['bbp', 'blue business plus'] WHERE name ILIKE '%blue business%plus%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express');
UPDATE cards SET search_aliases = ARRAY['bcp', 'blue cash preferred'] WHERE name ILIKE '%blue cash preferred%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express');
UPDATE cards SET search_aliases = ARRAY['bce', 'blue cash everyday'] WHERE name ILIKE '%blue cash everyday%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express');
UPDATE cards SET search_aliases = ARRAY['aspire', 'hilton aspire'] WHERE name ILIKE '%hilton%aspire%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express');
UPDATE cards SET search_aliases = ARRAY['surpass', 'hilton surpass'] WHERE name ILIKE '%hilton%surpass%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express');
UPDATE cards SET search_aliases = ARRAY['brilliant', 'bonvoy brilliant'] WHERE name ILIKE '%bonvoy%brilliant%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express');

-- Capital One cards
UPDATE cards SET search_aliases = ARRAY['vx', 'venture x'] WHERE name ILIKE '%venture x%' AND name NOT ILIKE '%business%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Capital One');
UPDATE cards SET search_aliases = ARRAY['vxb', 'venture x business', 'venture x biz'] WHERE name ILIKE '%venture x%business%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Capital One');
UPDATE cards SET search_aliases = ARRAY['qs', 'quicksilver'] WHERE name ILIKE '%quicksilver%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Capital One');
UPDATE cards SET search_aliases = ARRAY['savor'] WHERE name ILIKE '%savor%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Capital One');

-- Citi cards
UPDATE cards SET search_aliases = ARRAY['dc', 'double cash', 'citi dc'] WHERE name ILIKE '%double cash%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Citi');
UPDATE cards SET search_aliases = ARRAY['premier', 'citi premier', 'strata premier'] WHERE name ILIKE '%strata premier%' OR (name ILIKE '%premier%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Citi'));
UPDATE cards SET search_aliases = ARRAY['ccc', 'custom cash'] WHERE name ILIKE '%custom cash%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Citi');
UPDATE cards SET search_aliases = ARRAY['costco'] WHERE name ILIKE '%costco%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Citi');

-- US Bank cards
UPDATE cards SET search_aliases = ARRAY['ar', 'altitude reserve'] WHERE name ILIKE '%altitude reserve%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'US Bank');
UPDATE cards SET search_aliases = ARRAY['ac', 'altitude connect'] WHERE name ILIKE '%altitude connect%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'US Bank');
UPDATE cards SET search_aliases = ARRAY['cash+', 'cash plus'] WHERE name ILIKE '%cash+%' OR name ILIKE '%cash plus%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'US Bank');

-- BoA cards
UPDATE cards SET search_aliases = ARRAY['pcr', 'premium rewards'] WHERE name ILIKE '%premium rewards%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Bank of America');
UPDATE cards SET search_aliases = ARRAY['ccr', 'customized cash'] WHERE name ILIKE '%customized cash%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Bank of America');
UPDATE cards SET search_aliases = ARRAY['ucr', 'unlimited cash'] WHERE name ILIKE '%unlimited cash%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Bank of America');

-- Bilt
UPDATE cards SET search_aliases = ARRAY['bilt', 'rent card'] WHERE issuer_id IN (SELECT id FROM issuers WHERE name = 'Bilt');

-- Wells Fargo
UPDATE cards SET search_aliases = ARRAY['autograph', 'wf autograph'] WHERE name ILIKE '%autograph%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Wells Fargo');
UPDATE cards SET search_aliases = ARRAY['active cash', 'wf active cash'] WHERE name ILIKE '%active cash%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Wells Fargo');

-- Hotel cards
UPDATE cards SET search_aliases = ARRAY['hyatt', 'woh'] WHERE name ILIKE '%hyatt%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');
UPDATE cards SET search_aliases = ARRAY['ihg'] WHERE name ILIKE '%ihg%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');
UPDATE cards SET search_aliases = ARRAY['marriott', 'boundless'] WHERE name ILIKE '%boundless%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');

-- Airline cards
UPDATE cards SET search_aliases = ARRAY['united', 'mpx'] WHERE name ILIKE '%united%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');
UPDATE cards SET search_aliases = ARRAY['southwest', 'sw'] WHERE name ILIKE '%southwest%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'Chase');
UPDATE cards SET search_aliases = ARRAY['delta'] WHERE name ILIKE '%delta%' AND issuer_id IN (SELECT id FROM issuers WHERE name = 'American Express');
UPDATE cards SET search_aliases = ARRAY['aa', 'aadvantage'] WHERE name ILIKE '%aadvantage%' OR name ILIKE '%american airlines%';
UPDATE cards SET search_aliases = ARRAY['alaska', 'as'] WHERE name ILIKE '%alaska%';

-- ============================================================================
-- 8. Update card_with_currency view to include new columns
-- ============================================================================
CREATE OR REPLACE VIEW card_with_currency AS
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
    i.name as issuer_name,
    pc.name as primary_currency_name,
    sc.name as secondary_currency_name
FROM cards c
LEFT JOIN issuers i ON c.issuer_id = i.id
LEFT JOIN reward_currencies pc ON c.primary_currency_id = pc.id
LEFT JOIN reward_currencies sc ON c.secondary_currency_id = sc.id;
