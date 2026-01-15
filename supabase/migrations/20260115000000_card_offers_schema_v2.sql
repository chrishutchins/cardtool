-- Card Offers Schema v2
-- Fixes based on user feedback:
-- 1. Move card-level fields from offers to cards
-- 2. Change expires_at to date type to avoid timezone issues
-- 3. Add time_period_unit to bonuses for days/months
-- 4. Create separate intro_apr table (like bonuses)
-- 5. Remove description and base_rate from elevated_earnings
-- 6. Add duration_unit to elevated_earnings for days/months

-- 1. Add card-level field to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS no_foreign_transaction_fees boolean DEFAULT false;

-- 2. Drop columns from card_offers that should be card-level
ALTER TABLE card_offers DROP COLUMN IF EXISTS no_foreign_transaction_fees;
ALTER TABLE card_offers DROP COLUMN IF EXISTS perks_description;
ALTER TABLE card_offers DROP COLUMN IF EXISTS earning_description;
ALTER TABLE card_offers DROP COLUMN IF EXISTS intro_apr_months;

-- 3. Change expires_at from timestamptz to date
ALTER TABLE card_offers ALTER COLUMN expires_at TYPE date USING expires_at::date;

-- 4. Add time_period_unit to bonuses (default 'months' for existing data)
ALTER TABLE card_offer_bonuses ADD COLUMN IF NOT EXISTS time_period_unit text NOT NULL DEFAULT 'months';
ALTER TABLE card_offer_bonuses ADD CONSTRAINT check_time_period_unit CHECK (time_period_unit IN ('days', 'months'));
-- Rename column for clarity
ALTER TABLE card_offer_bonuses RENAME COLUMN time_period_months TO time_period;

-- 5. Create intro_apr table
CREATE TABLE IF NOT EXISTS card_offer_intro_apr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES card_offers(id) ON DELETE CASCADE,
  apr_type text NOT NULL DEFAULT 'purchases' CHECK (apr_type IN ('purchases', 'balance_transfers', 'both')),
  duration integer NOT NULL,
  duration_unit text NOT NULL DEFAULT 'months' CHECK (duration_unit IN ('days', 'months')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_offer_intro_apr_offer_id ON card_offer_intro_apr(offer_id);

-- Enable RLS
ALTER TABLE card_offer_intro_apr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read card offer intro APR"
  ON card_offer_intro_apr FOR SELECT TO authenticated
  USING (true);

-- 6. Modify elevated_earnings: remove description and base_rate, add duration_unit
ALTER TABLE card_offer_elevated_earnings DROP COLUMN IF EXISTS description;
ALTER TABLE card_offer_elevated_earnings DROP COLUMN IF EXISTS base_rate;
ALTER TABLE card_offer_elevated_earnings ADD COLUMN IF NOT EXISTS duration_unit text NOT NULL DEFAULT 'months';
ALTER TABLE card_offer_elevated_earnings ADD CONSTRAINT check_elevated_duration_unit CHECK (duration_unit IN ('days', 'months'));

-- Comments
COMMENT ON COLUMN card_offer_bonuses.time_period IS 'Duration for spend requirement (in time_period_unit)';
COMMENT ON COLUMN card_offer_bonuses.time_period_unit IS 'Unit for time_period: days or months';
COMMENT ON TABLE card_offer_intro_apr IS '0% intro APR offers as part of a card offer';
COMMENT ON COLUMN card_offer_intro_apr.apr_type IS 'What the intro APR applies to: purchases, balance_transfers, or both';
COMMENT ON COLUMN card_offer_elevated_earnings.duration_unit IS 'Unit for duration: days or months';
