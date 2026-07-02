-- Migration 010: Row Level Security (RLS) policies
-- Enforces data isolation at the database layer.
--
-- Strategy:
--   - API server connects via service-role key (bypasses RLS) for admin operations.
--   - User-scoped operations use JWT-authenticated connections where
--     auth.uid()::text and auth.role() are set by Supabase.
--   - RLS is the SECOND layer of defense. Application-layer RBAC is the first.
--     Even if application code has a bug, RLS prevents cross-tenant data access.
--
-- Supabase sets these via JWT claims:
--   auth.uid()::text  → current user's id (from JWT sub claim)
--   auth.jwt()  → full JWT payload

BEGIN;

-- ============================================================
-- USERS
-- Users can read/write their own row.
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (id = auth.uid()::text);

CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

-- ============================================================
-- VENDORS
-- Public: anyone can read approved vendors.
-- Vendor: can read/write own row.
-- ============================================================
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendors_select_approved ON vendors
  FOR SELECT
  USING (verification_status = 'approved');

CREATE POLICY vendors_select_own ON vendors
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY vendors_insert_own ON vendors
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY vendors_update_own ON vendors
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- ============================================================
-- VENDOR_SERVICES
-- Public: readable for approved vendors.
-- Vendor: can manage own services.
-- ============================================================
ALTER TABLE vendor_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY vs_select ON vendor_services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_services.vendor_id
        AND (vendors.verification_status = 'approved' OR vendors.user_id = auth.uid()::text)
    )
  );

CREATE POLICY vs_insert_own ON vendor_services
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_services.vendor_id AND vendors.user_id = auth.uid()::text)
  );

CREATE POLICY vs_update_own ON vendor_services
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_services.vendor_id AND vendors.user_id = auth.uid()::text)
  );

CREATE POLICY vs_delete_own ON vendor_services
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_services.vendor_id AND vendors.user_id = auth.uid()::text)
  );

-- ============================================================
-- VENDOR_MEDIA
-- Same pattern as vendor_services.
-- ============================================================
ALTER TABLE vendor_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY vm_select ON vendor_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_media.vendor_id
        AND (vendors.verification_status = 'approved' OR vendors.user_id = auth.uid()::text)
    )
  );

CREATE POLICY vm_insert_own ON vendor_media
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_media.vendor_id AND vendors.user_id = auth.uid()::text)
  );

CREATE POLICY vm_update_own ON vendor_media
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_media.vendor_id AND vendors.user_id = auth.uid()::text)
  );

CREATE POLICY vm_delete_own ON vendor_media
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_media.vendor_id AND vendors.user_id = auth.uid()::text)
  );

-- ============================================================
-- VENDOR_AVAILABILITY
-- Public read for approved vendors. Vendor manages own.
-- ============================================================
ALTER TABLE vendor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY va_select ON vendor_availability
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = vendor_availability.vendor_id
        AND (vendors.verification_status = 'approved' OR vendors.user_id = auth.uid()::text)
    )
  );

CREATE POLICY va_manage_own ON vendor_availability
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_availability.vendor_id AND vendors.user_id = auth.uid()::text)
  );

-- ============================================================
-- VENDOR_DOCUMENTS
-- Vendor can manage own. No customer access (admin via service role).
-- ============================================================
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY vd_select_own ON vendor_documents
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_documents.vendor_id AND vendors.user_id = auth.uid()::text)
  );

CREATE POLICY vd_insert_own ON vendor_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_documents.vendor_id AND vendors.user_id = auth.uid()::text)
  );

-- ============================================================
-- EVENTS
-- Customer manages own events.
-- ============================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_select_own ON events
  FOR SELECT
  USING (customer_id = auth.uid()::text);

CREATE POLICY events_insert_own ON events
  FOR INSERT
  WITH CHECK (customer_id = auth.uid()::text);

CREATE POLICY events_update_own ON events
  FOR UPDATE
  USING (customer_id = auth.uid()::text)
  WITH CHECK (customer_id = auth.uid()::text);

CREATE POLICY events_delete_own ON events
  FOR DELETE
  USING (customer_id = auth.uid()::text);

-- ============================================================
-- CHECKLIST_ITEMS
-- Via event ownership.
-- ============================================================
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY cli_select_own ON checklist_items
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = checklist_items.event_id AND events.customer_id = auth.uid()::text)
  );

