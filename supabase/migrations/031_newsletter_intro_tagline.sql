-- MailForge: intro text + footer tagline for newsletters
ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS intro_text TEXT,
  ADD COLUMN IF NOT EXISTS footer_tagline TEXT;

COMMENT ON COLUMN email_campaigns.intro_text IS 'Intro paragraph between header image and first section';
COMMENT ON COLUMN email_campaigns.footer_tagline IS 'Viral tagline in the pink footer bar';
