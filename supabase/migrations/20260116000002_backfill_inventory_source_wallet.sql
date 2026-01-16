-- Backfill source_wallet_id and player_number for existing inventory items
-- that were created from credit usage but don't have the wallet reference yet

-- Update inventory items that have source_credit_usage_id but no source_wallet_id
UPDATE user_inventory ui
SET 
  source_wallet_id = ucu.user_wallet_id,
  player_number = COALESCE(ui.player_number, uw.player_number)
FROM user_credit_usage ucu
JOIN user_wallets uw ON uw.id = ucu.user_wallet_id
WHERE ui.source_credit_usage_id = ucu.id
  AND ui.source_wallet_id IS NULL;

-- Log the results (this will show in migration output)
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM user_inventory
  WHERE source_wallet_id IS NOT NULL
    AND source_credit_usage_id IS NOT NULL;
  
  RAISE NOTICE 'Backfill complete. % inventory items now have source_wallet_id linked.', updated_count;
END $$;
