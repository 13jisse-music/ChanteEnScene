-- Ajouter le champ email aux jurés pour la connexion par email
ALTER TABLE jurors ADD COLUMN email TEXT;

-- Index unique partiel : un seul juré par email par session (ignore les NULL)
CREATE UNIQUE INDEX jurors_session_email_unique
  ON jurors(session_id, email) WHERE email IS NOT NULL;
