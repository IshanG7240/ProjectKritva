-- Migration 007: Reviews
-- Cross-domain table, owned by Vendor domain.
-- One review per completed booking.

BEGIN;

CREATE TABLE reviews (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  booking_id          text NOT NULL,
  reviewer_id         text NOT NULL,
  vendor_id           text NOT NULL,
  rating              integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content             text,
  media_urls          text[],
  verified            boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_review_booking UNIQUE (booking_id)
);

CREATE INDEX idx_review_vendor ON reviews (vendor_id);
CREATE INDEX idx_review_rating ON reviews (vendor_id, rating);
CREATE INDEX idx_review_reviewer ON reviews (reviewer_id);
CREATE INDEX idx_review_created ON reviews (created_at);

COMMENT ON TABLE reviews IS 'Verified reviews. One per booking. Only allowed after booking status = completed';
COMMENT ON COLUMN reviews.booking_id IS 'Soft reference to bookings.id. UNIQUE constraint enforces one review per booking';
COMMENT ON COLUMN reviews.verified IS 'Always true at MVP — review creation gated by booking completion in application logic';

COMMIT;
