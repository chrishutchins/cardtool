-- Fix base_value_cents for currencies added in 20260111000002_points_balances.sql
-- These were incorrectly stored as 100x the intended value (e.g., 130 instead of 1.3)

-- Only fix the specific currencies that were added with wrong values
-- (NOT touching any existing currencies that had correct values before)

UPDATE reward_currencies SET base_value_cents = base_value_cents / 100.0
WHERE code IN (
    -- New transferable points I added
    'ROVE', 'BREX', 'RAMP',
    -- New cash back I added
    'TAEK',
    -- New hotels I added
    'CHOICE', 'IPREF', 'ACCOR', 'LHW', 'BW', 'RAD',
    -- New airlines I added
    'AVIOS', 'JL', 'CX', 'QF', 'AM', 'VN', 'KE', 'A3', 'AI', 'NH', 
    'AV', 'BR', 'LH', 'SQ', 'SK', 'TP', 'TG', 'TK', 'EK', 'EY', 'HU', 'VS'
);

-- Move Qatar (QR) balances to AVIOS before deleting Qatar
-- Qatar Privilege Club miles should be tracked under the combined AVIOS program
UPDATE user_point_balances 
SET currency_id = (SELECT id FROM reward_currencies WHERE code = 'AVIOS')
WHERE currency_id = (SELECT id FROM reward_currencies WHERE code = 'QR');

-- Also move any history records
UPDATE user_point_balance_history 
SET currency_id = (SELECT id FROM reward_currencies WHERE code = 'AVIOS')
WHERE currency_id = (SELECT id FROM reward_currencies WHERE code = 'QR');

-- Delete Qatar currency (it was added by mistake - should use AVIOS)
DELETE FROM reward_currencies WHERE code = 'QR';

-- ============================================
-- Add Ramp transfer partners
-- ============================================

-- Helper function to get currency ID by code
CREATE OR REPLACE FUNCTION get_currency_id(p_code text) RETURNS uuid AS $$
    SELECT id FROM reward_currencies WHERE code = p_code;
$$ LANGUAGE SQL;

-- Ramp transfers (1.5:1 ratio except Emirates 2:1)
INSERT INTO currency_transfer_partners (source_currency_id, destination_currency_id, source_units, destination_units, transfer_timing)
SELECT get_currency_id('RAMP'), get_currency_id(dest_code), src, dest, timing
FROM (VALUES
    ('MB', 3, 2, 'Instant'),
    ('WYND', 3, 2, 'Instant'),
    ('AVIOS', 3, 2, 'Instant'),
    ('FB', 3, 2, 'Instant'),
    ('AM', 3, 2, 'Instant'),
    ('AV', 3, 2, 'Instant'),
    ('EK', 2, 1, 'Instant'),
    ('EY', 3, 2, 'Instant'),
    ('QF', 3, 2, 'Instant'),
    ('TP', 3, 2, 'Instant')
) AS t(dest_code, src, dest, timing)
ON CONFLICT (source_currency_id, destination_currency_id) DO UPDATE SET 
    source_units = EXCLUDED.source_units,
    destination_units = EXCLUDED.destination_units,
    transfer_timing = EXCLUDED.transfer_timing;

-- Clean up helper function
DROP FUNCTION IF EXISTS get_currency_id(text);
