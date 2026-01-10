-- Points Balance Sheet Migration
-- Adds currency metadata, balance tracking, and transfer partners

-- ============================================
-- PART 1: Update reward_currencies table
-- ============================================

ALTER TABLE reward_currencies
ADD COLUMN IF NOT EXISTS program_name text,
ADD COLUMN IF NOT EXISTS alliance text CHECK (alliance IN ('star_alliance', 'oneworld', 'skyteam')),
ADD COLUMN IF NOT EXISTS expiration_policy text,
ADD COLUMN IF NOT EXISTS is_transferable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS transfer_increment integer DEFAULT 1000;

-- ============================================
-- PART 2: Create user_point_balances table
-- ============================================

CREATE TABLE IF NOT EXISTS user_point_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    currency_id uuid NOT NULL REFERENCES reward_currencies(id) ON DELETE CASCADE,
    player_number integer NOT NULL DEFAULT 1,
    balance numeric NOT NULL DEFAULT 0,
    expiration_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, currency_id, player_number)
);

CREATE INDEX IF NOT EXISTS idx_user_point_balances_user_id ON user_point_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_point_balances_currency_id ON user_point_balances(currency_id);

-- ============================================
-- PART 3: Create user_point_balance_history table
-- ============================================

CREATE TABLE IF NOT EXISTS user_point_balance_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    currency_id uuid NOT NULL REFERENCES reward_currencies(id) ON DELETE CASCADE,
    player_number integer NOT NULL,
    balance numeric NOT NULL,
    recorded_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_point_balance_history_user_id ON user_point_balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_point_balance_history_currency_id ON user_point_balance_history(currency_id);
CREATE INDEX IF NOT EXISTS idx_user_point_balance_history_recorded_at ON user_point_balance_history(recorded_at);

-- ============================================
-- PART 4: Create currency_transfer_partners table
-- ============================================

CREATE TABLE IF NOT EXISTS currency_transfer_partners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_currency_id uuid NOT NULL REFERENCES reward_currencies(id) ON DELETE CASCADE,
    destination_currency_id uuid NOT NULL REFERENCES reward_currencies(id) ON DELETE CASCADE,
    source_units integer NOT NULL DEFAULT 1,
    destination_units integer NOT NULL DEFAULT 1,
    transfer_timing text,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(source_currency_id, destination_currency_id)
);

CREATE INDEX IF NOT EXISTS idx_currency_transfer_partners_source ON currency_transfer_partners(source_currency_id);
CREATE INDEX IF NOT EXISTS idx_currency_transfer_partners_destination ON currency_transfer_partners(destination_currency_id);

-- ============================================
-- PART 5: Update existing currencies
-- ============================================

-- Transferable Points
UPDATE reward_currencies SET name = 'Amex', program_name = 'Membership Rewards', is_transferable = true, transfer_increment = 1000 WHERE code = 'MR';
UPDATE reward_currencies SET name = 'Chase', program_name = 'Ultimate Rewards', is_transferable = true, transfer_increment = 1000 WHERE code = 'UR';
UPDATE reward_currencies SET name = 'Capital One', program_name = 'Miles', is_transferable = true, transfer_increment = 1000 WHERE code = 'C1';
UPDATE reward_currencies SET name = 'Citi', program_name = 'ThankYou Points', is_transferable = true, transfer_increment = 1000 WHERE code = 'TYP';
UPDATE reward_currencies SET name = 'Bilt', program_name = 'Bilt Rewards', is_transferable = true, transfer_increment = 1000 WHERE code = 'BILT';
UPDATE reward_currencies SET name = 'US Bank', program_name = 'Altitude Rewards', is_transferable = true, transfer_increment = 1000 WHERE code = 'USB';
UPDATE reward_currencies SET name = 'Wells Fargo', program_name = 'Rewards', is_transferable = true, transfer_increment = 1 WHERE code = 'WF';
UPDATE reward_currencies SET name = 'Bank of America', program_name = 'Rewards' WHERE code = 'BOA';

-- Hotels (Marriott is transferable)
UPDATE reward_currencies SET name = 'Marriott', program_name = 'Bonvoy', is_transferable = true, transfer_increment = 3000 WHERE code = 'MB';
UPDATE reward_currencies SET name = 'Hilton', program_name = 'Honors' WHERE code = 'HH';
UPDATE reward_currencies SET name = 'Hyatt', program_name = 'World of Hyatt' WHERE code = 'WOH';
UPDATE reward_currencies SET program_name = 'One Rewards' WHERE code = 'IHG';
UPDATE reward_currencies SET name = 'Wyndham', program_name = 'Wyndham Rewards' WHERE code = 'WYND';

