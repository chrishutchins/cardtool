-- Assign player numbers based on brand
-- Hyatt, Marriott, Alaska -> Player 1
-- Hilton -> Player 2

-- Set Player 1 for Hyatt, Marriott, Alaska
UPDATE user_inventory
SET player_number = 1
WHERE (
  brand ILIKE '%hyatt%' 
  OR brand ILIKE '%marriott%' 
  OR brand ILIKE '%alaska%'
  OR name ILIKE '%hyatt%'
  OR name ILIKE '%marriott%'
  OR name ILIKE '%alaska%'
);

-- Set Player 2 for Hilton
UPDATE user_inventory
SET player_number = 2
WHERE (
  brand ILIKE '%hilton%'
  OR name ILIKE '%hilton%'
);
