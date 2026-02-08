-- ============================================================
-- ChanteEnScène — Schéma complet de la base de données
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ SESSIONS (multi-tenant) ============
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    city TEXT NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','registration_open','registration_closed','semifinal','final','archived')),
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ CANDIDATES ============
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    stage_name TEXT,
    date_of_birth DATE NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    city TEXT,
    category TEXT,
    photo_url TEXT,
    video_url TEXT,
    mp3_url TEXT,
    song_title TEXT,
    song_artist TEXT,
    bio TEXT,
    accent_color TEXT DEFAULT '#E91E8C',
    slug TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','semifinalist','finalist','winner')),
    parental_consent_url TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(session_id, slug),
    UNIQUE(session_id, email)
);

-- ============ VOTES (likes publics) ============
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(candidate_id, fingerprint)
);

-- ============ JURORS ============
CREATE TABLE jurors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL DEFAULT 'online'
        CHECK (role IN ('online','semifinal','final')),
    qr_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ JURY SCORES ============
CREATE TABLE jury_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    juror_id UUID NOT NULL REFERENCES jurors(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('online','semifinal','final')),
    scores JSONB DEFAULT '{}'::jsonb,
    total_score NUMERIC DEFAULT 0,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(juror_id, candidate_id, event_type)
);

-- ============ LIVE EVENTS ============
CREATE TABLE live_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('semifinal','final')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','live','paused','completed')),
    current_category TEXT,
    current_candidate_id UUID REFERENCES candidates(id),
    is_voting_open BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ LINEUP ============
CREATE TABLE lineup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    live_event_id UUID NOT NULL REFERENCES live_events(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','performing','completed','absent','replay')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ LIVE VOTES ============
CREATE TABLE live_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    live_event_id UUID NOT NULL REFERENCES live_events(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(live_event_id, candidate_id, fingerprint)
);

-- ============ PHOTOS ============
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    tag_type TEXT DEFAULT 'general' CHECK (tag_type IN ('candidate','event','general')),
    tag_candidate_id UUID REFERENCES candidates(id),
    tag_event TEXT CHECK (tag_event IN ('rehearsal','semifinal','final','backstage')),
    published_to_facebook BOOLEAN DEFAULT false,
    facebook_post_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ FACEBOOK POSTS ============
CREATE TABLE facebook_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    post_type TEXT NOT NULL CHECK (post_type IN ('new_candidate','weekly','photo_album','custom')),
    content TEXT,
    photo_urls TEXT[],
    facebook_post_id TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','failed')),
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ CHATBOT FAQ ============
CREATE TABLE chatbot_faq (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- ============ CHATBOT CONVERSATIONS ============
CREATE TABLE chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ ADMIN USERS ============
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'local_admin'
        CHECK (role IN ('super_admin','local_admin')),
    session_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX idx_candidates_session ON candidates(session_id);
CREATE INDEX idx_candidates_status ON candidates(session_id, status);
CREATE INDEX idx_candidates_category ON candidates(session_id, category);
CREATE INDEX idx_candidates_likes ON candidates(session_id, likes_count DESC);
CREATE INDEX idx_votes_candidate ON votes(candidate_id);
CREATE INDEX idx_votes_fingerprint ON votes(candidate_id, fingerprint);
CREATE INDEX idx_jury_scores_candidate ON jury_scores(candidate_id);
CREATE INDEX idx_lineup_event ON lineup(live_event_id, position);
CREATE INDEX idx_live_votes_event ON live_votes(live_event_id);
CREATE INDEX idx_photos_session ON photos(session_id);

-- ============ TRIGGER updated_at ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER live_events_updated_at BEFORE UPDATE ON live_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============ SEED — Première session ============
INSERT INTO sessions (name, slug, city, year, status, config) VALUES (
    'ChanteEnScène Aubagne 2026',
    'aubagne-2026',
    'Aubagne',
    2026,
    'draft',
    '{
        "age_categories": [
            {"name": "Enfant", "min_age": 6, "max_age": 12},
            {"name": "Ado", "min_age": 13, "max_age": 17},
            {"name": "Adulte", "min_age": 18, "max_age": 99}
        ],
        "registration_start": "2026-03-01",
        "registration_end": "2026-06-01",
        "semifinal_date": "2026-06-17",
        "final_date": "2026-07-16",
        "semifinal_location": "Espace Liberté, Aubagne",
        "final_location": "Cours Foch, Aubagne",
        "max_video_duration_sec": 180,
        "max_video_size_mb": 100,
        "max_mp3_size_mb": 20,
        "max_photo_size_mb": 5,
        "max_votes_per_device": 50,
        "registration_fee": 0,
        "semifinalists_per_category": 10,
        "finalists_per_category": 5,
        "jury_weight_percent": 60,
        "public_weight_percent": 40,
        "jury_criteria": [
            {"name": "Justesse vocale", "max_score": 10},
            {"name": "Interprétation", "max_score": 10},
            {"name": "Présence scénique", "max_score": 10},
            {"name": "Originalité", "max_score": 10}
        ]
    }'::jsonb
);
