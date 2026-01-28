-- Add wallet_card_id to cash flow items for card payments
ALTER TABLE user_cash_flow_items 
ADD COLUMN wallet_card_id uuid REFERENCES user_wallets(id) ON DELETE SET NULL;

-- Add index for quick lookups by card
CREATE INDEX idx_cash_flow_items_wallet_card 
ON user_cash_flow_items(user_id, wallet_card_id) 
WHERE wallet_card_id IS NOT NULL;