-- Airlines
UPDATE reward_currencies SET name = 'Air Canada', program_name = 'Aeroplan', alliance = 'star_alliance' WHERE code = 'AC';
UPDATE reward_currencies SET name = 'Alaska', program_name = 'Mileage Plan', alliance = 'oneworld' WHERE code = 'AS';
UPDATE reward_currencies SET name = 'American', program_name = 'AAdvantage', alliance = 'oneworld' WHERE code = 'AA';
UPDATE reward_currencies SET name = 'Delta', program_name = 'SkyMiles', alliance = 'skyteam' WHERE code = 'DL';
UPDATE reward_currencies SET name = 'Air France-KLM', program_name = 'Flying Blue', alliance = 'skyteam' WHERE code = 'FB';
UPDATE reward_currencies SET name = 'JetBlue', program_name = 'TrueBlue' WHERE code = 'B6';
UPDATE reward_currencies SET name = 'Southwest', program_name = 'Rapid Rewards' WHERE code = 'SW';
UPDATE reward_currencies SET name = 'United', program_name = 'MileagePlus', alliance = 'star_alliance' WHERE code = 'UA';

-- ============================================
-- PART 6: Insert new currencies
-- ============================================

-- Transferable Points
INSERT INTO reward_currencies (code, name, program_name, currency_type, is_transferable, transfer_increment, base_value_cents)
VALUES 
    ('ROVE', 'Rove', 'Rove Miles', 'transferable_points', true, 1000, 150),
    ('BREX', 'Brex', 'Brex Rewards', 'transferable_points', true, 1000, 100),
    ('RAMP', 'Ramp', 'Ramp Rewards', 'transferable_points', true, 1000, 100)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    program_name = EXCLUDED.program_name,
    is_transferable = EXCLUDED.is_transferable,
    transfer_increment = EXCLUDED.transfer_increment;

-- Cash Back
INSERT INTO reward_currencies (code, name, program_name, currency_type, base_value_cents)
VALUES ('TAEK', 'Taekus', 'Taekus Rewards', 'cash_back', 100)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, program_name = EXCLUDED.program_name;

-- Hotels
INSERT INTO reward_currencies (code, name, program_name, currency_type, base_value_cents)
VALUES 
    ('CHOICE', 'Choice', 'Choice Privileges', 'hotel_points', 60),
    ('IPREF', 'Preferred Hotels', 'iPrefer', 'hotel_points', 70),
    ('ACCOR', 'Accor', 'Live Limitless', 'hotel_points', 200),
    ('LHW', 'Leading Hotels', 'Leaders Club', 'hotel_points', 50),
    ('BW', 'Best Western', 'Best Western Rewards', 'hotel_points', 60),
    ('RAD', 'Radisson', 'Radisson Rewards', 'hotel_points', 40)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, program_name = EXCLUDED.program_name;

-- Airlines
INSERT INTO reward_currencies (code, name, program_name, currency_type, alliance, base_value_cents)
VALUES 
    -- Oneworld
    ('AVIOS', 'Avios', 'Avios', 'airline_miles', 'oneworld', 130),
    ('JL', 'JAL', 'Mileage Bank', 'airline_miles', 'oneworld', 140),
    ('CX', 'Cathay Pacific', 'Asia Miles', 'airline_miles', 'oneworld', 140),
    ('QF', 'Qantas', 'Frequent Flyer', 'airline_miles', 'oneworld', 140),
    -- SkyTeam
    ('AM', 'Aeromexico', 'Club Premier', 'airline_miles', 'skyteam', 130),
    ('VN', 'Vietnam Airlines', 'Lotus Miles', 'airline_miles', 'skyteam', 100),
    ('KE', 'Korean Air', 'SkyPass', 'airline_miles', 'skyteam', 150),
    -- Star Alliance
    ('A3', 'Aegean', 'Miles+Bonus', 'airline_miles', 'star_alliance', 130),
    ('AI', 'Air India', 'Maharaja Club', 'airline_miles', 'star_alliance', 110),
    ('NH', 'ANA', 'Mileage Club', 'airline_miles', 'star_alliance', 150),
    ('AV', 'Avianca', 'LifeMiles', 'airline_miles', 'star_alliance', 140),
    ('BR', 'EVA Air', 'Infinity MileageLands', 'airline_miles', 'star_alliance', 130),
    ('LH', 'Lufthansa', 'Miles & More', 'airline_miles', 'star_alliance', 100),
    ('SQ', 'Singapore', 'KrisFlyer', 'airline_miles', 'star_alliance', 140),
    ('SK', 'SAS', 'EuroBonus', 'airline_miles', 'star_alliance', 110),
    ('TP', 'TAP Portugal', 'Miles&Go', 'airline_miles', 'star_alliance', 100),
    ('TG', 'Thai Airways', 'Royal Orchid Plus', 'airline_miles', 'star_alliance', 120),
    ('TK', 'Turkish', 'Miles&Smiles', 'airline_miles', 'star_alliance', 130),
    -- Non-alliance
    ('EK', 'Emirates', 'Skywards', 'airline_miles', NULL, 100),
    ('EY', 'Etihad', 'Guest', 'airline_miles', NULL, 100),
    ('HU', 'Hainan', 'Fortune Wings', 'airline_miles', NULL, 80),
    ('VS', 'Virgin Atlantic', 'Flying Club', 'airline_miles', 'skyteam', 140)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    program_name = EXCLUDED.program_name,
    alliance = EXCLUDED.alliance;

