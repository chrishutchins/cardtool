-- Add apr_rate column to card_offer_intro_apr to support non-0% intro APRs
ALTER TABLE card_offer_intro_apr ADD COLUMN IF NOT EXISTS apr_rate numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN card_offer_intro_apr.apr_rate IS 'The intro APR rate (0 for 0% APR, 10 for 10% APR, etc.)';
