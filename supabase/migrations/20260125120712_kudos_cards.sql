-- Kudos Credit Card Database Tables
-- Stores scraped data from Kudos GraphQL API

-- Issuers (banks/card issuers)
CREATE TABLE kudos_issuers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  url TEXT,
  image_uri TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories (spending categories)
CREATE TABLE kudos_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES kudos_categories(id),
  average_annual_spend DECIMAL,
  icon_slug TEXT,
  keywords TEXT,
  is_selectable BOOLEAN DEFAULT TRUE,
  max_reward_amount DECIMAL,
  max_reward_currency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merchants
CREATE TABLE kudos_merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main cards table
CREATE TABLE kudos_cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bank TEXT,
  network TEXT,
  type TEXT,
  type_description TEXT,
  currency TEXT,
  account_type TEXT,
  status TEXT,
  issuer_id TEXT REFERENCES kudos_issuers(id),
  version INTEGER,
  alternative_names TEXT[],
  
  -- Images/URLs
  image_uri TEXT,
  thumbnail_uri TEXT,
  discovery_image_uri TEXT,
  discovery_thumbnail_uri TEXT,
  url TEXT,
  learn_more_url TEXT,
  pay_bill_url TEXT,
  kudos_review_url TEXT,
  
  -- Fees
  annual_fee TEXT,
  foreign_transaction_fee_percent DECIMAL,
  has_foreign_transaction_fees BOOLEAN,
  balance_transfer_fee DECIMAL,
  balance_transfer_fee_percent DECIMAL,
  late_fee DECIMAL,
  over_limit_fee DECIMAL,
  cash_advance_fee DECIMAL,
  cash_advance_fee_percent DECIMAL,
  intro_annual_fee DECIMAL,
  
  -- APR
  apr_type TEXT,
  min_apr DECIMAL,
  max_apr DECIMAL,
  initial_apr DECIMAL,
  initial_apr_period TEXT,
  cash_advance_apr DECIMAL,
  balance_transfer_initial_apr DECIMAL,
  intro_balance_transfer_period TEXT,
  has_balance_transfer BOOLEAN,
  
  -- Credit Score
  min_credit_score INTEGER,
  max_credit_score INTEGER,
  recommended_credit_score INTEGER,
  
  -- Points/Rewards
  point_cash_multiplier DECIMAL,
  
  -- Flags
  is_boost_eligible BOOLEAN,
  is_diamond_set BOOLEAN,
  is_kickstart_eligible BOOLEAN,
  has_welcome_offer_guarantee BOOLEAN,
  is_golden_set BOOLEAN,
  is_recommendable BOOLEAN,
  monetized_status TEXT,
  ownership_type TEXT,
  
  -- Support
  support_phone_number TEXT,
  
  -- Ratings
  kudos_rating_score DECIMAL,
  kudos_rating_editorial TEXT,
  
  -- Application URL info
  application_url TEXT,
  application_partner_id TEXT,
  application_partner_name TEXT,
  application_tracking_link_template TEXT,
  click_through_partner_name TEXT,
  click_through_partner_url TEXT,
  final_application_page_name TEXT,
  final_application_page_url TEXT,
  
  -- Raw data (for anything we might have missed)
  raw_data JSONB,
  
  -- Timestamps
  kudos_date_created TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Card tiers (some cards have multiple tiers)
CREATE TABLE kudos_card_tiers (
  id SERIAL PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES kudos_cards(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, tier_name)
);

