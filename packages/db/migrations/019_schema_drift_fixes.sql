-- Migration 019: Schema drift fixes (remediation P2.5)
-- Align live DB defaults/constraints with intended schema.
-- CASCADE FKs already exist from 002; re-asserted where safe.
-- Drizzle date/integer/references drift is corrected in packages/db/src/schema.

BEGIN;

-- ============================================================
-- bookings.package_details: rename in 016 preserved DEFAULT '{}'
-- ============================================================
ALTER TABLE bookings
  ALTER COLUMN package_details SET DEFAULT '[]'::jsonb;

UPDATE bookings
SET package_details = '[]'::jsonb
WHERE jsonb_typeof(package_details) = 'object'
  AND package_details = '{}'::jsonb;

-- ============================================================
-- booking_milestones: one row per named milestone per booking
-- ============================================================
ALTER TABLE booking_milestones
  DROP CONSTRAINT IF EXISTS uq_bm_booking_name;

ALTER TABLE booking_milestones
  ADD CONSTRAINT uq_bm_booking_name UNIQUE (booking_id, name);

-- ============================================================
-- Re-assert ON DELETE CASCADE FKs (no-op if already correct)
-- ============================================================
ALTER TABLE vendors
  DROP CONSTRAINT IF EXISTS vendors_user_id_fkey;
ALTER TABLE vendors
  ADD CONSTRAINT vendors_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE vendor_media
  DROP CONSTRAINT IF EXISTS vendor_media_vendor_id_fkey;
ALTER TABLE vendor_media
  ADD CONSTRAINT vendor_media_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

ALTER TABLE vendor_availability
  DROP CONSTRAINT IF EXISTS vendor_availability_vendor_id_fkey;
ALTER TABLE vendor_availability
  ADD CONSTRAINT vendor_availability_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

ALTER TABLE vendor_documents
  DROP CONSTRAINT IF EXISTS vendor_documents_vendor_id_fkey;
ALTER TABLE vendor_documents
  ADD CONSTRAINT vendor_documents_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

-- vendor_availability.date is already `date` with uq_vendor_date from 002.
-- otp_requests.attempts is already integer from 001 (Drizzle was wrong).

COMMENT ON CONSTRAINT uq_bm_booking_name ON booking_milestones IS
  'At most one milestone of each name per booking';

COMMIT;
