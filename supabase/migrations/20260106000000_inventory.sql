-- Create inventory tracking type enum
CREATE TYPE inventory_tracking_type AS ENUM (
  'quantity',      -- Track count (e.g., 2 lounge passes)
  'dollar_value',  -- Track remaining $ amount (e.g., $50 gift card)
  'single_use'     -- Just used/not used (e.g., free night certificate)
);

-- Create inventory_types table (admin-managed)
CREATE TABLE inventory_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tracking_type inventory_tracking_type NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default inventory types
INSERT INTO inventory_types (name, slug, tracking_type, display_order) VALUES
  ('Gift Card', 'gift_card', 'dollar_value', 1),
  ('Free Night', 'free_night', 'single_use', 2),
  ('Lounge Visit', 'lounge_visit', 'quantity', 3),
  ('Coupon', 'coupon', 'single_use', 4),
  ('Travel Credit', 'travel_credit', 'dollar_value', 5);

-- Create user_inventory table
CREATE TABLE user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type_id UUID NOT NULL REFERENCES inventory_types(id),
  name TEXT NOT NULL,
  brand TEXT,
  expiration_date DATE,
  code TEXT,
  pin TEXT,
  url TEXT,
  notes TEXT,
  
  -- For quantity tracking (lounge visits, etc.)
  quantity INTEGER DEFAULT 1,
  quantity_used INTEGER DEFAULT 0,
  
  -- For dollar value tracking (gift cards, travel credits)
  original_value_cents INTEGER,
  remaining_value_cents INTEGER,
  
  -- Status
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  
  -- Link to Credits if imported from earned credit
  source_credit_usage_id UUID REFERENCES user_credit_usage(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX idx_user_inventory_type_id ON user_inventory(type_id);
CREATE INDEX idx_user_inventory_is_used ON user_inventory(is_used);
CREATE INDEX idx_user_inventory_expiration ON user_inventory(expiration_date);

-- Add inventory_type_id column to card_credits table
-- This links must_be_earned credits to an inventory type
ALTER TABLE card_credits 
  ADD COLUMN inventory_type_id UUID REFERENCES inventory_types(id);

-- Create index for the new column
CREATE INDEX idx_card_credits_inventory_type ON card_credits(inventory_type_id);

