-- Add is_no_longer_available column to cards table
-- This indicates cards that are no longer available for new applications
-- These cards should be excluded from recommendations and "All Cards" listings
-- but can still be tracked in user wallets

ALTER TABLE cards
ADD COLUMN is_no_longer_available BOOLEAN NOT NULL DEFAULT false;

-- Add a comment explaining the column's purpose
COMMENT ON COLUMN cards.is_no_longer_available IS 'Cards that are no longer available for new applications. Excluded from recommendations and all cards listings.';

-- Mark specific cards as no longer available
-- These are cards that have been discontinued or are no longer accepting new applications

-- Bilt Card (World Mastercard - the original non-Elite version)
UPDATE cards
SET is_no_longer_available = true
WHERE slug = 'bilt-card' OR name ILIKE '%Bilt%Card%' AND name NOT ILIKE '%Elite%';

-- Citi Prestige
UPDATE cards
SET is_no_longer_available = true
WHERE slug = 'citi-prestige' OR name ILIKE '%Citi%Prestige%';

-- US Bank Altitude Reserve
UPDATE cards
SET is_no_longer_available = true
WHERE slug = 'us-bank-altitude-reserve' OR name ILIKE '%US Bank%Altitude%Reserve%' OR name ILIKE '%U.S. Bank%Altitude%Reserve%';

-- Chase Freedom (original, not Flex or Unlimited)
UPDATE cards
SET is_no_longer_available = true
WHERE (slug = 'chase-freedom' OR name = 'Chase Freedom') AND slug NOT LIKE '%flex%' AND slug NOT LIKE '%unlimited%' AND name NOT LIKE '%Flex%' AND name NOT LIKE '%Unlimited%';
