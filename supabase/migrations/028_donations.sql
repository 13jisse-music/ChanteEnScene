-- Donations / Partenariats reçus via Stripe
CREATE TABLE IF NOT EXISTS donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Don',
  donor_name TEXT NOT NULL DEFAULT 'Anonyme',
  donor_email TEXT,
  stripe_session_id TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour requêtes dashboard
CREATE INDEX idx_donations_session ON donations(session_id);

-- RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Lecture admin uniquement (via service role pour les crons/webhook)
CREATE POLICY "Admin read donations" ON donations FOR SELECT USING (true);
