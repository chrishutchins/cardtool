-- Create card charge type enum (credit vs charge cards)
CREATE TYPE card_charge_type AS ENUM ('credit', 'charge');

-- Add card_charge_type column to cards table
ALTER TABLE cards ADD COLUMN card_charge_type card_charge_type DEFAULT 'credit';

-- Create application_rules table
CREATE TABLE application_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id UUID NOT NULL REFERENCES issuers(id),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('velocity', 'limit')),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Common fields
  card_limit INTEGER NOT NULL,
  card_type TEXT DEFAULT 'both' CHECK (card_type IN ('personal', 'business', 'both')),
  
  -- Velocity-specific fields
  time_window INTEGER, -- number of days or months
  time_unit TEXT CHECK (time_unit IN ('days', 'months')),
  counts_all_issuers BOOLEAN DEFAULT false,
  
  -- Limit-specific fields
  charge_type TEXT DEFAULT 'all' CHECK (charge_type IN ('all', 'credit', 'charge')),
  
  -- Banking relationship
  requires_banking BOOLEAN DEFAULT false,
  
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for common queries
CREATE INDEX idx_application_rules_issuer ON application_rules(issuer_id);
CREATE INDEX idx_application_rules_active ON application_rules(is_active);
CREATE INDEX idx_application_rules_type ON application_rules(rule_type);

-- Add constraint to ensure velocity rules have time fields
ALTER TABLE application_rules ADD CONSTRAINT velocity_requires_time 
  CHECK (rule_type != 'velocity' OR (time_window IS NOT NULL AND time_unit IS NOT NULL));

