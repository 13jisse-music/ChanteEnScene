-- Add performance timing columns to lineup table
ALTER TABLE lineup ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE lineup ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