-- ============================================
-- PART 7: Insert transfer partners
-- ============================================

-- Helper function to get currency ID by code
CREATE OR REPLACE FUNCTION get_currency_id(p_code text) RETURNS uuid AS $$
    SELECT id FROM reward_currencies WHERE code = p_code;
$$ LANGUAGE SQL;

-- Chase UR transfers
INSERT INTO currency_transfer_partners (source_currency_id, destination_currency_id, source_units, destination_units, transfer_timing)
SELECT get_currency_id('UR'), get_currency_id(dest_code), src, dest, timing
FROM (VALUES
    ('WOH', 1, 1, 'Instant'),
    ('UA', 1, 1, 'Instant'),
    ('SW', 1, 1, 'Instant'),
    ('AVIOS', 1, 1, 'Instant'),
    ('FB', 1, 1, 'Instant'),
    ('AC', 1, 1, 'Instant'),
    ('SQ', 1, 1, '24hr'),
    ('EK', 1, 1, 'Instant'),
    ('EY', 1, 1, 'Instant'),
    ('B6', 1, 1, 'Instant'),
    ('VS', 1, 1, 'Instant'),
    ('IHG', 1, 1, 'Instant'),
    ('MB', 1, 1, 'Instant')
) AS t(dest_code, src, dest, timing)
ON CONFLICT (source_currency_id, destination_currency_id) DO UPDATE SET 
    source_units = EXCLUDED.source_units,
    destination_units = EXCLUDED.destination_units,
    transfer_timing = EXCLUDED.transfer_timing;

-- Amex MR transfers
INSERT INTO currency_transfer_partners (source_currency_id, destination_currency_id, source_units, destination_units, transfer_timing, notes)
SELECT get_currency_id('MR'), get_currency_id(dest_code), src, dest, timing, note
FROM (VALUES
    ('DL', 1, 1, 'Instant', '0.6% fee, $99 cap'),
    ('B6', 5, 4, 'Instant', '0.6% fee, $99 cap'),
    ('AVIOS', 1, 1, 'Instant', NULL),
    ('FB', 1, 1, 'Instant', NULL),
    ('AM', 5, 8, 'Instant', NULL),
    ('AC', 1, 1, 'Instant', NULL),
    ('AV', 1, 1, 'Instant', NULL),
    ('NH', 1, 1, '48hr', NULL),
    ('SQ', 1, 1, '24hr', NULL),
    ('EK', 5, 4, 'Instant', NULL),
    ('EY', 1, 1, 'Instant', NULL),
    ('VS', 1, 1, 'Instant', NULL),
    ('HH', 2, 1, 'Instant', NULL),
    ('MB', 1, 1, 'Instant', NULL),
    ('CHOICE', 1, 1, 'Instant', NULL)
) AS t(dest_code, src, dest, timing, note)
ON CONFLICT (source_currency_id, destination_currency_id) DO UPDATE SET 
    source_units = EXCLUDED.source_units,
    destination_units = EXCLUDED.destination_units,
    transfer_timing = EXCLUDED.transfer_timing,
    notes = EXCLUDED.notes;

