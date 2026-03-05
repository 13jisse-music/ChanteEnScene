-- Add last_seen_at for real-time presence detection
ALTER TABLE jurors ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Connection history table
CREATE TABLE IF NOT EXISTS juror_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    juror_id UUID NOT NULL REFERENCES jurors(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_ping_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_juror_sessions_juror ON juror_sessions(juror_id);
CREATE INDEX IF NOT EXISTS idx_juror_sessions_session ON juror_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_juror_sessions_started ON juror_sessions(started_at DESC);

-- RLS
ALTER TABLE juror_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read juror_sessions"
    ON juror_sessions FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())
    );

CREATE POLICY "Service role can manage juror_sessions"
    ON juror_sessions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
