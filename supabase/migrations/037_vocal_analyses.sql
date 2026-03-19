-- 037_vocal_analyses.sql
-- Analyse vocale automatique des candidats (pipeline PCmusique Demucs + librosa)

CREATE TABLE IF NOT EXISTS vocal_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  -- Scores principaux
  justesse_pct REAL NOT NULL,                    -- % de justesse (gamme-adaptive)
  justesse_label TEXT NOT NULL DEFAULT 'N/A',    -- Excellent / Très bien / Bien / À travailler

  -- Tessiture détectée
  tessiture_low TEXT,           -- note grave (ex: 'E3')
  tessiture_low_midi INTEGER,   -- MIDI (ex: 52)
  tessiture_high TEXT,          -- note aiguë (ex: 'A5')
  tessiture_high_midi INTEGER,  -- MIDI (ex: 81)
  octaves REAL,                 -- étendue en octaves (ex: 2.4)
  voice_type TEXT,              -- soprano, mezzo, tenor, baryton, etc.

  -- Métriques détaillées
  stability_pct REAL,           -- % notes tenues >200ms
  vibrato_count INTEGER,        -- nombre d'oscillations détectées
  total_notes INTEGER,          -- nombre total de notes vocales
  zone_grave_pct REAL,          -- % du temps dans le grave
  zone_medium_pct REAL,         -- % du temps dans le médium
  zone_aigu_pct REAL,           -- % du temps dans l'aigu

  -- Infos chanson
  song_key TEXT,                -- tonalité détectée (ex: 'A# minor')
  song_key_confidence REAL,     -- confiance détection (0-1)
  song_bpm REAL,                -- BPM détecté

  -- Métadonnées pipeline
  demucs_job_id TEXT,           -- ID du job Demucs sur PCmusique
  processing_time_sec REAL,     -- temps total de traitement
  pipeline_version TEXT DEFAULT 'v1',
  raw_data JSONB,               -- données brutes complètes (pour debug)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, candidate_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_vocal_analyses_session ON vocal_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_vocal_analyses_candidate ON vocal_analyses(candidate_id);

-- RLS
ALTER TABLE vocal_analyses ENABLE ROW LEVEL SECURITY;

-- Admin peut tout faire
CREATE POLICY "Admin full access on vocal_analyses" ON vocal_analyses
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_vocal_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vocal_analyses_updated_at
  BEFORE UPDATE ON vocal_analyses
  FOR EACH ROW EXECUTE FUNCTION update_vocal_analyses_updated_at();
