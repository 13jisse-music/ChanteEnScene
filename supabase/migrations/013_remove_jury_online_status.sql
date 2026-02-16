-- Remove jury_online from sessions.status CHECK constraint
-- Online jury scoring now happens during registration_closed phase

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('draft','registration_open','registration_closed','semifinal','final','archived'));

-- Migrate any sessions currently in jury_online to registration_closed
UPDATE sessions SET status = 'registration_closed' WHERE status = 'jury_online';
