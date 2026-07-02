-- Migration 001: Auth domain
-- Tables: users, otp_requests, refresh_tokens, device_tokens

BEGIN;

-- ============================================================
-- USERS
-- Single table for all roles. Role field determines behavior.
-- ============================================================
CREATE TABLE users (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  phone               varchar(15) NOT NULL,
  email               varchar(255),
  password_hash       varchar(255),
  name                varchar(100) NOT NULL,
  role                text NOT NULL CHECK (role IN ('customer', 'vendor', 'admin', 'superadmin')),
  city_id             varchar(50) NOT NULL DEFAULT 'delhi-ncr',
  avatar_url          text,
  event_interests     text[],
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  suspended_until     timestamptz,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  verified_at         timestamptz
);

CREATE UNIQUE INDEX idx_users_phone ON users (phone);
CREATE UNIQUE INDEX idx_users_email ON users (email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_city ON users (city_id);
CREATE INDEX idx_users_status ON users (status);

COMMENT ON TABLE users IS 'All platform users across roles: customer, vendor, admin, superadmin';
COMMENT ON COLUMN users.id IS 'ULID primary key — sortable, opaque, never sequential integers';
COMMENT ON COLUMN users.phone IS 'E.164 format, e.g. +919876543210';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash. NULL for OTP-only users';
COMMENT ON COLUMN users.city_id IS 'Multi-city ready from Day 1. MVP: delhi-ncr only';
COMMENT ON COLUMN users.event_interests IS 'Personalization seed: wedding, corporate, birthday, social';

-- ============================================================
-- OTP_REQUESTS
-- Short-lived OTP records for phone verification.
-- ============================================================
CREATE TABLE otp_requests (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  phone               varchar(15) NOT NULL,
  code_hash           varchar(255) NOT NULL,
  attempts            integer NOT NULL DEFAULT 0,
  expires_at          timestamptz NOT NULL,
  verified            boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_phone ON otp_requests (phone);
CREATE INDEX idx_otp_expires ON otp_requests (expires_at);

COMMENT ON TABLE otp_requests IS 'Phone OTP verification records. code_hash is bcrypt — never store plaintext OTP';
COMMENT ON COLUMN otp_requests.attempts IS 'Max 5 attempts per phone per hour, then 24h lockout';

-- ============================================================
-- REFRESH_TOKENS
-- JWT refresh tokens, hashed. Supports multi-device login.
-- ============================================================
CREATE TABLE refresh_tokens (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  user_id             text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash          varchar(255) NOT NULL,
  device_info         jsonb,
  expires_at          timestamptz NOT NULL,
  revoked_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens (expires_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE refresh_tokens IS 'Hashed JWT refresh tokens. One per device. Revoked on logout or suspicious activity';

-- ============================================================
-- DEVICE_TOKENS
-- Expo push notification tokens per user per device.
-- ============================================================
CREATE TABLE device_tokens (
  id                  text PRIMARY KEY DEFAULT generate_ulid(),
  user_id             text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token               text NOT NULL,
  platform            text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_device_token UNIQUE (user_id, token)
);

COMMENT ON TABLE device_tokens IS 'Expo push notification tokens. One row per device per user';

COMMIT;
