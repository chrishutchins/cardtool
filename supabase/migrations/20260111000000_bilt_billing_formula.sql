-- Add Bilt billing cycle formula
-- Bilt uses the same formula as Amex/Wells Fargo: close = 25 days before due (26 if Saturday)

UPDATE public.issuers 
SET billing_cycle_formula = 'bilt_formula' 
WHERE slug = 'bilt' OR name ILIKE '%bilt%';
