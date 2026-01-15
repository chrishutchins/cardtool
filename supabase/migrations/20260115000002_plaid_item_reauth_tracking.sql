-- Add columns to track Plaid Item error state for re-authentication flow
-- When an Item enters an error state (e.g., ITEM_LOGIN_REQUIRED), we store the error
-- so the UI can prompt users to reconnect via Link update mode

ALTER TABLE user_plaid_items
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS requires_reauth BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS error_detected_at TIMESTAMPTZ;

-- Add index for efficient lookup of items needing reauth
CREATE INDEX IF NOT EXISTS idx_user_plaid_items_requires_reauth 
ON user_plaid_items (user_id, requires_reauth) 
WHERE requires_reauth = TRUE;

COMMENT ON COLUMN user_plaid_items.error_code IS 'Plaid error code (e.g., ITEM_LOGIN_REQUIRED)';
COMMENT ON COLUMN user_plaid_items.error_message IS 'Human-readable error message from Plaid';
COMMENT ON COLUMN user_plaid_items.requires_reauth IS 'True if the Item needs re-authentication via Link update mode';
COMMENT ON COLUMN user_plaid_items.error_detected_at IS 'When the error was first detected';
