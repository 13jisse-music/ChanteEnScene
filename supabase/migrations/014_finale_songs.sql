-- Add finale_songs JSONB column to candidates
-- Stores an array of song proposals for the finale: [{title, artist, youtube_url}]
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS finale_songs JSONB DEFAULT '[]'::jsonb;
