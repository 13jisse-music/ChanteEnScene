-- PWA installation tracking
CREATE TABLE pwa_installs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'unknown',
    install_source TEXT NOT NULL DEFAULT 'prompt',
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, fingerprint)
);

CREATE INDEX idx_pwa_installs_session ON pwa_installs(session_id);

ALTER TABLE pwa_installs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public visitors installing without auth)
CREATE POLICY "Anyone can track install" ON pwa_installs
    FOR INSERT WITH CHECK (true);
