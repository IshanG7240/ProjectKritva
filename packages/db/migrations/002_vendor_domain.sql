-- Migration 002: Vendor domain
-- Tables: vendors, vendor_services, vendor_media, vendor_availability, vendor_documents

BEGIN;

-- ============================================================
-- VENDORS
-- One vendor per user. Slug is the public-facing URL identifier.
-- ============================================================
CREATE TABLE vendors (
  id                    text PRIMARY KEY DEFAULT generate_ulid(),
  user_id               text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name         varchar(200) NOT NULL,
  slug                  varchar(200) NOT NULL,
  category              text[] NOT NULL DEFAULT '{}',
  city_id               varchar(50) NOT NULL DEFAULT 'delhi-ncr',
  description           text,
  years_in_business     integer,
  avg_rating            numeric(3, 2) NOT NULL DEFAULT 0,
  rating_count          integer NOT NULL DEFAULT 0,
  booking_count         integer NOT NULL DEFAULT 0,
  response_time_hours   numeric(5, 1),
  verification_status   text NOT NULL DEFAULT 'pending_review'
                        CHECK (verification_status IN ('pending_review', 'approved', 'rejected', 'suspended')),
  verification_notes    text,
  verified_at           timestamptz,
  verified_by           text,
  search_vector         tsvector,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_vendor_user UNIQUE (user_id),
  CONSTRAINT uq_vendor_slug UNIQUE (slug)
);

CREATE INDEX idx_vendor_user ON vendors (user_id);
CREATE INDEX idx_vendor_slug ON vendors (slug);
CREATE INDEX idx_vendor_city ON vendors (city_id);
CREATE INDEX idx_vendor_category ON vendors USING GIN (category);
CREATE INDEX idx_vendor_status ON vendors (verification_status);
CREATE INDEX idx_vendor_search ON vendors USING GIN (search_vector);
CREATE INDEX idx_vendor_rating ON vendors (avg_rating DESC);
CREATE INDEX idx_vendor_city_status ON vendors (city_id, verification_status);

COMMENT ON TABLE vendors IS 'Vendor profiles. One per user. Slug used in public URLs /vendors/{slug}';
COMMENT ON COLUMN vendors.category IS 'Array of service categories: catering, photography, venue, decor, etc.';
COMMENT ON COLUMN vendors.avg_rating IS 'Cached aggregate. Updated on review insert via application logic';
COMMENT ON COLUMN vendors.search_vector IS 'tsvector for PostgreSQL full-text search. Updated via trigger';
COMMENT ON COLUMN vendors.verified_by IS 'Soft reference to admin users.id who approved this vendor';

-- ============================================================
-- VENDOR_SERVICES
-- Service offerings with price ranges in paisa.
-- ============================================================
CREATE TABLE vendor_services (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  vendor_id           text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name                varchar(200) NOT NULL,
  description         text,
  price_min           integer NOT NULL,
  price_max           integer NOT NULL,
  unit                text NOT NULL DEFAULT 'per_event'
                      CHECK (unit IN ('per_event', 'per_plate', 'per_hour', 'per_day', 'fixed')),
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_price_range CHECK (price_max >= price_min),
  CONSTRAINT chk_price_positive CHECK (price_min >= 0)
);

CREATE INDEX idx_vs_vendor ON vendor_services (vendor_id);
CREATE INDEX idx_vs_active ON vendor_services (vendor_id) WHERE is_active = true;

COMMENT ON TABLE vendor_services IS 'Service offerings per vendor. Prices stored in paisa (INR × 100)';

-- ============================================================
-- VENDOR_MEDIA
-- Portfolio images/videos with responsive variants.
-- ============================================================
CREATE TABLE vendor_media (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  vendor_id           text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  url                 text NOT NULL,
  thumbnail_url       text,
  detail_url          text,
  type                text NOT NULL DEFAULT 'image' CHECK (type IN ('image', 'video')),
  position            integer NOT NULL DEFAULT 0,
  alt_text            varchar(255),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vm_vendor ON vendor_media (vendor_id);
CREATE INDEX idx_vm_position ON vendor_media (vendor_id, position);

COMMENT ON TABLE vendor_media IS 'Vendor portfolio. url=full (2000px), thumbnail_url=400px, detail_url=1200px';
COMMENT ON COLUMN vendor_media.position IS 'Drag-and-drop ordering. 0-based.';

-- ============================================================
-- VENDOR_AVAILABILITY
-- Date-level availability. Not time-slot-based at MVP.
-- ============================================================
CREATE TABLE vendor_availability (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  vendor_id           text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  date                date NOT NULL,
  is_available        boolean NOT NULL DEFAULT true,
  booking_id          text,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_vendor_date UNIQUE (vendor_id, date)
);

CREATE INDEX idx_va_vendor_date ON vendor_availability (vendor_id, date);
CREATE INDEX idx_va_available ON vendor_availability (vendor_id, date) WHERE is_available = true;

COMMENT ON TABLE vendor_availability IS 'Per-date availability. booking_id set when auto-blocked by accepted booking';
COMMENT ON COLUMN vendor_availability.booking_id IS 'Soft reference to bookings.id if date blocked by a booking';

-- ============================================================
-- VENDOR_DOCUMENTS
-- KYC documents (PAN, GST cert). Stored in private R2 bucket.
-- ============================================================
CREATE TABLE vendor_documents (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  vendor_id           text NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type                text NOT NULL CHECK (type IN ('pan', 'gst_certificate', 'business_registration', 'other')),
  url                 text NOT NULL,
  file_name           varchar(255) NOT NULL,
  verified            boolean NOT NULL DEFAULT false,
  verified_at         timestamptz,
  verified_by         text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vd_vendor ON vendor_documents (vendor_id);

COMMENT ON TABLE vendor_documents IS 'KYC documents. URLs point to private R2 bucket with access control';
COMMENT ON COLUMN vendor_documents.verified_by IS 'Soft reference to admin users.id';

COMMIT;
