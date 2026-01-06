-- Seed application rules for major issuers
-- These rules are used to track velocity and limit restrictions for credit card applications

-- Get issuer IDs (we'll use subqueries to reference them)
-- Amex Rules
INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '1/5', '1 Amex card every 5 days', 1, 'both', 5, 'days', false, 'all', false, 1
FROM issuers WHERE slug = 'amex';

INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '2/90', '2 Amex cards every 90 days', 2, 'both', 90, 'days', false, 'all', false, 2
FROM issuers WHERE slug = 'amex';

INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'limit', 'Credit Card Limit', '5 Amex credit cards maximum', 5, 'both', NULL, NULL, false, 'credit', false, 3
FROM issuers WHERE slug = 'amex';

INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'limit', 'Charge Card Limit', '10 Amex charge cards maximum', 10, 'both', NULL, NULL, false, 'charge', false, 4
FROM issuers WHERE slug = 'amex';

-- Bank of America Rules
INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '2/2', '2 BoA cards every 2 months', 2, 'both', 2, 'months', false, 'all', false, 1
FROM issuers WHERE slug = 'bank-of-america';

INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '3/12', '3 BoA cards every 12 months', 3, 'both', 12, 'months', false, 'all', false, 2
FROM issuers WHERE slug = 'bank-of-america';

INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '4/24', '4 BoA cards every 24 months', 4, 'both', 24, 'months', false, 'all', false, 3
FROM issuers WHERE slug = 'bank-of-america';

INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '3/12 (no banking)', '3 cards from any issuer in 12 months (without deposit account, personal only)', 3, 'personal', 12, 'months', true, 'all', false, 4
FROM issuers WHERE slug = 'bank-of-america';

INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '7/12 (w/ banking)', '7 cards from any issuer in 12 months (with deposit account, personal only)', 7, 'personal', 12, 'months', true, 'all', true, 5
FROM issuers WHERE slug = 'bank-of-america';

-- Capital One Rules
INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '1/6', '1 Capital One card every 6 months', 1, 'both', 6, 'months', false, 'all', false, 1
FROM issuers WHERE slug = 'capital-one';

INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'limit', 'Biz Charge Card Limit', '1 Capital One business charge card maximum', 1, 'business', NULL, NULL, false, 'charge', false, 2
FROM issuers WHERE slug = 'capital-one';

-- Citi Rules
INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '1/8', '1 Citi card every 8 days', 1, 'both', 8, 'days', false, 'all', false, 1
FROM issuers WHERE slug = 'citi';

INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '2/65', '2 Citi cards every 65 days', 2, 'both', 65, 'days', false, 'all', false, 2
FROM issuers WHERE slug = 'citi';

INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '1/95 (business)', '1 Citi business card every 95 days', 1, 'business', 95, 'days', false, 'all', false, 3
FROM issuers WHERE slug = 'citi';

-- Chase Rules
INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '5/24', '5 cards from any issuer in 24 months (personal only)', 5, 'personal', 24, 'months', true, 'all', false, 1
FROM issuers WHERE slug = 'chase';

INSERT INTO application_rules (issuer_id, rule_type, name, description, card_limit, card_type, time_window, time_unit, counts_all_issuers, charge_type, requires_banking, display_order)
SELECT id, 'velocity', '2/30', '2 Chase cards every 30 days', 2, 'both', 30, 'days', false, 'all', false, 2
FROM issuers WHERE slug = 'chase';

