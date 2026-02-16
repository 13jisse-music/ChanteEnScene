-- ============ SPONSORS / PARTENAIRES ============
CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    description TEXT,
    tier TEXT NOT NULL DEFAULT 'partner'
        CHECK (tier IN ('gold','silver','bronze','partner')),
    position INTEGER NOT NULL DEFAULT 0,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sponsors_session ON sponsors(session_id);
CREATE INDEX idx_sponsors_tier ON sponsors(session_id, tier, position);

CREATE TRIGGER sponsors_updated_at
    BEFORE UPDATE ON sponsors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
