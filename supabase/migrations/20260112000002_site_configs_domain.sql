-- Rename url_pattern to domain and clean up existing data
-- This simplifies matching to domain-only (no paths)

-- Drop the old unique constraint
ALTER TABLE site_configs DROP CONSTRAINT IF EXISTS site_configs_currency_url_unique;
ALTER TABLE site_configs DROP CONSTRAINT IF EXISTS unique_currency_url;

-- Rename column
ALTER TABLE site_configs RENAME COLUMN url_pattern TO domain;

-- Clean up existing data: extract base domain from paths and subdomains
UPDATE site_configs SET domain = 'united.com' WHERE domain LIKE 'united.com/%';
UPDATE site_configs SET domain = 'americanexpress.com' WHERE domain LIKE '%americanexpress.com%';
UPDATE site_configs SET domain = 'airfrance.us' WHERE domain LIKE '%airfrance.us%';

-- Add new unique constraint on currency_code + domain
ALTER TABLE site_configs ADD CONSTRAINT site_configs_currency_domain_unique UNIQUE (currency_code, domain);

-- Update index
DROP INDEX IF EXISTS idx_site_configs_active;
CREATE INDEX idx_site_configs_domain ON site_configs(domain);
