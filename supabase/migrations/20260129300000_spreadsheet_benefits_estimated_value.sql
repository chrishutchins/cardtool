-- Add estimated annual value to spreadsheet_card_benefits (column C in sheet; columns D/E are skipped).
ALTER TABLE spreadsheet_card_benefits
  ADD COLUMN IF NOT EXISTS estimated_annual_value TEXT;
