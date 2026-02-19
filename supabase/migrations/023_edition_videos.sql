-- ============================================================
-- Table pour les vidéos YouTube des éditions (galerie par année)
-- ============================================================

CREATE TABLE IF NOT EXISTS edition_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    youtube_url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    sort_order INTEGER DEFAULT 0,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_edition_videos_session ON edition_videos(session_id);
