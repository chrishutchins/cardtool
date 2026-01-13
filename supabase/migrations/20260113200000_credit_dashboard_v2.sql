-- Credit Dashboard V2 - Schema Updates

-- Add display_name to credit_account_wallet_links for custom naming of non-wallet accounts
ALTER TABLE credit_account_wallet_links 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add last_seen_snapshot_id to credit_inquiries to track active vs dropped inquiries
ALTER TABLE credit_inquiries 
ADD COLUMN IF NOT EXISTS last_seen_snapshot_id UUID REFERENCES credit_report_snapshots(id) ON DELETE SET NULL;

-- Add unique constraint on inquiries to prevent duplicates on import
-- First, remove any existing duplicates (keep the one with the highest id)
DELETE FROM credit_inquiries a
USING credit_inquiries b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.bureau = b.bureau
  AND a.company_name = b.company_name
  AND a.inquiry_date = b.inquiry_date;

-- Now add the unique constraint
ALTER TABLE credit_inquiries 
ADD CONSTRAINT credit_inquiries_unique_per_bureau 
UNIQUE (user_id, bureau, company_name, inquiry_date);

-- Update existing inquiries to set last_seen_snapshot_id to their current snapshot_id
UPDATE credit_inquiries 
SET last_seen_snapshot_id = snapshot_id 
WHERE last_seen_snapshot_id IS NULL AND snapshot_id IS NOT NULL;

-- Create index for faster lookups on last_seen_snapshot_id
CREATE INDEX IF NOT EXISTS idx_credit_inquiries_last_seen ON credit_inquiries(last_seen_snapshot_id);
