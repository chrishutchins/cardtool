-- Raw spreadsheet import data for the benefits viewer (admin-only). NOT used by production.
-- When user clicks + in the viewer, we copy a row into card_benefits (production).
CREATE TABLE spreadsheet_card_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  sheet_name TEXT,
  title TEXT,
  description TEXT,
  detail TEXT,
  limitations TEXT,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spreadsheet_card_benefits_card_id ON spreadsheet_card_benefits(card_id);

ALTER TABLE spreadsheet_card_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read spreadsheet_card_benefits"
  ON spreadsheet_card_benefits FOR SELECT TO authenticated USING (true);

-- Migrate existing spreadsheet rows from card_benefits into the new table
INSERT INTO spreadsheet_card_benefits (card_id, title, description, detail, limitations, display_order, created_at)
SELECT card_id, title, description, detail, limitations, display_order, created_at
FROM card_benefits
WHERE source = 'spreadsheet';

DELETE FROM card_benefits WHERE source = 'spreadsheet';
