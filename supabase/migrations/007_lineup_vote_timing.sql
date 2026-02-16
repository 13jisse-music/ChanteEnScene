-- Add per-candidate vote timing to lineup
-- vote_opened_at: when admin opened voting for this candidate
-- vote_closed_at: when admin closed voting for this candidate
ALTER TABLE lineup ADD COLUMN IF NOT EXISTS vote_opened_at TIMESTAMPTZ;
ALTER TABLE lineup ADD COLUMN IF NOT EXISTS vote_closed_at TIMESTAMPTZ;
