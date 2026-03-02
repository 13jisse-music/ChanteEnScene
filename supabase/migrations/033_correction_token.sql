-- Add correction token for candidates to fix their submission
-- Token is permanent (no expiration), candidate can correct as many times as needed
-- Correction is disabled once candidate is approved
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS correction_token TEXT UNIQUE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS correction_fields TEXT[] DEFAULT ARRAY[]::TEXT[];
