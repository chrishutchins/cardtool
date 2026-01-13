-- Add related_card_id and related_note columns to credit_inquiry_groups
-- These columns link inquiry groups to wallet cards or allow custom notes

ALTER TABLE credit_inquiry_groups 
ADD COLUMN IF NOT EXISTS related_card_id UUID REFERENCES user_wallets(id) ON DELETE SET NULL;

ALTER TABLE credit_inquiry_groups 
ADD COLUMN IF NOT EXISTS related_note TEXT;

-- Create index for faster lookups by related card
CREATE INDEX IF NOT EXISTS idx_credit_inquiry_groups_related_card ON credit_inquiry_groups(related_card_id);
