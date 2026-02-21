-- Add fingerprint column to candidates for push notification targeting
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- Index for efficient lookup when matching candidates to push subscriptions
CREATE INDEX IF NOT EXISTS idx_candidates_fingerprint ON candidates(fingerprint) WHERE fingerprint IS NOT NULL;

-- Add segment column to push_log to track which segment was targeted
ALTER TABLE push_log ADD COLUMN IF NOT EXISTS segment TEXT;
