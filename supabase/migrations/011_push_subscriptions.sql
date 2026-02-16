-- Push notification subscriptions (Web Push API)
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    role TEXT DEFAULT 'public' CHECK (role IN ('public', 'jury', 'admin')),
    juror_id UUID REFERENCES jurors(id) ON DELETE CASCADE,
    fingerprint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(endpoint, session_id)
);

CREATE INDEX idx_push_subscriptions_session_role ON push_subscriptions(session_id, role);
CREATE INDEX idx_push_subscriptions_juror ON push_subscriptions(juror_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public visitors subscribing without auth)
CREATE POLICY "Anyone can subscribe" ON push_subscriptions
    FOR INSERT WITH CHECK (true);

-- Allow anyone to delete their own subscription by endpoint
CREATE POLICY "Anyone can unsubscribe" ON push_subscriptions
    FOR DELETE USING (true);

-- SELECT reserved to service role (admin client bypasses RLS)

CREATE TRIGGER push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
