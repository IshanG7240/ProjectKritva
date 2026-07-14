-- Promote an existing public.users row to admin by email (idempotent).
--
-- Prerequisites:
--   1. Create the user in Supabase Auth (same email).
--   2. Sign in once so /v1/auth/sync inserts public.users with that auth UUID as id.
--
-- Usage (replace the email literal):
--   psql "$DATABASE_URL" -f packages/db/scripts/promote-admin.sql
-- Or run the TypeScript helper:
--   pnpm --filter @kritva/db exec tsx src/promote-admin.ts you@example.com

UPDATE public.users
SET
  role = 'admin',
  onboarding_complete = true,
  updated_at = now()
WHERE lower(email) = lower('you@example.com');
