-- Email subscribers for event notifications
CREATE TABLE email_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'footer'
        CHECK (source IN ('footer', 'live', 'install_prompt', 'mobile_fallback')),
    fingerprint TEXT,
    unsubscribe_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, email)
);

CREATE INDEX idx_email_subscribers_session ON email_subscribers(session_id);
CREATE INDEX idx_email_subscribers_active ON email_subscribers(session_id, is_active);
CREATE INDEX idx_email_subscribers_token ON email_subscribers(unsubscribe_token);

ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public visitors subscribing without auth)
CREATE POLICY "Anyone can subscribe" ON email_subscribers
    FOR INSERT WITH CHECK (true);

-- Migrate existing subscribers from sessions.config.subscribers
DO $$
DECLARE
    sess RECORD;
    subscriber_email TEXT;
BEGIN
    FOR sess IN SELECT id, config FROM sessions WHERE config ? 'subscribers' LOOP
        FOR subscriber_email IN
            SELECT jsonb_array_elements_text(sess.config->'subscribers')
        LOOP
            INSERT INTO email_subscribers (session_id, email, source)
            VALUES (sess.id, lower(subscriber_email), 'live')
            ON CONFLICT (session_id, email) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
