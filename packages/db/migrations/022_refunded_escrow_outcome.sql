-- Migration 022: booking refunded status + escrow_outcome
-- Extends bookings.status CHECK (from 003) with 'refunded' and adds a
-- nullable escrow_outcome for admin refund/split/release decisions (M1).

BEGIN;

-- PostgreSQL names an inline CHECK on status as bookings_status_check.
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'inquiry',
    'vendor_reviewing',
    'vendor_accepted',
    'vendor_declined',
    'vendor_countered',
    'customer_confirmed',
    'payment_pending',
    'payment_held',
    'in_progress',
    'completed',
    'payment_released',
    'disputed',
    'cancelled',
    'refunded'
  ));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS escrow_outcome text;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS chk_booking_escrow_outcome;

ALTER TABLE bookings
  ADD CONSTRAINT chk_booking_escrow_outcome
  CHECK (
    escrow_outcome IS NULL
    OR escrow_outcome IN ('released', 'refunded', 'split')
  );

COMMENT ON COLUMN bookings.escrow_outcome IS
  'Terminal escrow disposition when money leaves hold: released | refunded | split. NULL until decided.';

COMMIT;
