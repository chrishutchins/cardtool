-- Add player_number column to user_inventory table
-- This allows inventory items to be associated with a specific player (for multi-player households)

ALTER TABLE user_inventory
ADD COLUMN player_number INTEGER;

-- Add a comment explaining the column
COMMENT ON COLUMN user_inventory.player_number IS 'Optional player number for multi-player households (1-indexed)';