-- Capital One transfers
INSERT INTO currency_transfer_partners (source_currency_id, destination_currency_id, source_units, destination_units, transfer_timing)
SELECT get_currency_id('C1'), get_currency_id(dest_code), src, dest, timing
FROM (VALUES
    ('CHOICE', 1, 1, 'Instant'),
    ('ACCOR', 2, 1, 'Instant'),
    ('IPREF', 2, 1, 'Instant'),
    ('WYND', 1, 1, 'Instant'),
    ('AVIOS', 1, 1, 'Instant'),
    ('JL', 4, 3, '1-2 Days'),
    ('CX', 1, 1, 'Instant'),
    ('QF', 1, 1, '24hr'),
    ('AV', 1, 1, 'Instant'),
    ('BR', 4, 3, '24hr'),
    ('SQ', 1, 1, '24hr'),
    ('EK', 4, 3, 'Instant'),
    ('EY', 1, 1, 'Instant'),
    ('VS', 1, 1, 'Instant'),
    ('B6', 5, 3, 'Instant')
) AS t(dest_code, src, dest, timing)
ON CONFLICT (source_currency_id, destination_currency_id) DO UPDATE SET 
    source_units = EXCLUDED.source_units,
    destination_units = EXCLUDED.destination_units,
    transfer_timing = EXCLUDED.transfer_timing;

-- Citi ThankYou Points transfers
INSERT INTO currency_transfer_partners (source_currency_id, destination_currency_id, source_units, destination_units, transfer_timing)
SELECT get_currency_id('TYP'), get_currency_id(dest_code), src, dest, timing
FROM (VALUES
    ('CHOICE', 2, 1, 'Instant'),
    ('ACCOR', 2, 1, 'Instant'),
    ('IPREF', 4, 1, 'Instant'),
    ('WYND', 1, 1, 'Instant'),
    ('LHW', 5, 1, 'Instant'),
    ('AA', 1, 1, 'Instant'),
    ('AVIOS', 1, 1, 'Instant'),
    ('CX', 1, 1, 'Instant'),
    ('QF', 1, 1, '24hr'),
    ('FB', 1, 1, 'Instant'),
    ('AM', 1, 1, 'Instant'),
    ('AC', 1, 1, 'Instant'),
    ('AV', 1, 1, 'Instant'),
    ('BR', 1, 1, '24hr'),
    ('UA', 1, 1, 'Instant'),
    ('SQ', 1, 1, '24hr'),
    ('TG', 1, 1, '3-7 Days'),
    ('TK', 1, 1, 'Instant'),
    ('EK', 5, 4, 'Instant'),
    ('EY', 1, 1, 'Instant'),
    ('VS', 1, 1, 'Instant'),
    ('B6', 1, 1, 'Instant'),
    ('SW', 1, 1, 'Instant')
) AS t(dest_code, src, dest, timing)
ON CONFLICT (source_currency_id, destination_currency_id) DO UPDATE SET 
    source_units = EXCLUDED.source_units,
    destination_units = EXCLUDED.destination_units,
    transfer_timing = EXCLUDED.transfer_timing;

-- Bilt transfers
INSERT INTO currency_transfer_partners (source_currency_id, destination_currency_id, source_units, destination_units, transfer_timing)
SELECT get_currency_id('BILT'), get_currency_id(dest_code), src, dest, timing
FROM (VALUES
    ('WOH', 1, 1, 'Instant'),
    ('ACCOR', 3, 2, 'Instant'),
    ('IHG', 1, 1, 'Instant'),
    ('AS', 1, 1, '24hr'),
    ('AVIOS', 1, 1, 'Instant'),
    ('JL', 1, 1, '1-2 Days'),
    ('CX', 1, 1, 'Instant'),
    ('QF', 1, 1, '24hr'),
    ('FB', 1, 1, 'Instant'),
    ('AM', 1, 1, 'Instant'),
    ('AC', 1, 1, 'Instant'),
    ('AV', 1, 1, 'Instant'),
    ('TP', 1, 1, 'Instant'),
    ('TK', 1, 1, 'Instant'),
    ('EK', 1, 1, 'Instant'),
    ('EY', 1, 1, 'Instant'),
    ('VS', 1, 1, 'Instant'),
    ('SQ', 1, 1, '24hr')
) AS t(dest_code, src, dest, timing)
ON CONFLICT (source_currency_id, destination_currency_id) DO UPDATE SET 
    source_units = EXCLUDED.source_units,
    destination_units = EXCLUDED.destination_units,
    transfer_timing = EXCLUDED.transfer_timing;

