-- Add latitude/longitude to page_views for precise map markers
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
