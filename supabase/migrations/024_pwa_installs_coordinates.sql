-- Add latitude/longitude to pwa_installs for map display
ALTER TABLE pwa_installs ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE pwa_installs ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
