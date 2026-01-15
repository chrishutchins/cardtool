-- Add format column to site_configs for handling different balance formats (points vs dollars)
ALTER TABLE site_configs 
ADD COLUMN format text DEFAULT 'points';

-- Add comment explaining the column
COMMENT ON COLUMN site_configs.format IS 'Balance format: "points" (default, strips decimals) or "dollars" (keeps decimals, rounds to whole dollars)';
