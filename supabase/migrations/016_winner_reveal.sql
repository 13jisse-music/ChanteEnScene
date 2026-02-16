-- Add winner reveal columns to live_events (may already exist if added via Supabase Studio)
ALTER TABLE live_events ADD COLUMN IF NOT EXISTS winner_candidate_id UUID REFERENCES candidates(id);
ALTER TABLE live_events ADD COLUMN IF NOT EXISTS winner_revealed_at TIMESTAMPTZ;
