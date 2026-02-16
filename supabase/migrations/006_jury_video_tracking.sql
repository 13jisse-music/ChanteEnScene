-- Add video watch tracking columns to jury_scores
-- viewed_at: when the juror first saw the candidate slide
-- watch_seconds: cumulative seconds spent viewing before voting
ALTER TABLE jury_scores ADD COLUMN viewed_at TIMESTAMPTZ;
ALTER TABLE jury_scores ADD COLUMN watch_seconds INTEGER DEFAULT 0;
