-- 031: Jury dashboard — onboarding, login tracking, voting deadline

-- Juror onboarding & login tracking
ALTER TABLE jurors ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT false;
ALTER TABLE jurors ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE jurors ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Voting deadline stored in sessions.config (JSONB), no schema change needed
-- Key: session.config.jury_voting_deadline (ISO date string)
-- Already using session.config.jury_online_voting_closed (boolean)
