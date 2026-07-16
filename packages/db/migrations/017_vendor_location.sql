-- Migration 017: Studio / venue Google Maps location on vendors

BEGIN;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS location_name varchar(200),
  ADD COLUMN IF NOT EXISTS location_address text,
  ADD COLUMN IF NOT EXISTS location_lat numeric(10, 7),
  ADD COLUMN IF NOT EXISTS location_lng numeric(10, 7),
  ADD COLUMN IF NOT EXISTS location_maps_url text;

COMMENT ON COLUMN vendors.location_name IS 'Display name for studio/venue (e.g. Grand Farmhouse)';
COMMENT ON COLUMN vendors.location_address IS 'Formatted address from Google Maps';
COMMENT ON COLUMN vendors.location_lat IS 'Latitude of studio/venue pin';
COMMENT ON COLUMN vendors.location_lng IS 'Longitude of studio/venue pin';
COMMENT ON COLUMN vendors.location_maps_url IS 'Google Maps URL for the studio/venue pin';

ALTER TABLE vendors
  DROP CONSTRAINT IF EXISTS vendors_location_coords_check;

ALTER TABLE vendors
  ADD CONSTRAINT vendors_location_coords_check
  CHECK (
    (location_lat IS NULL AND location_lng IS NULL)
    OR (location_lat IS NOT NULL AND location_lng IS NOT NULL)
  );

COMMIT;