-- Wells Fargo transfers
INSERT INTO currency_transfer_partners (source_currency_id, destination_currency_id, source_units, destination_units, transfer_timing)
SELECT get_currency_id('WF'), get_currency_id(dest_code), src, dest, timing
FROM (VALUES
    ('CHOICE', 2, 1, 'Instant'),
    ('AVIOS', 1, 1, 'Instant'),
    ('FB', 1, 1, 'Instant'),
    ('AM', 1, 1, 'Instant'),
    ('AV', 1, 1, 'Instant'),
    ('AI', 1, 1, 'Instant'),
    ('LH', 1, 1, 'Instant'),
    ('EY', 1, 1, 'Instant'),
    ('VS', 1, 1, 'Instant')
) AS t(dest_code, src, dest, timing)
ON CONFLICT (source_currency_id, destination_currency_id) DO UPDATE SET 
    source_units = EXCLUDED.source_units,
    destination_units = EXCLUDED.destination_units,
    transfer_timing = EXCLUDED.transfer_timing;

-- Rove Miles transfers
INSERT INTO currency_transfer_partners (source_currency_id, destination_currency_id, source_units, destination_units, transfer_timing)
SELECT get_currency_id('ROVE'), get_currency_id(dest_code), src, dest, timing
FROM (VALUES
    ('ACCOR', 3, 2, 'Instant'),
    ('AVIOS', 1, 1, 'Instant'),
    ('CX', 1, 1, 'Instant'),
    ('FB', 1, 1, 'Instant'),
    ('VN', 1, 1, 'Instant'),
    ('TG', 1, 1, '3-7 Days'),
    ('TK', 1, 1, 'Instant'),
    ('HU', 1, 1, 'Instant')
) AS t(dest_code, src, dest, timing)
ON CONFLICT (source_currency_id, destination_currency_id) DO UPDATE SET 
    source_units = EXCLUDED.source_units,
    destination_units = EXCLUDED.destination_units,
    transfer_timing = EXCLUDED.transfer_timing;

-- Marriott Bonvoy transfers
INSERT INTO currency_transfer_partners (source_currency_id, destination_currency_id, source_units, destination_units, transfer_timing)
SELECT get_currency_id('MB'), get_currency_id(dest_code), src, dest, timing
FROM (VALUES
    ('AS', 3, 1, '24hr'),
    ('AA', 3, 1, 'Instant'),
    ('AVIOS', 3, 1, 'Instant'),
    ('JL', 3, 1, '1-2 Days'),
    ('CX', 3, 1, 'Instant'),
    ('QF', 3, 1, '24hr'),
    ('FB', 3, 1, 'Instant'),
    ('AM', 3, 1, 'Instant'),
    ('DL', 3, 1, 'Instant'),
    ('AC', 3, 1, 'Instant'),
    ('AV', 3, 1, 'Instant'),
    ('UA', 30, 11, 'Instant'),
    ('AI', 1, 1, 'Instant'),
    ('NH', 3, 1, '48hr'),
    ('SQ', 3, 1, '24hr'),
    ('TP', 3, 1, 'Instant'),
    ('TG', 3, 1, '3-7 Days'),
    ('TK', 3, 1, 'Instant'),
    ('EK', 3, 1, 'Instant'),
    ('EY', 3, 1, 'Instant'),
    ('HU', 3, 1, 'Instant'),
    ('SW', 3, 1, 'Instant'),
    ('VS', 3, 1, 'Instant')
) AS t(dest_code, src, dest, timing)
ON CONFLICT (source_currency_id, destination_currency_id) DO UPDATE SET 
    source_units = EXCLUDED.source_units,
    destination_units = EXCLUDED.destination_units,
    transfer_timing = EXCLUDED.transfer_timing;

-- Brex transfers
INSERT INTO currency_transfer_partners (source_currency_id, destination_currency_id, source_units, destination_units, transfer_timing)
SELECT get_currency_id('BREX'), get_currency_id(dest_code), src, dest, timing
FROM (VALUES
    ('CX', 3, 2, 'Instant'),
    ('FB', 3, 2, 'Instant'),
    ('AM', 3, 2, 'Instant'),
    ('AV', 3, 2, 'Instant'),
    ('SQ', 3, 2, '24hr'),
    ('EK', 3, 2, 'Instant')
) AS t(dest_code, src, dest, timing)
ON CONFLICT (source_currency_id, destination_currency_id) DO UPDATE SET 
    source_units = EXCLUDED.source_units,
    destination_units = EXCLUDED.destination_units,
    transfer_timing = EXCLUDED.transfer_timing;

-- Clean up helper function
DROP FUNCTION IF EXISTS get_currency_id(text);