CREATE POLICY cli_manage_own ON checklist_items
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = checklist_items.event_id AND events.customer_id = auth.uid()::text)
  );

-- ============================================================
-- BOOKINGS
-- Customer sees own bookings (customer_id). Vendor sees own (vendor_id).
-- ============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY bookings_select_customer ON bookings
  FOR SELECT
  USING (customer_id = auth.uid()::text);

CREATE POLICY bookings_select_vendor ON bookings
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text));

CREATE POLICY bookings_insert_customer ON bookings
  FOR INSERT
  WITH CHECK (customer_id = auth.uid()::text);

CREATE POLICY bookings_update_customer ON bookings
  FOR UPDATE
  USING (customer_id = auth.uid()::text);

CREATE POLICY bookings_update_vendor ON bookings
  FOR UPDATE
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text));

-- ============================================================
-- BOOKING_MILESTONES
-- Visible to booking participants.
-- ============================================================
ALTER TABLE booking_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY bm_select ON booking_milestones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_milestones.booking_id
        AND (bookings.customer_id = auth.uid()::text
             OR bookings.vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text))
    )
  );

-- ============================================================
-- BOOKING_EVENTS
-- Visible to booking participants. No writes via RLS (service role only).
-- ============================================================
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY be_select ON booking_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_events.booking_id
        AND (bookings.customer_id = auth.uid()::text
             OR bookings.vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text))
    )
  );

-- ============================================================
-- PAYMENTS
-- Visible to customer and vendor of the booking.
-- ============================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select ON payments
  FOR SELECT
  USING (customer_id = auth.uid()::text OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text));

-- ============================================================
-- PAYMENT_PAYOUTS
-- Vendor sees own payouts.
-- ============================================================
ALTER TABLE payment_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY pp_select_vendor ON payment_payouts
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text));

-- ============================================================
-- VENDOR_BANK_ACCOUNTS
-- Vendor manages own bank account.
-- ============================================================
ALTER TABLE vendor_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY vba_select_own ON vendor_bank_accounts
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text));

CREATE POLICY vba_insert_own ON vendor_bank_accounts
  FOR INSERT
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text));

CREATE POLICY vba_update_own ON vendor_bank_accounts
  FOR UPDATE
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text));

-- ============================================================
-- CONVERSATIONS
-- Visible to customer and vendor of the conversation.
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conv_select ON conversations
  FOR SELECT
  USING (customer_id = auth.uid()::text OR vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text));

-- ============================================================
-- MESSAGES
-- Visible to conversation participants. Both can insert.
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY msg_select ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.customer_id = auth.uid()::text
             OR conversations.vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text))
    )
  );

CREATE POLICY msg_insert ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.customer_id = auth.uid()::text
             OR conversations.vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text))
    )
  );

-- ============================================================
-- NOTIFICATION_PREFERENCES
-- User manages own.
-- ============================================================
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notif_select_own ON notification_preferences
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY notif_manage_own ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid()::text);

-- ============================================================
-- REVIEWS
-- Public read. Customer can insert for own bookings.
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reviews_select_all ON reviews
  FOR SELECT
  USING (true);

CREATE POLICY reviews_insert_own ON reviews
  FOR INSERT
  WITH CHECK (reviewer_id = auth.uid()::text);

-- ============================================================
-- DISPUTES
-- Visible to dispute raiser. Admin via service role.
-- ============================================================
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY disputes_select_own ON disputes
  FOR SELECT
  USING (raised_by = auth.uid()::text);

CREATE POLICY disputes_insert ON disputes
  FOR INSERT
  WITH CHECK (raised_by = auth.uid()::text);

-- ============================================================
-- AUDIT_LOGS
-- No user access. Append via service role only.
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- No policies = no access for non-service-role connections.

-- ============================================================
-- WEBHOOK_EVENTS
-- No user access. Service role only.
-- ============================================================
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies = no access for non-service-role connections.

-- ============================================================
-- INVOICES
-- Customer and vendor of the booking can read.
-- ============================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_select ON invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments
      WHERE payments.id = invoices.payment_id
        AND (payments.customer_id = auth.uid()::text
             OR payments.vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()::text))
    )
  );

-- ============================================================
-- PLATFORM_CONFIG
-- Public read (needed for frontend commission display).
-- Write via service role only.
-- ============================================================
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY config_select_all ON platform_config
  FOR SELECT
  USING (true);

COMMIT;
