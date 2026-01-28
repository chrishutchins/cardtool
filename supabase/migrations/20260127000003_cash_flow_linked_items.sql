-- Add linked_item_id to track related transfer items
ALTER TABLE user_cash_flow_items 
ADD COLUMN linked_item_id uuid REFERENCES user_cash_flow_items(id) ON DELETE SET NULL;

-- Add index for quick lookups
CREATE INDEX idx_cash_flow_items_linked 
ON user_cash_flow_items(linked_item_id) 
WHERE linked_item_id IS NOT NULL;
