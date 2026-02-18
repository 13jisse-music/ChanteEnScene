-- Email campaigns / newsletter system
CREATE TABLE email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
    target TEXT NOT NULL DEFAULT 'all'
        CHECK (target IN ('all', 'voluntary', 'legacy')),
    total_recipients INT DEFAULT 0,
    total_sent INT DEFAULT 0,
    total_errors INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX idx_email_campaigns_session ON email_campaigns(session_id);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Admin-only access (via service role in server actions)
CREATE POLICY "Admin full access" ON email_campaigns
    FOR ALL USING (true) WITH CHECK (true);
