-- Bilt Card Settings Migration
-- Adds support for:
-- 1. Per-category caps within selected_category bonuses (e.g., Grocery $25k cap, Dining no cap)
-- 2. User Bilt settings (Option 1 vs 2, housing tier, monthly spend)

-- ============================================================================
-- 1. Add cap_amount to card_cap_categories for per-category cap overrides
-- ============================================================================
ALTER TABLE card_cap_categories ADD COLUMN IF NOT EXISTS cap_amount numeric;

-- Add comment for documentation
COMMENT ON COLUMN card_cap_categories.cap_amount IS 
  'Per-category cap override. NULL = use parent cap amount or no cap. Value = override for this specific category within the selection.';

-- ============================================================================
-- 2. Create user_bilt_settings table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_bilt_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  wallet_card_id uuid NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
  bilt_option integer NOT NULL DEFAULT 1 CHECK (bilt_option IN (1, 2)),
  monthly_bilt_spend_cents integer,
  housing_tier text NOT NULL DEFAULT '1x' CHECK (housing_tier IN ('0.5x', '0.75x', '1x', '1.25x')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, wallet_card_id)
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_bilt_settings_user_id ON user_bilt_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bilt_settings_wallet_card_id ON user_bilt_settings(wallet_card_id);

-- Enable RLS
ALTER TABLE user_bilt_settings ENABLE ROW LEVEL SECURITY;

-- User table policy - users can manage their own data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own Bilt settings' AND tablename = 'user_bilt_settings'
  ) THEN
    CREATE POLICY "Users can manage their own Bilt settings"
      ON user_bilt_settings FOR ALL TO authenticated
      USING (user_id = (auth.jwt()->>'sub'))
      WITH CHECK (user_id = (auth.jwt()->>'sub'));
  END IF;
END $$;

-- ============================================================================
-- 3. Update existing Bilt Obsidian cap with per-category amounts
-- ============================================================================
-- Set Grocery to have $25,000 cap, Dining to have NULL (no cap)
UPDATE card_cap_categories 
SET cap_amount = 25000 
WHERE cap_id = '57876469-6220-47d6-88e0-98fe2d179da4' 
  AND category_id = 17; -- Grocery

-- Dining stays NULL (no cap)
UPDATE card_cap_categories 
SET cap_amount = NULL 
WHERE cap_id = '57876469-6220-47d6-88e0-98fe2d179da4' 
  AND category_id = 23; -- Dining

-- Clear the parent cap amount since we're using per-category caps
UPDATE card_caps 
SET cap_amount = NULL 
WHERE id = '57876469-6220-47d6-88e0-98fe2d179da4';

-- ============================================================================
-- 4. Add selected_category caps for Bilt Blue and Bilt Palladium
-- ============================================================================
-- Bilt Blue: 3x Dining/Grocery choice
INSERT INTO card_caps (id, card_id, cap_type, elevated_rate, cap_amount, cap_period, post_cap_rate, notes)
VALUES (
  gen_random_uuid(),
  'c423369c-d3b4-4dce-8e99-dea6f6541ae9', -- Bilt Blue
  'selected_category',
  3, -- 3x rate
  NULL, -- per-category caps
  'year',
  1, -- post-cap rate 1x
  'Choose 3x Dining (no cap) or 3x Grocery ($25k cap)'
);

-- Get the cap_id we just created and add categories
WITH new_cap AS (
  SELECT id FROM card_caps 
  WHERE card_id = 'c423369c-d3b4-4dce-8e99-dea6f6541ae9' 
    AND cap_type = 'selected_category'
  ORDER BY created_at DESC LIMIT 1
)
INSERT INTO card_cap_categories (cap_id, category_id, cap_amount)
SELECT new_cap.id, category_id, cap_amount
FROM new_cap, (VALUES (23, NULL::numeric), (17, 25000::numeric)) AS cats(category_id, cap_amount);