-- Rewards (earning rates)
CREATE TABLE kudos_rewards (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES kudos_cards(id) ON DELETE CASCADE,
  description TEXT,
  amount DECIMAL,
  multiplier DECIMAL,
  currency TEXT,
  tier_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reward categories (many-to-many)
CREATE TABLE kudos_reward_categories (
  id SERIAL PRIMARY KEY,
  reward_id TEXT NOT NULL REFERENCES kudos_rewards(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES kudos_categories(id) ON DELETE CASCADE,
  UNIQUE(reward_id, category_id)
);

-- Reward merchants (many-to-many)
CREATE TABLE kudos_reward_merchants (
  id SERIAL PRIMARY KEY,
  reward_id TEXT NOT NULL REFERENCES kudos_rewards(id) ON DELETE CASCADE,
  merchant_id TEXT NOT NULL REFERENCES kudos_merchants(id) ON DELETE CASCADE,
  UNIQUE(reward_id, merchant_id)
);

-- Benefits (perks like travel insurance)
CREATE TABLE kudos_benefits (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES kudos_cards(id) ON DELETE CASCADE,
  title TEXT,
  name TEXT,
  description TEXT,
  detail TEXT,
  summary_types TEXT[],
  limitations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Benefit categories (many-to-many)
CREATE TABLE kudos_benefit_categories (
  id SERIAL PRIMARY KEY,
  benefit_id TEXT NOT NULL REFERENCES kudos_benefits(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES kudos_categories(id) ON DELETE CASCADE,
  UNIQUE(benefit_id, category_id)
);

-- Benefit merchants (many-to-many)
CREATE TABLE kudos_benefit_merchants (
  id SERIAL PRIMARY KEY,
  benefit_id TEXT NOT NULL REFERENCES kudos_benefits(id) ON DELETE CASCADE,
  merchant_id TEXT NOT NULL REFERENCES kudos_merchants(id) ON DELETE CASCADE,
  UNIQUE(benefit_id, merchant_id)
);

-- Cash credits (statement credits like airline credits)
CREATE TABLE kudos_cash_credits (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES kudos_cards(id) ON DELETE CASCADE,
  header TEXT NOT NULL,
  limitations TEXT,
  amount DECIMAL,
  frequency TEXT,
  calendar_year_max_amount DECIMAL,
  expiration_date DATE,
  image_urls TEXT[],
  currency TEXT,
  label TEXT,
  sort_order INTEGER,
  redemption_type TEXT,
  credit_type_id TEXT,
  credit_type_name TEXT,
  credit_type_description TEXT,
  category_id TEXT REFERENCES kudos_categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash credit merchants (many-to-many)
CREATE TABLE kudos_cash_credit_merchants (
  id SERIAL PRIMARY KEY,
  cash_credit_id TEXT NOT NULL REFERENCES kudos_cash_credits(id) ON DELETE CASCADE,
  merchant_id TEXT NOT NULL REFERENCES kudos_merchants(id) ON DELETE CASCADE,
  UNIQUE(cash_credit_id, merchant_id)
);

-- Welcome offers (signup bonuses)
CREATE TABLE kudos_welcome_offers (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES kudos_cards(id) ON DELETE CASCADE,
  offer_type TEXT NOT NULL, -- 'current' or 'default'
  capture_date TIMESTAMPTZ,
  reward_value INTEGER,
  reward_currency TEXT,
  offer_cash_value_amount DECIMAL,
  offer_cash_value_currency TEXT,
  spend_requirement_amount DECIMAL,
  spend_requirement_currency TEXT,
  time_limit TEXT, -- ISO 8601 duration like 'P3M'
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_targeted BOOLEAN,
  is_promotional BOOLEAN,
  is_featured BOOLEAN,
  is_guarantee_eligible BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rotating rewards (quarterly bonus categories)
CREATE TABLE kudos_rotating_rewards (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES kudos_cards(id) ON DELETE CASCADE,
  amount DECIMAL,
  currency TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rotating reward categories (many-to-many)
CREATE TABLE kudos_rotating_reward_categories (
  id SERIAL PRIMARY KEY,
  rotating_reward_id TEXT NOT NULL REFERENCES kudos_rotating_rewards(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES kudos_categories(id) ON DELETE CASCADE,
  UNIQUE(rotating_reward_id, category_id)
);

-- Rotating reward merchants (many-to-many)
CREATE TABLE kudos_rotating_reward_merchants (
  id SERIAL PRIMARY KEY,
  rotating_reward_id TEXT NOT NULL REFERENCES kudos_rotating_rewards(id) ON DELETE CASCADE,
  merchant_id TEXT NOT NULL REFERENCES kudos_merchants(id) ON DELETE CASCADE,
  UNIQUE(rotating_reward_id, merchant_id)
);

-- Redemption options
CREATE TABLE kudos_redemption_options (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES kudos_cards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Editorials (reviews, highlights, pros/cons)
CREATE TABLE kudos_editorials (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES kudos_cards(id) ON DELETE CASCADE,
  editorial_type TEXT NOT NULL, -- 'editorial', 'highlight', 'pros_cons'
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scrape metadata
CREATE TABLE kudos_scrape_log (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  total_cards INTEGER,
  cards_scraped INTEGER,
  status TEXT NOT NULL, -- 'in_progress', 'completed', 'failed'
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX idx_kudos_cards_issuer ON kudos_cards(issuer_id);
CREATE INDEX idx_kudos_cards_status ON kudos_cards(status);
CREATE INDEX idx_kudos_cards_network ON kudos_cards(network);
CREATE INDEX idx_kudos_cards_type ON kudos_cards(type);
CREATE INDEX idx_kudos_rewards_card ON kudos_rewards(card_id);
CREATE INDEX idx_kudos_benefits_card ON kudos_benefits(card_id);
CREATE INDEX idx_kudos_cash_credits_card ON kudos_cash_credits(card_id);
CREATE INDEX idx_kudos_welcome_offers_card ON kudos_welcome_offers(card_id);
CREATE INDEX idx_kudos_categories_parent ON kudos_categories(parent_id);

-- Enable RLS on all tables (service role only - no policies needed)
ALTER TABLE kudos_issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_card_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_reward_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_reward_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_benefit_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_benefit_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_cash_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_cash_credit_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_welcome_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_rotating_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_rotating_reward_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_rotating_reward_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_redemption_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_editorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_scrape_log ENABLE ROW LEVEL SECURITY;

-- Add read policies for authenticated users (reference data)
CREATE POLICY "Authenticated users can read kudos_issuers"
  ON kudos_issuers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_categories"
  ON kudos_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_merchants"
  ON kudos_merchants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_cards"
  ON kudos_cards FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_card_tiers"
  ON kudos_card_tiers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_rewards"
  ON kudos_rewards FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_reward_categories"
  ON kudos_reward_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_reward_merchants"
  ON kudos_reward_merchants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_benefits"
  ON kudos_benefits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_benefit_categories"
  ON kudos_benefit_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_benefit_merchants"
  ON kudos_benefit_merchants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_cash_credits"
  ON kudos_cash_credits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_cash_credit_merchants"
  ON kudos_cash_credit_merchants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_welcome_offers"
  ON kudos_welcome_offers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_rotating_rewards"
  ON kudos_rotating_rewards FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_rotating_reward_categories"
  ON kudos_rotating_reward_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_rotating_reward_merchants"
  ON kudos_rotating_reward_merchants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_redemption_options"
  ON kudos_redemption_options FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kudos_editorials"
  ON kudos_editorials FOR SELECT TO authenticated USING (true);
