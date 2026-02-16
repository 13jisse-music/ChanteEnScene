-- Add jury_online status to sessions.status CHECK constraint
-- Backward compatible: existing statuses remain valid

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('draft','registration_open','registration_closed','jury_online','semifinal','final','archived'));
