-- Credit Dashboard Tables
-- Links credit report accounts to wallet cards (one-time mapping)

-- Table to link credit accounts to wallet cards
CREATE TABLE IF NOT EXISTS credit_account_wallet_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  credit_account_id UUID NOT NULL REFERENCES credit_accounts(id) ON DELETE CASCADE,
  wallet_card_id UUID REFERENCES user_wallets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, credit_account_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_credit_account_wallet_links_user_id ON credit_account_wallet_links(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_account_wallet_links_credit_account_id ON credit_account_wallet_links(credit_account_id);

-- Table to group similar inquiries across bureaus
CREATE TABLE IF NOT EXISTS credit_inquiry_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  player_number INTEGER NOT NULL DEFAULT 1,
  group_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_credit_inquiry_groups_user_id ON credit_inquiry_groups(user_id);

-- Join table for inquiry grouping
CREATE TABLE IF NOT EXISTS credit_inquiry_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES credit_inquiry_groups(id) ON DELETE CASCADE,
  inquiry_id UUID NOT NULL REFERENCES credit_inquiries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, inquiry_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_credit_inquiry_group_members_group_id ON credit_inquiry_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_credit_inquiry_group_members_inquiry_id ON credit_inquiry_group_members(inquiry_id);
