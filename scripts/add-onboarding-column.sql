-- Add onboarding_completed column to user_feature_flags table
-- Run this in Supabase SQL Editor

ALTER TABLE user_feature_flags 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_feature_flags_onboarding 
ON user_feature_flags(user_id) WHERE onboarding_completed = FALSE;

