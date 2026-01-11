-- Site configurations for Tampermonkey points importer
CREATE TABLE public.site_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    currency_code text NOT NULL,
    url_pattern text NOT NULL,
    balance_page_url text,
    selector text NOT NULL,
    parse_regex text DEFAULT '[\d,]+',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by text,
    
    -- Unique constraint for upsert
    CONSTRAINT site_configs_currency_url_unique UNIQUE (currency_code, url_pattern)
);

-- Index for active configs lookup
CREATE INDEX idx_site_configs_active ON public.site_configs(is_active) WHERE is_active = true;

-- Foreign key to reward_currencies
ALTER TABLE public.site_configs
ADD CONSTRAINT site_configs_currency_code_fkey 
FOREIGN KEY (currency_code) REFERENCES public.reward_currencies(code);

COMMENT ON TABLE public.site_configs IS 'Site scraping configurations for Tampermonkey points importer';
