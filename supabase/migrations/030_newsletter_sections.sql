-- MailForge: enrichir email_campaigns pour le compositeur IA
-- Ajoute le support multi-sections, ton éditorial, thèmes

ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'decale',
  ADD COLUMN IF NOT EXISTS themes TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Mise à jour du check status pour ajouter 'generating'
ALTER TABLE email_campaigns DROP CONSTRAINT IF EXISTS email_campaigns_status_check;
ALTER TABLE email_campaigns ADD CONSTRAINT email_campaigns_status_check
  CHECK (status IN ('draft', 'generating', 'sending', 'sent', 'failed'));

COMMENT ON COLUMN email_campaigns.sections IS 'Array of {label, title, body, imageUrl, color, ctaText, ctaUrl}';
COMMENT ON COLUMN email_campaigns.tone IS 'Editorial tone: decale, pro, chaleureux, urgence, inspirant';
COMMENT ON COLUMN email_campaigns.themes IS 'Themes covered in this newsletter';
