-- Brands Table Migration
-- Creates a proper brands table and migrates cards.brand from text to brand_id foreign key

-- ============================================================================
-- 1. Create brands table
-- ============================================================================
CREATE TABLE IF NOT EXISTS brands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read brands
CREATE POLICY "Authenticated users can read brands"
    ON brands FOR SELECT TO authenticated
    USING (true);

COMMENT ON TABLE brands IS 'Brand names for cards (e.g., Delta, Marriott, Chase). Different from issuer which is the bank.';

-- ============================================================================
-- 2. Populate brands table from existing card brand values
-- ============================================================================
INSERT INTO brands (name, slug)
SELECT DISTINCT brand, LOWER(REPLACE(REPLACE(brand, ' ', '-'), '''', ''))
FROM cards 
WHERE brand IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. Add brand_id column to cards table
-- ============================================================================
ALTER TABLE cards ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id);

-- ============================================================================
-- 4. Populate brand_id from existing brand text
-- ============================================================================
UPDATE cards c
SET brand_id = b.id
FROM brands b
WHERE c.brand = b.name;

-- ============================================================================
-- 5. Create index for brand_id lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_cards_brand_id ON cards(brand_id);

-- ============================================================================
-- 6. Update card_with_currency view to include brand_id and brand name
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
