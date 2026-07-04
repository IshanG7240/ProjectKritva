-- Migration 012: Allow OAuth users without a phone number
-- Google/social sign-in does not provide phone; phone is collected during onboarding.

BEGIN;

ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

COMMENT ON COLUMN users.phone IS 'E.164 format, e.g. +919876543210. NULL until collected (OAuth users).';

COMMIT;
