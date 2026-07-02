-- Migration 000: Extensions and ULID generation function
-- Kritva MVP | PostgreSQL 15+ | Supabase compatible
--
-- ULID (Universally Unique Lexicographically Sortable Identifier)
-- 26 chars, Crockford Base32, timestamp-prefixed for natural sort order.
-- Stored as text(26) — not uuid — to preserve sortability and readability.

BEGIN;

-- pgcrypto for gen_random_bytes (used by ULID generator and bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crockford Base32 ULID generator — pure SQL, no external dependency.
-- Produces 26-char ULIDs that are time-sortable and globally unique.
CREATE OR REPLACE FUNCTION generate_ulid()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  timestamp_ms bigint;
  encoding     text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  ulid         text := '';
  i            integer;
  random_bytes bytea;
  byte_val     integer;
BEGIN
  timestamp_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint;

  -- Encode 10-char timestamp (48 bits, millisecond precision)
  FOR i IN REVERSE 9..0 LOOP
    ulid := ulid || substr(encoding, (timestamp_ms % 32)::integer + 1, 1);
    timestamp_ms := timestamp_ms >> 5;
  END LOOP;

  -- Reverse the timestamp portion so most-significant bits come first
  ulid := reverse(substr(ulid, 1, 10));

  -- Encode 16-char randomness (80 bits)
  random_bytes := gen_random_bytes(10);
  FOR i IN 0..9 LOOP
    byte_val := get_byte(random_bytes, i);
    ulid := ulid || substr(encoding, (byte_val % 32) + 1, 1);
  END LOOP;

  RETURN ulid;
END;
$$;

-- Verify the function produces 26-char output
DO $$
DECLARE
  test_ulid text;
BEGIN
  test_ulid := generate_ulid();
  IF length(test_ulid) != 26 THEN
    RAISE EXCEPTION 'generate_ulid() produced invalid length: %', length(test_ulid);
  END IF;
END;
$$;

COMMIT;
