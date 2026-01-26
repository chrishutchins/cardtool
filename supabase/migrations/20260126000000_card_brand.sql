-- Card Brand Migration
-- Adds brand column to cards table and updates card names/issuers per CSV data

-- ============================================================================
-- 1. Add brand column to cards table
-- ============================================================================
ALTER TABLE cards ADD COLUMN IF NOT EXISTS brand text DEFAULT NULL;

COMMENT ON COLUMN cards.brand IS 'Brand name for the card (e.g., Delta, Marriott, Chase). Different from issuer which is the bank.';

-- ============================================================================
-- 2. Create new issuers that don't exist yet
-- ============================================================================
INSERT INTO issuers (name, slug) 
VALUES ('Cardless', 'cardless')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO issuers (name, slug) 
VALUES ('Goldman Sachs', 'goldman-sachs')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO issuers (name, slug) 
VALUES ('Elan Financial', 'elan-financial')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO issuers (name, slug) 
VALUES ('WebBank', 'webbank')
ON CONFLICT (slug) DO NOTHING;

-- Synchrony might already exist, but ensure it does
INSERT INTO issuers (name, slug) 
VALUES ('Synchrony', 'synchrony')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 3. Update card names, issuers, and populate brand field
-- ============================================================================

-- Amex cards - set brand
UPDATE cards SET brand = 'Amazon' WHERE name = 'Amazon Business' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'amex');
UPDATE cards SET brand = 'Amazon' WHERE name = 'Amazon Business Prime' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'amex');
UPDATE cards SET brand = 'Amex' WHERE name ILIKE 'Amex%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'amex');

-- Amex Marriott cards - update name and set brand
UPDATE cards SET name = 'Marriott Bonvoy Bevy', brand = 'Marriott' WHERE name = 'Bonvoy Bevy' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'amex');
UPDATE cards SET name = 'Marriott Bonvoy Brilliant', brand = 'Marriott' WHERE name = 'Bonvoy Brilliant' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'amex');
UPDATE cards SET name = 'Marriott Bonvoy Business', brand = 'Marriott' WHERE name = 'Bonvoy Business' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'amex');

-- Amex Delta cards - set brand
UPDATE cards SET brand = 'Delta' WHERE name ILIKE 'Delta%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'amex');

-- Amex Hilton cards - update name and set brand
UPDATE cards SET name = 'Hilton Honors Aspire', brand = 'Hilton' WHERE name = 'Hilton Aspire' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'amex');
UPDATE cards SET name = 'Hilton Honors Business', brand = 'Hilton' WHERE name = 'Hilton Business' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'amex');
UPDATE cards SET name = 'Hilton Honors Card', brand = 'Hilton' WHERE name = 'Hilton Card' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'amex');
UPDATE cards SET name = 'Hilton Honors Surpass', brand = 'Hilton' WHERE name = 'Hilton Surpass' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'amex');

-- Apple Card - change issuer to Goldman Sachs and set brand
UPDATE cards SET 
    issuer_id = (SELECT id FROM issuers WHERE slug = 'goldman-sachs'),
    brand = 'Apple'
WHERE name = 'Apple Card';

-- Bank of America cards
UPDATE cards SET brand = 'Air France-KLM' WHERE name = 'Air France KLM Card' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'bank-of-america');
UPDATE cards SET name = 'Atmos Business', brand = 'Atmos' WHERE name = 'Alaska Business' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'bank-of-america');
UPDATE cards SET name = 'Atmos Ascent', brand = 'Atmos' WHERE name = 'Alaska Personal' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'bank-of-america');
UPDATE cards SET name = 'Atmos Summit', brand = 'Atmos' WHERE name = 'Alaska Summit' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'bank-of-america');
UPDATE cards SET brand = 'Allegiant' WHERE name = 'Allegiant World Mastercard' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'bank-of-america');
UPDATE cards SET brand = 'Bank of America' WHERE name ILIKE 'BoA%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'bank-of-america');

