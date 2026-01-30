-- Allow source = 'admin' for bulk-added benefits (e.g. Amex Offers, Refer-A-Friend).
ALTER TABLE card_benefits
  DROP CONSTRAINT IF EXISTS card_benefits_source_check;

ALTER TABLE card_benefits
  ADD CONSTRAINT card_benefits_source_check
  CHECK (source = ANY (ARRAY['spreadsheet'::text, 'kudos'::text, 'admin'::text]));
