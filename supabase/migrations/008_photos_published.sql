-- Add published flag to photos (default false = not visible on public site)
ALTER TABLE photos ADD COLUMN published BOOLEAN DEFAULT false;
