-- Add shares_count to candidates
ALTER TABLE candidates ADD COLUMN shares_count INTEGER DEFAULT 0;

-- Shares tracking table for detailed analytics
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC to track a share (increments counter + inserts row)
CREATE OR REPLACE FUNCTION track_share(
  p_session_id UUID,
  p_candidate_id UUID,
  p_platform TEXT,
  p_fingerprint TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO shares (candidate_id, session_id, platform, fingerprint)
  VALUES (p_candidate_id, p_session_id, p_platform, p_fingerprint);

  UPDATE candidates SET shares_count = shares_count + 1
  WHERE id = p_candidate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
