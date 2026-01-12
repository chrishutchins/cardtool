-- Add aggregate column to site_configs
-- When true, the importer will find ALL matching elements and sum their values

ALTER TABLE public.site_configs
ADD COLUMN aggregate boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.site_configs.aggregate IS 'When true, sum all matching elements instead of taking the first one';
