-- Add US Bank billing cycle formula
-- US Bank: Close = (due day - 3)th weekday of the month
-- E.g., due 16th → close on 13th weekday of the month

UPDATE public.issuers 
SET billing_cycle_formula = 'usbank_formula' 
WHERE slug = 'us-bank' OR name ILIKE '%us bank%' OR name ILIKE '%usbank%';
