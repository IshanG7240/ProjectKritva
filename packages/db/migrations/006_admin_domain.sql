-- Migration 006: Admin domain
-- Tables: platform_config, disputes, audit_logs

BEGIN;

-- ============================================================
-- PLATFORM_CONFIG
-- Key-value configuration. Commission rates, SLAs, defaults.
-- ============================================================
CREATE TABLE platform_config (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  key                 varchar(100) NOT NULL,
  value               jsonb NOT NULL,
  updated_by          text,
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_config_key UNIQUE (key)
);

COMMENT ON TABLE platform_config IS 'Platform-wide configuration. Adjustable via admin panel without code deploys';
COMMENT ON COLUMN platform_config.value IS 'JSON value. Type depends on key. Validated at application layer';
COMMENT ON COLUMN platform_config.updated_by IS 'Soft reference to admin users.id who last changed this setting';

-- ============================================================
-- DISPUTES
-- Booking disputes raised by customer or vendor.
-- ============================================================
CREATE TABLE disputes (
  id                      text PRIMARY KEY DEFAULT generate_ulid(),
  booking_id              text NOT NULL,
  raised_by               text NOT NULL,
  raised_by_role          text NOT NULL CHECK (raised_by_role IN ('customer', 'vendor')),
  reason                  text NOT NULL,
  description             text NOT NULL,
  evidence_urls           text[],
  vendor_response         text,
  vendor_evidence_urls    text[],
  status                  text NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'under_review', 'resolved_vendor', 'resolved_customer', 'resolved_split')),
  resolution_notes        text,
  resolved_by             text,
  resolved_at             timestamptz,
  requires_dual_approval  boolean NOT NULL DEFAULT false,
  approved_by             text[],
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispute_booking ON disputes (booking_id);
CREATE INDEX idx_dispute_status ON disputes (status);
CREATE INDEX idx_dispute_raised_by ON disputes (raised_by);
CREATE INDEX idx_dispute_created ON disputes (created_at);

COMMENT ON TABLE disputes IS 'Booking disputes. All user ID fields are soft refs. Dual-approval for amounts > ₹1 Lakh';
COMMENT ON COLUMN disputes.requires_dual_approval IS 'Set to true by application when booking amount > 10000000 paisa (₹1 Lakh)';
COMMENT ON COLUMN disputes.approved_by IS 'Array of admin user IDs who approved the resolution';

-- ============================================================
-- AUDIT_LOGS
-- Append-only audit trail. Every state-changing admin action.
-- Retain for 7 years per RBI requirements.
-- ============================================================
CREATE TABLE audit_logs (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  actor_id            text NOT NULL,
  actor_role          text NOT NULL,
  action              varchar(100) NOT NULL,
  resource_type       varchar(50) NOT NULL,
  resource_id         text NOT NULL,
  old_value           jsonb,
  new_value           jsonb,
  ip_address          inet,
  user_agent          text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_al_actor ON audit_logs (actor_id);
CREATE INDEX idx_al_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_al_created ON audit_logs (created_at);
CREATE INDEX idx_al_action ON audit_logs (action);

-- Prevent updates and deletes on the append-only audit log
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only. UPDATE and DELETE are prohibited.';
END;
$$;

CREATE TRIGGER trg_audit_logs_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER trg_audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

COMMENT ON TABLE audit_logs IS 'APPEND-ONLY. Every admin action logged. Retain 7 years (RBI financial records)';
COMMENT ON COLUMN audit_logs.action IS 'Dot-notation: vendor.approve, payment.release, user.suspend, dispute.resolve, etc.';

COMMIT;