-- Barclays cards
UPDATE cards SET name = 'AAdvantage Aviator Business', brand = 'American Airlines' WHERE name = 'AA Aviator Business' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'barclays');
UPDATE cards SET name = 'AAdvantage Aviator Red', brand = 'American Airlines' WHERE name = 'AA Aviator Red' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'barclays');
UPDATE cards SET name = 'AAdvantage Aviator Silver', brand = 'American Airlines' WHERE name = 'AA Aviator Silver' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'barclays');
UPDATE cards SET brand = 'Hawaiian' WHERE name ILIKE 'Hawaiian%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'barclays');
UPDATE cards SET brand = 'JetBlue' WHERE name ILIKE 'JetBlue%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'barclays');
UPDATE cards SET brand = 'Wyndham' WHERE name ILIKE 'Wyndham%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'barclays');

-- Bilt cards - change issuer to Cardless and set brand
UPDATE cards SET 
    issuer_id = (SELECT id FROM issuers WHERE slug = 'cardless'),
    brand = 'Bilt'
WHERE name ILIKE 'Bilt%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'bilt');

-- Capital One cards
UPDATE cards SET brand = 'Capital One' WHERE name ILIKE 'Capital One%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'capital-one');
UPDATE cards SET brand = 'REI' WHERE name = 'REI Co-op Card' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'capital-one');

-- Chase cards
UPDATE cards SET brand = 'Chase' WHERE name = 'Aeroplan Card' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET name = 'Marriott Bonvoy Bold', brand = 'Marriott' WHERE name = 'Bonvoy Bold' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET name = 'Marriott Bonvoy Boundless', brand = 'Marriott' WHERE name = 'Bonvoy Boundless' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET name = 'Marriott Bonvoy Bountiful', brand = 'Marriott' WHERE name = 'Bonvoy Bountiful' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET brand = 'British Airways' WHERE name = 'British Airways Card' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET name = 'Aer Lingus Card', brand = 'Aer Lingus' WHERE name = 'Chase Aer Lingus' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET name = 'Amazon Prime', brand = 'Amazon' WHERE name = 'Chase Amazon Prime' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET name = 'Disney Premier', brand = 'Disney' WHERE name = 'Chase Disney' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET name = 'Disney Rewards', brand = 'Disney' WHERE name = 'Chase Disney Premier' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET brand = 'Chase' WHERE name ILIKE 'Chase%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase') AND brand IS NULL;
UPDATE cards SET name = 'Iberia Card', brand = 'Iberia' WHERE name = 'Chase Iberia' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET brand = 'Amazon' WHERE name = 'Chase Prime Visa' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET name = 'World of Hyatt Business', brand = 'Hyatt' WHERE name = 'Hyatt Business' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET name = 'World of Hyatt Card', brand = 'Hyatt' WHERE name = 'Hyatt Personal' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET brand = 'IHG' WHERE name ILIKE 'IHG%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET name = 'JP Morgan Reserve', brand = 'Chase' WHERE name = 'JP Morgan Reserve Card' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET name = 'Ritz-Carlton Card', brand = 'Marriott' WHERE name = 'Ritz Carlton' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET brand = 'Southwest' WHERE name ILIKE 'Southwest%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');
UPDATE cards SET brand = 'United' WHERE name ILIKE 'United%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'chase');

-- Citi cards
UPDATE cards SET name = 'AAdvantage Business', brand = 'American Airlines' WHERE name = 'AA Business' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'citi');
UPDATE cards SET name = 'AAdvantage Executive', brand = 'American Airlines' WHERE name = 'AA Executive' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'citi');
UPDATE cards SET name = 'AAdvantage Globe', brand = 'American Airlines' WHERE name = 'AA Globe' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'citi');
UPDATE cards SET name = 'AAdvantage MileUp', brand = 'American Airlines' WHERE name = 'AA MileUp' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'citi');
UPDATE cards SET name = 'AAdvantage Platinum', brand = 'American Airlines' WHERE name = 'AA Platinum' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'citi');
UPDATE cards SET brand = 'Citi' WHERE name ILIKE 'Citi%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'citi') AND name NOT ILIKE '%Costco%';
UPDATE cards SET brand = 'Costco' WHERE name ILIKE '%Costco%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'citi');

