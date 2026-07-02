-- Migration 004: Payment domain
-- Tables: payments, payment_payouts, vendor_bank_accounts, webhook_events, invoices

BEGIN;

-- ============================================================
-- PAYMENTS
-- Individual milestone payments via Razorpay Route.
-- ============================================================
CREATE TABLE payments (
  id                    text PRIMARY KEY DEFAULT generate_ulid(),
  booking_id            text NOT NULL,
  milestone_id          text NOT NULL,
  customer_id           text NOT NULL,
  vendor_id             text NOT NULL,
  amount                integer NOT NULL,
  currency              varchar(3) NOT NULL DEFAULT 'INR',
  platform_fee          integer NOT NULL DEFAULT 0,
  gst_on_fee            integer NOT NULL DEFAULT 0,
  gateway_order_id      varchar(100),
  gateway_payment_id    varchar(100),
  payment_method        text,
  status                text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'initiated', 'captured', 'failed', 'refunded')),
  escrow_status         text NOT NULL DEFAULT 'none'
                        CHECK (escrow_status IN ('none', 'held', 'released', 'refunded', 'partially_refunded')),
  failure_reason        text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  captured_at           timestamptz,
  settled_at            timestamptz,

  CONSTRAINT chk_payment_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_platform_fee_non_negative CHECK (platform_fee >= 0),
  CONSTRAINT chk_gst_non_negative CHECK (gst_on_fee >= 0)
);

CREATE INDEX idx_pay_booking ON payments (booking_id);
CREATE INDEX idx_pay_milestone ON payments (milestone_id);
CREATE INDEX idx_pay_customer ON payments (customer_id);
CREATE INDEX idx_pay_vendor ON payments (vendor_id);
CREATE INDEX idx_pay_gateway_order ON payments (gateway_order_id);
CREATE INDEX idx_pay_status ON payments (status);
CREATE INDEX idx_pay_escrow ON payments (escrow_status);
CREATE INDEX idx_pay_created ON payments (created_at);

COMMENT ON TABLE payments IS 'Per-milestone payments via Razorpay Route. All amounts in paisa. Soft refs to booking domain';
COMMENT ON COLUMN payments.platform_fee IS 'Kritva commission in paisa, deducted from vendor payout';
COMMENT ON COLUMN payments.gst_on_fee IS '18% GST on platform_fee, in paisa';

-- ============================================================
-- PAYMENT_PAYOUTS
-- Vendor payouts via Razorpay Route Transfer API.
-- ============================================================
CREATE TABLE payment_payouts (
  id                    text PRIMARY KEY DEFAULT generate_ulid(),
  vendor_id             text NOT NULL,
  booking_id            text NOT NULL,
  payment_id            text NOT NULL REFERENCES payments(id),
  amount                integer NOT NULL,
  gateway_transfer_id   varchar(100),
  status                text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'initiated', 'completed', 'failed', 'reversed')),
  failure_reason        text,
  initiated_at          timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_payout_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_pp_vendor ON payment_payouts (vendor_id);
CREATE INDEX idx_pp_booking ON payment_payouts (booking_id);
CREATE INDEX idx_pp_status ON payment_payouts (status);
CREATE INDEX idx_pp_created ON payment_payouts (created_at);

COMMENT ON TABLE payment_payouts IS 'Vendor payouts. Amount is net after commission. vendor_id/booking_id are soft refs';

-- ============================================================
-- VENDOR_BANK_ACCOUNTS
-- Encrypted bank details for payout destination.
-- ============================================================
CREATE TABLE vendor_bank_accounts (
  id                    text PRIMARY KEY DEFAULT generate_ulid(),
  vendor_id             text NOT NULL,
  account_number_enc    bytea NOT NULL,
  ifsc_code             varchar(11) NOT NULL,
  account_holder_name   varchar(200) NOT NULL,
  last_four             varchar(4) NOT NULL,
  penny_drop_status     text NOT NULL DEFAULT 'pending'
                        CHECK (penny_drop_status IN ('pending', 'verified', 'failed')),
  razorpay_fund_id      varchar(100),
  verified_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_vba_vendor UNIQUE (vendor_id),
  CONSTRAINT chk_ifsc_format CHECK (ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  CONSTRAINT chk_last_four CHECK (length(last_four) = 4)
);

CREATE INDEX idx_vba_vendor ON vendor_bank_accounts (vendor_id);

COMMENT ON TABLE vendor_bank_accounts IS 'One bank account per vendor. account_number_enc is AES-256 encrypted. Never log raw';
COMMENT ON COLUMN vendor_bank_accounts.last_four IS 'Last 4 digits for display. Only value shown in UI';

-- ============================================================
-- WEBHOOK_EVENTS
-- Idempotency table for Razorpay webhook processing.
-- ============================================================
CREATE TABLE webhook_events (
  id                    text PRIMARY KEY DEFAULT generate_ulid(),
  source                text NOT NULL DEFAULT 'razorpay',
  event_id              varchar(200) NOT NULL,
  event_type            varchar(100) NOT NULL,
  payload               jsonb NOT NULL,
  signature_valid       boolean NOT NULL,
  processed             boolean NOT NULL DEFAULT false,
  processed_at          timestamptz,
  error                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_webhook_idempotency UNIQUE (source, event_id)
);

CREATE INDEX idx_we_processed ON webhook_events (processed);
CREATE INDEX idx_we_created ON webhook_events (created_at);
CREATE INDEX idx_we_type ON webhook_events (event_type);

COMMENT ON TABLE webhook_events IS 'Every webhook received is logged before processing. UNIQUE on (source, event_id) ensures exactly-once';

-- ============================================================
-- INVOICES
-- GST tax invoices and vendor settlement statements.
-- ============================================================

-- Sequence for human-readable invoice numbers: KR-2026-000001
CREATE SEQUENCE invoice_number_seq START WITH 1;

CREATE TABLE invoices (
  id                    text PRIMARY KEY DEFAULT generate_ulid(),
  booking_id            text NOT NULL,
  payment_id            text NOT NULL,
  type                  text NOT NULL CHECK (type IN ('customer_tax_invoice', 'vendor_settlement')),
  invoice_number        varchar(50) NOT NULL,
  amount                integer NOT NULL,
  gst_amount            integer NOT NULL,
  recipient_name        varchar(200) NOT NULL,
  recipient_gstin       varchar(15),
  pdf_url               text,
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_invoice_number UNIQUE (invoice_number),
  CONSTRAINT chk_invoice_amount_positive CHECK (amount >= 0),
  CONSTRAINT chk_invoice_gst_non_negative CHECK (gst_amount >= 0)
);

CREATE INDEX idx_inv_booking ON invoices (booking_id);
CREATE INDEX idx_inv_payment ON invoices (payment_id);
CREATE INDEX idx_inv_type ON invoices (type);

COMMENT ON TABLE invoices IS 'GST invoices. booking_id/payment_id are soft refs. invoice_number is human-readable sequential';
COMMENT ON COLUMN invoices.recipient_gstin IS 'GSTIN of recipient. Validated at application layer (15-char alphanumeric)';

COMMIT;
