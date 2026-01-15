-- Add external_id column to user_inventory for deduplication during imports
ALTER TABLE user_inventory 
ADD COLUMN external_id TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN user_inventory.external_id IS 'External identifier from source platform (e.g., Hyatt award code) for deduplication during imports';

-- Unique constraint per user + external_id to prevent duplicates
-- Only applies when external_id is not null (allows multiple items without external_id)
CREATE UNIQUE INDEX idx_user_inventory_external_id 
ON user_inventory(user_id, external_id) 
WHERE external_id IS NOT NULL;
