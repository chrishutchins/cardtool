-- Seed initial credit matching rules
-- These patterns are case-insensitive matched against transaction names

-- Note: We need to link these to actual credit IDs in card_credits table
-- This seed uses a function to safely insert rules only for existing credits

-- Create a function to insert rules by credit name pattern matching
DO $$
DECLARE
  v_credit_id uuid;
BEGIN
  -- Google Workspace Credit (Chase)
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  JOIN cards c ON cc.card_id = c.id 
  WHERE cc.name ILIKE '%google%workspace%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'Google Workspace Credit', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Travel Credit patterns
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%travel%credit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'TRAVEL CREDIT', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- The Edit Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%edit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'THE EDIT', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Dining Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%dining%credit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'DINING CREDIT', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- StubHub Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%stubhub%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'STUBHUB CREDIT', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Hyatt Purchase Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.brand_name ILIKE '%hyatt%' AND cc.name ILIKE '%credit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'HYATT PURCHASE CREDIT', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Resy Credit patterns
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%resy%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES 
      (v_credit_id, 'Platinum Resy Credit', NULL),
      (v_credit_id, 'AMEX RESY CREDIT', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Wireless Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%wireless%credit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'AMEX Wireless Credit', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Saks Credit patterns
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%saks%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES 
      (v_credit_id, 'PLATINUM SAKS CREDIT', NULL),
      (v_credit_id, 'Shop Saks with Platinum', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Squarespace Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%squarespace%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'Squarespace Statement Credit', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Hotel Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%hotel%credit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'Platinum Hotel Credit', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Lululemon Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%lululemon%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'Platinum Lululemon Credit', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Digital Entertainment Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%digital%entertainment%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'Platinum Digital Entertainment', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Flexible Business Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%flexible%credit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'FLEXIBLE BUSINESS CREDIT', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Rideshare Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%rideshare%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'AMEX RIDESHARE CREDIT', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Dell Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%dell%credit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'Dell Statement Credit', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Uber Credit patterns
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%uber%credit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'AMEX UBER ONE CREDIT', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- CLEAR Plus Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%clear%plus%' OR cc.name ILIKE '%clear%credit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'AMEX CLEAR PLUS CREDIT', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Flight Credit / Airline Fee Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%airline%fee%credit%' OR cc.name ILIKE '%airline%credit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES 
      (v_credit_id, 'AMEX Flight Credit', NULL),
      (v_credit_id, 'Airline Incidental', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Elite Lifestyle Credit (Bank of America)
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%lifestyle%credit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'Elite Lifestyle Credit', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Airport Security Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%global%entry%' OR cc.name ILIKE '%tsa%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'Airport Security Credit', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Dunkin Credit - matches on name and exact amount ($7.00 = 700 cents, negative)
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%dunkin%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'Dunkin', -700)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Curated Gift Card Credit
  SELECT cc.id INTO v_credit_id FROM card_credits cc 
  WHERE cc.name ILIKE '%curated%' OR cc.name ILIKE '%gift%card%credit%' LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    INSERT INTO credit_matching_rules (credit_id, pattern, match_amount_cents) 
    VALUES (v_credit_id, 'Curated Gift Card Credit', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;

