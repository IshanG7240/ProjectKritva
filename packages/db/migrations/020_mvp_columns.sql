-- Migration 020: MVP photography foundations (M0)
-- category_configs, booking origin/commission, briefs, demo flag,
-- payments.mode, and correct stale 011 seed values.

BEGIN;

-- ============================================================
-- category_configs (one photography row; commission 2% = 200 bps)
-- ============================================================
CREATE TABLE IF NOT EXISTS category_configs (
  id                    text PRIMARY KEY,
  contract_type         text NOT NULL
                        CHECK (contract_type IN ('direct', 'quote', 'allocated')),
  pricing_units         text[] NOT NULL DEFAULT '{}',
  quantity_label        text,
  brief_fields          jsonb NOT NULL DEFAULT '[]'::jsonb,
  proof_required        jsonb NOT NULL DEFAULT '{}'::jsonb,
  min_lead_time_days    integer NOT NULL DEFAULT 0,
  min_portfolio_photos  integer NOT NULL DEFAULT 0,
  commission_bps        integer NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_cc_commission_bps_nonneg CHECK (commission_bps >= 0),
  CONSTRAINT chk_cc_min_lead_nonneg CHECK (min_lead_time_days >= 0),
  CONSTRAINT chk_cc_min_portfolio_nonneg CHECK (min_portfolio_photos >= 0)
);

COMMENT ON TABLE category_configs IS
  'Per-category marketplace config. commission_bps is the live rate; bookings snapshot at accept.';
COMMENT ON COLUMN category_configs.commission_bps IS
  'Platform fee in basis points. 200 = 2%. Integer only — never float.';

INSERT INTO category_configs (
  id, contract_type, pricing_units, quantity_label, brief_fields,
  proof_required, min_lead_time_days, min_portfolio_photos, commission_bps
) VALUES (
  'photography',
  'direct',
  ARRAY['flat', 'per_day', 'per_hour']::text[],
  'Days',
  '[
    {"key":"coverage_hours","label":"Hours of coverage","type":"number","required":true},
    {"key":"shooters","label":"Photographers needed","type":"number","required":true},
    {"key":"deliverables","label":"What you need","type":"multi",
      "options":["Edited photos","Raw files","Album","Video","Drone","Same-day edit"]},
    {"key":"delivery_days","label":"Delivery deadline","type":"number","required":false}
  ]'::jsonb,
  '{"type":"link_plus_note","label":"Gallery link"}'::jsonb,
  3,
  5,
  200
)
ON CONFLICT (id) DO UPDATE SET
  contract_type = EXCLUDED.contract_type,
  pricing_units = EXCLUDED.pricing_units,
  quantity_label = EXCLUDED.quantity_label,
  brief_fields = EXCLUDED.brief_fields,
  proof_required = EXCLUDED.proof_required,
  min_lead_time_days = EXCLUDED.min_lead_time_days,
  min_portfolio_photos = EXCLUDED.min_portfolio_photos,
  commission_bps = EXCLUDED.commission_bps,
  updated_at = now();

-- ============================================================
-- bookings.origin + bookings.commission_bps
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'direct';

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_origin_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_origin_check
  CHECK (origin IN ('direct', 'quote', 'allocated'));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS commission_bps integer;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS chk_booking_commission_bps_nonneg;
ALTER TABLE bookings
  ADD CONSTRAINT chk_booking_commission_bps_nonneg
  CHECK (commission_bps IS NULL OR commission_bps >= 0);

COMMENT ON COLUMN bookings.origin IS
  'How the booking was created: direct | quote | allocated';
COMMENT ON COLUMN bookings.commission_bps IS
  'Commission snapshotted at vendor accept. NULL until accept. Release reads this, never live config.';

-- ============================================================
-- briefs (structured enquiry answers; notes stay free text)
-- ============================================================
CREATE TABLE IF NOT EXISTS briefs (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  booking_id          text NOT NULL,
  category            text NOT NULL,
  event_type          text NOT NULL,
  answers             jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version      integer NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_brief_booking UNIQUE (booking_id),
  CONSTRAINT chk_brief_schema_version_positive CHECK (schema_version > 0)
);

CREATE INDEX IF NOT EXISTS idx_brief_booking ON briefs (booking_id);

COMMENT ON TABLE briefs IS
  'Structured booking requirements. One brief per booking. answers validated against category_configs.brief_fields';

-- ============================================================
-- vendors.user_id nullable + vendors.is_demo
-- ============================================================
ALTER TABLE vendors
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN vendors.user_id IS
  'Owner users.id. NULL for pre-signup vendor shells (lead outreach before account).';
COMMENT ON COLUMN vendors.is_demo IS
  'True for marketplace demo vendors. Simulated payments may only book is_demo vendors.';

UPDATE vendors
SET is_demo = true
WHERE slug IN (
  'spice-route-caterers',
  'aperture-stories',
  'the-orchid-estate',
  'iit-photography-wale-vbhr'
);

-- ============================================================
-- payments.mode
-- ============================================================
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS mode text;

UPDATE payments
SET mode = 'simulated'
WHERE mode IS NULL;

ALTER TABLE payments
  ALTER COLUMN mode SET DEFAULT 'simulated';

ALTER TABLE payments
  ALTER COLUMN mode SET NOT NULL;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_mode_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_mode_check
  CHECK (mode IN ('simulated', 'live'));

COMMENT ON COLUMN payments.mode IS
  'Ledger mode written at creation. Cross-mode release/refund/transfer must be refused.';

-- ============================================================
-- Correct stale platform_config seed from 011 (ON CONFLICT DO NOTHING)
-- ============================================================
DELETE FROM platform_config
WHERE key IN (
  'vendor_commission_pct',
  'customer_commission_pct',
  'default_milestones',
  'default_milestone_labels'
);

INSERT INTO platform_config (key, value) VALUES
  ('default_commission_bps', '200'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- EVENT_TYPES CHECK on events.type unchanged — packages/types EVENT_TYPES
-- still wedding|corporate|birthday|social|other; no MVP additions.

COMMIT;
