-- Add source tracking for balance updates
-- Tracks whether balance was imported via tampermonkey script or entered manually

-- Add source column to history table
ALTER TABLE public.user_point_balance_history 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

COMMENT ON COLUMN public.user_point_balance_history.source IS 'Source of the balance update: manual, tampermonkey, api';

-- Add last_update_source to main balances table
ALTER TABLE public.user_point_balances 
ADD COLUMN IF NOT EXISTS last_update_source text DEFAULT 'manual';

COMMENT ON COLUMN public.user_point_balances.last_update_source IS 'Source of the last balance update: manual, tampermonkey, api';
