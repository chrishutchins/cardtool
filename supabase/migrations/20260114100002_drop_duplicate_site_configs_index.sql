-- Drop duplicate index on site_configs
-- idx_site_configs_url and idx_site_configs_domain both index the 'domain' column
-- Keeping idx_site_configs_domain (correctly named), dropping idx_site_configs_url (misleading name)

DROP INDEX IF EXISTS idx_site_configs_url;
