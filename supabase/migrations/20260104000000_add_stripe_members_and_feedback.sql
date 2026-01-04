-- Migration: Add Stripe Members and User Feedback tables
-- Date: 2026-01-04
-- Purpose: Support Stripe webhook-based member verification and in-app feedback

-- Stripe Members Table
-- Synced via webhooks to avoid Stripe API calls during signup
CREATE TABLE IF NOT EXISTS stripe_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  subscription_status TEXT NOT NULL, -- active, trialing, past_due, canceled, etc.
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Computed column for easy whitelist checking
-- Users with active or trialing subscriptions are considered whitelisted
ALTER TABLE stripe_members 
ADD COLUMN IF NOT EXISTS is_whitelisted BOOLEAN GENERATED ALWAYS AS (
  subscription_status IN ('active', 'trialing')
) STORED;

-- Indexes for stripe_members
CREATE INDEX IF NOT EXISTS idx_stripe_members_email ON stripe_members(email);
CREATE INDEX IF NOT EXISTS idx_stripe_members_whitelisted ON stripe_members(is_whitelisted);
CREATE INDEX IF NOT EXISTS idx_stripe_members_customer_id ON stripe_members(stripe_customer_id);

-- User Feedback Table
-- Stores feedback submissions from the in-app feedback button
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID (no email stored for privacy)
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'general')),
  message TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- Safe view for linked accounts (excludes access_token)
-- Use this view in client-accessible queries
CREATE OR REPLACE VIEW user_linked_accounts_safe AS
SELECT 
  id,
  user_id,
  plaid_item_id,
  name,
  official_name,
  type,
  subtype,
  mask,
  current_balance,
  available_balance,
  credit_limit,
  manual_credit_limit,
  iso_currency_code,
  last_balance_update,
  wallet_card_id
FROM user_linked_accounts;

-- Comment explaining the purpose
COMMENT ON VIEW user_linked_accounts_safe IS 'Safe view of linked accounts that excludes sensitive Plaid access tokens. Use this for client-accessible queries.';
COMMENT ON TABLE stripe_members IS 'Webhook-synced Stripe subscription data for membership verification at signup.';
COMMENT ON TABLE user_feedback IS 'User feedback submissions from the in-app feedback button.';