-- Coinbase card - change issuer to Cardless
UPDATE cards SET 
    issuer_id = (SELECT id FROM issuers WHERE slug = 'cardless'),
    brand = 'Coinbase'
WHERE name = 'Coinbase One';

-- Comenity cards
UPDATE cards SET brand = 'Caesars' WHERE name ILIKE 'Caesars%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'comenity');

-- Discover cards
UPDATE cards SET name = 'Discover it Cash Back', brand = 'Discover' WHERE name = 'DiscoverIt Cash Back' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'discover');
UPDATE cards SET name = 'Discover it Miles', brand = 'Discover' WHERE name = 'DiscoverIt Miles' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'discover');

-- Fidelity card - change issuer to Elan Financial
UPDATE cards SET 
    issuer_id = (SELECT id FROM issuers WHERE slug = 'elan-financial'),
    brand = 'Fidelity'
WHERE name = 'Fidelity Rewards Card';

-- FNBO cards
UPDATE cards SET brand = 'Amtrak' WHERE name ILIKE '%Amtrak%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'fnbo');

-- PayPal cards
UPDATE cards SET name = 'PayPal Debit Card', brand = 'PayPal' WHERE name = 'Paypal Debit Card';
UPDATE cards SET 
    name = 'PayPal Credit Card',
    issuer_id = (SELECT id FROM issuers WHERE slug = 'synchrony'),
    brand = 'PayPal'
WHERE name = 'Paypal Mastercard';

-- PenFed cards
UPDATE cards SET brand = 'PenFed' WHERE name ILIKE 'PenFed%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'penfed');

-- Robinhood cards
UPDATE cards SET brand = 'Robinhood' WHERE name = 'Robinhood Card' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'robinhood');

-- Sam's Club card - change issuer to Capital One
UPDATE cards SET 
    issuer_id = (SELECT id FROM issuers WHERE slug = 'capital-one'),
    brand = 'Sam''s Club'
WHERE name ILIKE 'Sam%s Club%';

-- Synchrony cards
UPDATE cards SET brand = 'Venmo' WHERE name = 'Venmo Card' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'synchrony');

-- US Bank cards
UPDATE cards SET brand = 'US Bank' WHERE name ILIKE 'US Bank%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'us-bank');

-- Verizon card - change issuer to Synchrony
UPDATE cards SET 
    issuer_id = (SELECT id FROM issuers WHERE slug = 'synchrony'),
    brand = 'Verizon'
WHERE name = 'Verizon Visa';

-- Gemini card - change issuer to WebBank (correct capitalization)
UPDATE cards SET 
    issuer_id = (SELECT id FROM issuers WHERE slug = 'webbank'),
    brand = 'Gemini'
WHERE name = 'Gemini Card';

-- Wells Fargo cards
UPDATE cards SET brand = 'Wells Fargo' WHERE name ILIKE 'Wells Fargo%' AND issuer_id IN (SELECT id FROM issuers WHERE slug = 'wells-fargo');

-- ============================================================================
-- 4. Update card_with_currency view to include brand
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
    c.brand,
    i.name as issuer_name,
    pc.name as primary_currency_name,
    sc.name as secondary_currency_name
FROM cards c
LEFT JOIN issuers i ON c.issuer_id = i.id
LEFT JOIN reward_currencies pc ON c.primary_currency_id = pc.id
LEFT JOIN reward_currencies sc ON c.secondary_currency_id = sc.id;
