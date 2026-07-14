-- Migration 015: Vendor draft status and submitted_at for go-live workflow

BEGIN;

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_verification_status_check;

ALTER TABLE vendors
  ADD CONSTRAINT vendors_verification_status_check
  CHECK (verification_status IN (
    'draft',
    'pending_review',
    'approved',
    'rejected',
    'suspended'
  ));

ALTER TABLE vendors
  ALTER COLUMN verification_status SET DEFAULT 'draft';

ALTER TABLE vendors
  ADD COLUMN submitted_at timestamptz;

COMMENT ON COLUMN vendors.submitted_at IS 'When the vendor submitted their profile for admin review';

-- Incomplete pending_review profiles should not sit in the admin queue
UPDATE vendors v
SET
  verification_status = 'draft',
  updated_at = now()
WHERE v.verification_status = 'pending_review'
  AND (
    cardinality(v.category) = 0
    OR NOT EXISTS (
      SELECT 1
      FROM vendor_services vs
      WHERE vs.vendor_id = v.id
        AND vs.is_active = true
    )
    OR (
      SELECT COUNT(*)::int
      FROM vendor_media vm
      WHERE vm.vendor_id = v.id
        AND vm.section = 'portfolio'
    ) < 5
  );

COMMIT;
