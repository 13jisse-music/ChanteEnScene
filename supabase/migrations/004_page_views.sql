-- ============================================================
-- ChanteEnScène — Table page_views pour le tracking marketing
-- ============================================================

CREATE TABLE page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    page_path TEXT NOT NULL,
    fingerprint TEXT,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_page_views_session ON page_views(session_id);
CREATE INDEX idx_page_views_candidate ON page_views(candidate_id);
CREATE INDEX idx_page_views_created ON page_views(session_id, created_at);
