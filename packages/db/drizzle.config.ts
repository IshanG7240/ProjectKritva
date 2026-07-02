/**
 * drizzle.config.ts – T-007
 *
 * Used by drizzle-kit for:
 *   pnpm db:generate   – generate SQL migration files from schema changes
 *   pnpm db:migrate    – apply generated migrations to the database
 *   pnpm db:studio     – open Drizzle Studio
 *
 * IMPORTANT: drizzle-kit must connect via the *direct* Postgres URL (no PgBouncer).
 * PgBouncer in transaction mode does not support the session-level DDL statements
 * that drizzle-kit issues. Use DATABASE_URL_DIRECT for all drizzle-kit commands.
 *
 * The raw SQL migrations under ./migrations/ are the authoritative source of truth
 * for the production database (applied via the Supabase CLI / run_all.sh). The
 * Drizzle-kit migrations here are an additional convenience layer for local
 * development and schema diffing only.
 */

import { defineConfig } from "drizzle-kit";

const directUrl = process.env["DATABASE_URL_DIRECT"];
if (!directUrl) {
  throw new Error(
    "[@kritva/db] DATABASE_URL_DIRECT is not set. " +
      "Copy .env.example to .env and fill in the Supabase direct connection URL.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    url: directUrl,
  },
  // Verbose output helps debugging during development.
  verbose: true,
  // Strict mode: drizzle-kit will error on potentially destructive changes.
  strict: true,
});
