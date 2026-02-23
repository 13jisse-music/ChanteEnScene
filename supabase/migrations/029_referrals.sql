-- Parrainage : chaque candidat peut parrainer de nouveaux inscrits
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES candidates(id);

-- Index pour compter les parrainages par candidat
CREATE INDEX IF NOT EXISTS idx_candidates_referred_by ON candidates(referred_by);
