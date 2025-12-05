-- Run this in Supabase SQL Editor

-- Create cap type enum
CREATE TYPE cap_type AS ENUM (
  'single_category',
  'combined_categories',
  'selected_category',
  'top_category',
  'second_top_category',
  'top_two_categories',
  'top_three_categories'
);

-- Card caps table - defines cap rules for cards
CREATE TABLE card_caps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  cap_type cap_type NOT NULL,
  cap_amount numeric(14,2), -- NULL means no cap
  eligible_category_ids integer[] NOT NULL, -- array of category IDs
  created_at timestamptz DEFAULT now()
);

-- User's category selection for "selected_category" cards
CREATE TABLE user_card_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES earning_categories(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, card_id)
);

-- Enable RLS
ALTER TABLE card_caps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_card_selections ENABLE ROW LEVEL SECURITY;

-- RLS policies for card_caps (public read)
CREATE POLICY "Anyone can read card_caps" ON card_caps FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage card_caps" ON card_caps FOR ALL USING (true);

-- RLS policies for user_card_selections (user-specific)
CREATE POLICY "Users can read own selections" ON user_card_selections FOR SELECT USING (true);
CREATE POLICY "Users can manage own selections" ON user_card_selections FOR ALL USING (true);

-- Index for faster lookups
CREATE INDEX idx_card_caps_card_id ON card_caps(card_id);
CREATE INDEX idx_user_card_selections_user_card ON user_card_selections(user_id, card_id);

