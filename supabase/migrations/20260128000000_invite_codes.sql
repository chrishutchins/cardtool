-- Invite codes system for managing access and feature grants
-- Supports use limits, expiration, and Plaid tier assignment

CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  plaid_tier TEXT NOT NULL DEFAULT 'disabled' CHECK (plaid_tier IN ('disabled', 'txns', 'txns_liab', 'full')),
  uses_remaining INTEGER,  -- NULL = unlimited
  uses_total INTEGER,  -- Track original limit for display
  expires_at TIMESTAMPTZ,  -- NULL = never expires
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,  -- admin email who created it
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Index for code lookups (case-insensitive)
CREATE INDEX idx_invite_codes_code ON invite_codes (UPPER(code));

-- Index for active codes
CREATE INDEX idx_invite_codes_active ON invite_codes (is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can access invite codes (admin-only table)
-- No policies = blocked for anon/authenticated, accessible via service role

-- Track which invite code a user signed up with
CREATE TABLE user_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,  -- Clerk user ID
  invite_code_id UUID REFERENCES invite_codes(id) ON DELETE SET NULL,
  code_used TEXT NOT NULL,  -- Store the actual code used (in case invite_code is deleted)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_user_invite_codes_user_id ON user_invite_codes (user_id);

-- Enable RLS
ALTER TABLE user_invite_codes ENABLE ROW LEVEL SECURITY;

-- Users can read their own invite code record
CREATE POLICY "Users can read their own invite code"
  ON user_invite_codes FOR SELECT TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));