-- Bilt Palladium: 3x Dining/Grocery choice
INSERT INTO card_caps (id, card_id, cap_type, elevated_rate, cap_amount, cap_period, post_cap_rate, notes)
VALUES (
  gen_random_uuid(),
  '9111b9bd-e075-4769-909c-0fe839642323', -- Bilt Palladium
  'selected_category',
  3, -- 3x rate
  NULL, -- per-category caps
  'year',
  2, -- post-cap rate 2x (Palladium base is 2x)
  'Choose 3x Dining (no cap) or 3x Grocery ($25k cap)'
);

-- Get the cap_id we just created and add categories
WITH new_cap AS (
  SELECT id FROM card_caps 
  WHERE card_id = '9111b9bd-e075-4769-909c-0fe839642323' 
    AND cap_type = 'selected_category'
  ORDER BY created_at DESC LIMIT 1
)
INSERT INTO card_cap_categories (cap_id, category_id, cap_amount)
SELECT new_cap.id, category_id, cap_amount
FROM new_cap, (VALUES (23, NULL::numeric), (17, 25000::numeric)) AS cats(category_id, cap_amount);

-- ============================================================================
-- 5. Add housing earning rules for Bilt cards (Rent and Mortgage)
-- These are base rates - actual rate comes from user's housing tier setting
-- ============================================================================
-- Bilt Blue: 1x on Rent and Mortgage (user tier overrides)
INSERT INTO card_earning_rules (card_id, category_id, rate, booking_method, has_cap, notes)
VALUES 
  ('c423369c-d3b4-4dce-8e99-dea6f6541ae9', 37, 1, 'any', false, 'Base housing rate - actual rate from user tier setting'),
  ('c423369c-d3b4-4dce-8e99-dea6f6541ae9', 59, 1, 'any', false, 'Base housing rate - actual rate from user tier setting')
ON CONFLICT DO NOTHING;

-- Bilt Obsidian: 1x on Rent and Mortgage (user tier overrides)
INSERT INTO card_earning_rules (card_id, category_id, rate, booking_method, has_cap, notes)
VALUES 
  ('dd591bf9-f1d5-45c2-8943-8590429e533c', 37, 1, 'any', false, 'Base housing rate - actual rate from user tier setting'),
  ('dd591bf9-f1d5-45c2-8943-8590429e533c', 59, 1, 'any', false, 'Base housing rate - actual rate from user tier setting')
ON CONFLICT DO NOTHING;

-- Bilt Palladium: 1x on Rent and Mortgage (user tier overrides - note: even 2x base card uses 1x base for housing)
INSERT INTO card_earning_rules (card_id, category_id, rate, booking_method, has_cap, notes)
VALUES 
  ('9111b9bd-e075-4769-909c-0fe839642323', 37, 1, 'any', false, 'Base housing rate - actual rate from user tier setting'),
  ('9111b9bd-e075-4769-909c-0fe839642323', 59, 1, 'any', false, 'Base housing rate - actual rate from user tier setting')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. Add 2x Travel earning rules for Bilt Blue (Obsidian already has All Travel)
-- ============================================================================
-- Bilt Blue needs 2x on Flights, Hotels, Rental Car
INSERT INTO card_earning_rules (card_id, category_id, rate, booking_method, has_cap)
VALUES 
  ('c423369c-d3b4-4dce-8e99-dea6f6541ae9', 18, 2, 'any', false), -- Flights
  ('c423369c-d3b4-4dce-8e99-dea6f6541ae9', 19, 2, 'any', false), -- Hotels
  ('c423369c-d3b4-4dce-8e99-dea6f6541ae9', 20, 2, 'any', false)  -- Rental Car
ON CONFLICT DO NOTHING;

-- Bilt Palladium: 2x on All Travel (inherits from default 2x, but add explicit rule)
INSERT INTO card_earning_rules (card_id, category_id, rate, booking_method, has_cap)
VALUES 
  ('9111b9bd-e075-4769-909c-0fe839642323', 21, 2, 'any', false) -- All Travel
ON CONFLICT DO NOTHING;
