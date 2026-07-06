-- Migration 013: Vendor profile photo and media section (banner vs portfolio)

BEGIN;

ALTER TABLE vendors
  ADD COLUMN profile_photo_url text;

COMMENT ON COLUMN vendors.profile_photo_url IS 'Public profile photo URL (Supabase pfp bucket)';

ALTER TABLE vendor_media
  ADD COLUMN section text NOT NULL DEFAULT 'portfolio'
  CHECK (section IN ('banner', 'portfolio'));

COMMENT ON COLUMN vendor_media.section IS 'banner = hero gallery, portfolio = showcase grid';

CREATE INDEX idx_vm_section ON vendor_media (vendor_id, section);

COMMIT;
