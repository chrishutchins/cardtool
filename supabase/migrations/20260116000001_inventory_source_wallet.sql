-- Add source_wallet_id column to user_inventory table
-- This allows inventory items to be directly linked to the card that created them
-- (in addition to the existing source_credit_usage_id which links to the specific usage)

ALTER TABLE user_inventory
ADD COLUMN source_wallet_id UUID REFERENCES user_wallets(id) ON DELETE SET NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN user_inventory.source_wallet_id IS 'Optional reference to the wallet card that created this inventory item';

-- Create an index for efficient lookups
CREATE INDEX idx_user_inventory_source_wallet_id ON user_inventory(source_wallet_id) WHERE source_wallet_id IS NOT NULL;
