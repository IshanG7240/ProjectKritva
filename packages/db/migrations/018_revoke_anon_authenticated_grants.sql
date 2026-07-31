-- Migration 018: Revoke PostgREST table grants from anon/authenticated
--
-- Supabase defaults grant CRUD on public tables to anon and authenticated.
-- The anon key ships in the browser bundle and can hit PostgREST directly,
-- bypassing the Hono API. Existing RLS policies constrain rows but not
-- columns (e.g. users.role), so write grants are privilege escalation.
--
-- The web app only uses supabase.auth.* and supabase.storage.* — never
-- PostgREST for tables. The API connects as table owner and bypasses RLS.
-- Revoking these grants costs nothing and closes the escalation path.
-- RLS policies are kept as defence in depth.

BEGIN;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

COMMIT;
