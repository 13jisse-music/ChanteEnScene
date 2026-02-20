-- Table de log des publications sociales (FB + IG)
CREATE TABLE IF NOT EXISTS social_posts_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  post_type text NOT NULL DEFAULT 'manual',
  source text NOT NULL DEFAULT 'cron', -- 'cron' ou 'manual'
  message text NOT NULL,
  image_url text,
  link text,
  facebook_post_id text,
  instagram_post_id text,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Index pour le tri par date
CREATE INDEX idx_social_posts_log_created ON social_posts_log(created_at DESC);

-- RLS : lecture pour les admins authentifiés
ALTER TABLE social_posts_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read social posts log"
  ON social_posts_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert social posts log"
  ON social_posts_log FOR INSERT
  WITH CHECK (true);
