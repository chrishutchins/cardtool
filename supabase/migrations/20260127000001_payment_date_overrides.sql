-- User payment date overrides
-- Allows users to schedule payments for dates other than the due date

CREATE TABLE user_payment_date_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  wallet_card_id uuid NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  original_due_date date NOT NULL, -- Track which cycle this applies to
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, wallet_card_id, original_due_date) -- One override per card per cycle
);

-- Enable RLS
ALTER TABLE user_payment_date_overrides ENABLE ROW LEVEL SECURITY;

-- Users can manage their own overrides
CREATE POLICY "Users can manage their own payment date overrides"
  ON user_payment_date_overrides FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- Index for quick lookups
CREATE INDEX idx_payment_date_overrides_user_card 
  ON user_payment_date_overrides(user_id, wallet_card_id);
