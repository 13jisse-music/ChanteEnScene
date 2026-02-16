-- Add columns for crowd-sourced photos (public submissions during live events)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin' CHECK (source IN ('admin', 'crowd'));
ALTER TABLE photos ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS submitted_by_email TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS fingerprint TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS live_event_id UUID REFERENCES live_events(id) ON DELETE SET NULL;

-- Index for rate-limiting queries (max photos per fingerprint per event)
CREATE INDEX IF NOT EXISTS idx_photos_crowd ON photos(fingerprint, live_event_id) WHERE source = 'crowd';
