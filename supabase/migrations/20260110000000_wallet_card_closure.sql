-- Add columns for card closure and product change tracking
ALTER TABLE user_wallets ADD COLUMN closed_date date;
ALTER TABLE user_wallets ADD COLUMN closed_reason text;
ALTER TABLE user_wallets ADD COLUMN product_changed_to_id uuid REFERENCES user_wallets(id);

-- Add check constraint for closed_reason values
ALTER TABLE user_wallets ADD CONSTRAINT user_wallets_closed_reason_check 
  CHECK (closed_reason IS NULL OR closed_reason IN ('product_change', 'closed'));

-- Add index for efficient filtering of active vs closed cards
CREATE INDEX idx_user_wallets_closed_date ON user_wallets(user_id, closed_date);

-- Add comment for documentation
COMMENT ON COLUMN user_wallets.closed_date IS 'Date the card was closed or product changed. NULL means active.';
COMMENT ON COLUMN user_wallets.closed_reason IS 'Reason for closure: product_change or closed';
COMMENT ON COLUMN user_wallets.product_changed_to_id IS 'Reference to the new wallet entry if this card was product changed';


