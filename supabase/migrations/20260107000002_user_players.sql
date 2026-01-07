-- Create user_players table to store player configurations
CREATE TABLE user_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  player_number INTEGER NOT NULL CHECK (player_number >= 1 AND player_number <= 10),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, player_number)
);

-- Create index for user_id lookups
CREATE INDEX idx_user_players_user_id ON user_players(user_id);

-- Add player_number column to user_wallets (defaults to 1 for P1)
ALTER TABLE user_wallets ADD COLUMN player_number INTEGER DEFAULT 1;

-- Create index for player_number lookups
CREATE INDEX idx_user_wallets_player_number ON user_wallets(player_number);

