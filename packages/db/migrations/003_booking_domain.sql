-- Migration 003: Booking domain
-- Tables: events, checklist_items, bookings, booking_milestones, booking_events

BEGIN;

-- ============================================================
-- EVENTS
-- Customer-side event planning container.
-- ============================================================
CREATE TABLE events (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  customer_id         text NOT NULL,
  name                varchar(200) NOT NULL,
  type                text NOT NULL CHECK (type IN ('wedding', 'corporate', 'birthday', 'social', 'other')),
  date                date,
  city_id             varchar(50) NOT NULL DEFAULT 'delhi-ncr',
  venue               text,
  guest_count         integer,
  budget_total        integer,
  budget_spent        integer NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'planning'
                      CHECK (status IN ('planning', 'in_progress', 'completed', 'cancelled')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_event_budget_positive CHECK (budget_total IS NULL OR budget_total >= 0),
  CONSTRAINT chk_event_guests_positive CHECK (guest_count IS NULL OR guest_count > 0)
);

CREATE INDEX idx_event_customer ON events (customer_id);
CREATE INDEX idx_event_date ON events (date);
CREATE INDEX idx_event_status ON events (status);

COMMENT ON TABLE events IS 'Customer event containers. Soft ref to users.id via customer_id (cross-domain)';
COMMENT ON COLUMN events.budget_total IS 'Total budget in paisa. NULL if customer has not set a budget';
COMMENT ON COLUMN events.budget_spent IS 'Computed sum of confirmed booking amounts. Updated by application logic';

-- ============================================================
-- CHECKLIST_ITEMS
-- Per-event vendor checklist + manual items.
-- ============================================================
CREATE TABLE checklist_items (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  event_id            text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title               varchar(200) NOT NULL,
  category            varchar(100),
  booking_id          text,
  is_manual           boolean NOT NULL DEFAULT false,
  completed           boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cli_event ON checklist_items (event_id);

COMMENT ON TABLE checklist_items IS 'Event planning checklist. Auto-populated from bookings, or manually added';
COMMENT ON COLUMN checklist_items.booking_id IS 'Soft reference to bookings.id. NULL for manual items';

-- ============================================================
-- BOOKINGS
-- The core transaction entity. Links customer, vendor, event.
-- ============================================================
CREATE TABLE bookings (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  event_id            text,
  vendor_id           text NOT NULL,
  customer_id         text NOT NULL,
  service_details     jsonb NOT NULL DEFAULT '{}',
  total_amount        integer NOT NULL,
  status              text NOT NULL DEFAULT 'inquiry'
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
                        'cancelled'
                      )),
  decline_reason      text,
  counter_amount      integer,
  counter_message     text,
  event_date          date NOT NULL,
  event_type          text NOT NULL,
  guest_count         integer,
  notes               text,
  city_id             varchar(50) NOT NULL DEFAULT 'delhi-ncr',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_booking_amount_positive CHECK (total_amount > 0),
  CONSTRAINT chk_counter_amount_positive CHECK (counter_amount IS NULL OR counter_amount > 0)
);

CREATE INDEX idx_booking_vendor ON bookings (vendor_id);
CREATE INDEX idx_booking_customer ON bookings (customer_id);
CREATE INDEX idx_booking_event ON bookings (event_id);
CREATE INDEX idx_booking_status ON bookings (status);
CREATE INDEX idx_booking_date ON bookings (event_date);
CREATE INDEX idx_booking_city ON bookings (city_id);
CREATE INDEX idx_booking_vendor_status ON bookings (vendor_id, status);
CREATE INDEX idx_booking_customer_status ON bookings (customer_id, status);

COMMENT ON TABLE bookings IS 'Core transaction entity. All IDs are soft references (cross-domain, no FK)';
COMMENT ON COLUMN bookings.total_amount IS 'Booking total in paisa';
COMMENT ON COLUMN bookings.service_details IS 'JSON: selected services, quantities, notes. Validated by Zod at API layer';

-- ============================================================
-- BOOKING_MILESTONES
-- Payment milestones: advance, pre-event, post-event.
-- ============================================================
CREATE TABLE booking_milestones (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  booking_id          text NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  name                text NOT NULL CHECK (name IN ('advance', 'pre_event', 'post_event', 'custom')),
  label               varchar(100) NOT NULL,
  amount              integer NOT NULL,
  percentage          numeric(5, 2) NOT NULL,
  due_date            date,
  payment_status      text NOT NULL DEFAULT 'pending'
                      CHECK (payment_status IN ('pending', 'payment_initiated', 'paid', 'held', 'released', 'refunded')),
  payment_id          text,
  released_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_milestone_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_milestone_pct_range CHECK (percentage > 0 AND percentage <= 100)
);

CREATE INDEX idx_bm_booking ON booking_milestones (booking_id);
CREATE INDEX idx_bm_status ON booking_milestones (payment_status);

COMMENT ON TABLE booking_milestones IS 'Escrow milestones per booking. Default split configured in platform_config';
COMMENT ON COLUMN booking_milestones.payment_id IS 'Soft reference to payments.id';

-- ============================================================
-- BOOKING_EVENTS
-- Append-only audit log of every booking state transition.
-- NEVER UPDATE OR DELETE rows in this table.
-- ============================================================
CREATE TABLE booking_events (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  booking_id          text NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status         text NOT NULL,
  to_status           text NOT NULL,
  actor_id            text NOT NULL,
  actor_role          text NOT NULL,
  metadata            jsonb,
  ip_address          inet,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_be_booking ON booking_events (booking_id);
CREATE INDEX idx_be_created ON booking_events (created_at);

-- Prevent updates and deletes on the append-only event log
CREATE OR REPLACE FUNCTION prevent_booking_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'booking_events is append-only. UPDATE and DELETE are prohibited.';
END;
$$;

CREATE TRIGGER trg_booking_events_no_update
  BEFORE UPDATE ON booking_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_booking_event_mutation();

CREATE TRIGGER trg_booking_events_no_delete
  BEFORE DELETE ON booking_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_booking_event_mutation();

COMMENT ON TABLE booking_events IS 'APPEND-ONLY event log. Every booking state transition is recorded here';

COMMIT;
