-- Migration: Annual Planning Features
-- Adds tables for cash flow planning and spend goal tracking

-- ============================================================================
-- Part 1: Create user_cash_flow_items table for cash flow forecasting
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_cash_flow_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  bank_account_id uuid REFERENCES user_bank_accounts(id) ON DELETE SET NULL,
  
  -- Item details
  description text NOT NULL,
  amount_cents integer NOT NULL, -- positive = inflow, negative = outflow
  expected_date date NOT NULL,
  
  -- Recurrence settings
  is_recurring boolean DEFAULT false,
  recurrence_type text CHECK (recurrence_type IN ('monthly', 'quarterly', 'annual')),
  
  -- Optional categorization
  category text,
  
  -- Status tracking
  is_completed boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for cash flow items
CREATE INDEX IF NOT EXISTS idx_user_cash_flow_items_user_id ON user_cash_flow_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cash_flow_items_bank_account ON user_cash_flow_items(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_user_cash_flow_items_date ON user_cash_flow_items(user_id, expected_date);

-- Enable RLS
ALTER TABLE user_cash_flow_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own cash flow items
CREATE POLICY "Users can manage their own cash flow items"
ON user_cash_flow_items FOR ALL TO authenticated
USING (user_id = (auth.jwt()->>'sub'))
WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- ============================================================================
-- Part 2: Create user_planned_spending table for spending sources
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_planned_spending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  
  -- Spending source details
  name text NOT NULL, -- e.g., "IRS Taxes", "Trevor IWT", "Gold Bullion"
  cost_percent numeric, -- processing fee (e.g., 1.8 for taxes)
  category_id integer REFERENCES earning_categories(id) ON DELETE SET NULL,
  
  -- Amount and frequency
  amount_cents integer NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'annual', 'one_time')),
  target_month integer CHECK (target_month >= 1 AND target_month <= 12), -- for one-time items
  
  -- Planning year
  year integer NOT NULL,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for planned spending
CREATE INDEX IF NOT EXISTS idx_user_planned_spending_user_id ON user_planned_spending(user_id);
CREATE INDEX IF NOT EXISTS idx_user_planned_spending_year ON user_planned_spending(user_id, year);
CREATE INDEX IF NOT EXISTS idx_user_planned_spending_category ON user_planned_spending(category_id);

-- Enable RLS
ALTER TABLE user_planned_spending ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own planned spending
CREATE POLICY "Users can manage their own planned spending"
ON user_planned_spending FOR ALL TO authenticated
USING (user_id = (auth.jwt()->>'sub'))
WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- ============================================================================
-- Part 3: Create user_card_spend_goals table for per-card targets
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_card_spend_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  wallet_card_id uuid NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
  
  -- Goal details
  goal_type text NOT NULL CHECK (goal_type IN ('annual_total', 'monthly_target', 'bonus_threshold')),
  target_amount_cents integer NOT NULL,
  
  -- Optional: specific category to use for this goal
  target_category_id integer REFERENCES earning_categories(id) ON DELETE SET NULL,
  
  -- Optional: link to a spend bonus this goal is for
  bonus_id uuid REFERENCES user_spend_bonuses(id) ON DELETE SET NULL,
  
  -- Planning year
  year integer NOT NULL,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for card spend goals
CREATE INDEX IF NOT EXISTS idx_user_card_spend_goals_user_id ON user_card_spend_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_card_spend_goals_wallet ON user_card_spend_goals(wallet_card_id);
CREATE INDEX IF NOT EXISTS idx_user_card_spend_goals_year ON user_card_spend_goals(user_id, year);
CREATE INDEX IF NOT EXISTS idx_user_card_spend_goals_category ON user_card_spend_goals(target_category_id);

-- Enable RLS
ALTER TABLE user_card_spend_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own card spend goals
CREATE POLICY "Users can manage their own card spend goals"
ON user_card_spend_goals FOR ALL TO authenticated
USING (user_id = (auth.jwt()->>'sub'))
WITH CHECK (user_id = (auth.jwt()->>'sub'));
