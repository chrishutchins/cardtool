-- Pending signups table to track invite codes and verified emails during signup flow
-- This replaces the cookie-based approach since Clerk webhooks are server-to-server
-- and don't have access to browser cookies.

CREATE TABLE pending_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invite_code TEXT,  -- The invite code they verified (if any)
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Index for email lookups (case-insensitive)
CREATE INDEX idx_pending_signups_email ON pending_signups (LOWER(email));

-- Index for cleanup of expired records
CREATE INDEX idx_pending_signups_expires ON pending_signups (expires_at);

-- Enable RLS - only service role can access
ALTER TABLE pending_signups ENABLE ROW LEVEL SECURITY;

-- No policies = blocked for anon/authenticated, accessible via service role only
