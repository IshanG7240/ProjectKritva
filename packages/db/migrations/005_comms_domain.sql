-- Migration 005: Comms domain
-- Tables: conversations, messages, notification_preferences

BEGIN;

-- ============================================================
-- CONVERSATIONS
-- One conversation per booking. Links customer and vendor.
-- ============================================================
CREATE TABLE conversations (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  booking_id          text NOT NULL,
  customer_id         text NOT NULL,
  vendor_id           text NOT NULL,
  last_message_at     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_conv_booking UNIQUE (booking_id)
);

CREATE INDEX idx_conv_customer ON conversations (customer_id);
CREATE INDEX idx_conv_vendor ON conversations (vendor_id);
CREATE INDEX idx_conv_last_msg ON conversations (last_message_at DESC NULLS LAST);

COMMENT ON TABLE conversations IS 'One conversation per booking. All IDs are soft refs (cross-domain)';

-- ============================================================
-- MESSAGES
-- Chat messages within a conversation.
-- ============================================================
CREATE TABLE messages (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  conversation_id     text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id           text NOT NULL,
  content             text NOT NULL,
  type                text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'system')),
  media_url           text,
  flagged             boolean NOT NULL DEFAULT false,
  flag_reason         text,
  read_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_msg_conversation ON messages (conversation_id);
CREATE INDEX idx_msg_conversation_created ON messages (conversation_id, created_at);
CREATE INDEX idx_msg_sender ON messages (sender_id);
CREATE INDEX idx_msg_unread ON messages (conversation_id, read_at) WHERE read_at IS NULL;

COMMENT ON TABLE messages IS 'Chat messages. Phone numbers masked in content pre-booking. Flagged messages reviewed by admin';
COMMENT ON COLUMN messages.flagged IS 'True if automated detection found phone numbers or payment keywords pre-booking';

-- ============================================================
-- NOTIFICATION_PREFERENCES
-- Per-user notification channel preferences.
-- ============================================================
CREATE TABLE notification_preferences (
  id                    text PRIMARY KEY DEFAULT generate_ulid(),
  user_id               text NOT NULL,
  push_bookings         boolean NOT NULL DEFAULT true,
  push_messages         boolean NOT NULL DEFAULT true,
  push_payments         boolean NOT NULL DEFAULT true,
  push_marketing        boolean NOT NULL DEFAULT false,
  sms_bookings          boolean NOT NULL DEFAULT true,
  sms_payments          boolean NOT NULL DEFAULT true,
  email_bookings        boolean NOT NULL DEFAULT true,
  email_payments        boolean NOT NULL DEFAULT true,
  email_weekly_summary  boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_notif_user UNIQUE (user_id)
);

COMMENT ON TABLE notification_preferences IS 'Per-user notification channel preferences. OTP SMS is always-on regardless of prefs';

COMMIT;
