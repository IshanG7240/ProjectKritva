/**
 * Drizzle client – T-007
 *
 * Connection: Supabase Postgres via the PgBouncer *pooled* URL (transaction mode).
 *
 * Two env vars are expected (see .env.example):
 *   DATABASE_URL        – pooled PgBouncer URL  (used by the API at runtime)
 *   DATABASE_URL_DIRECT – direct connection URL  (used by drizzle-kit for migrations)
 *
 * `prepare: false` is mandatory for PgBouncer transaction-mode pooling; prepared
 * statements are not supported in that mode.
 *
 * The module exports a lazy singleton so that importing this file from a test or
 * script that supplies its own connection does not eagerly open a pool.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

function createClient() {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "[@kritva/db] DATABASE_URL is not set. " +
        "Copy .env.example to .env and fill in the Supabase PgBouncer pooled URL.",
    );
  }

  const queryClient = postgres(url, {
    // PgBouncer transaction-mode: prepared statements must be disabled.
    prepare: false,
  });

  return drizzle(queryClient, { schema });
}

// Singleton: created once on first import, reused for every subsequent access.
let _db: ReturnType<typeof createClient> | undefined;

export function getDb(): ReturnType<typeof createClient> {
  if (!_db) {
    _db = createClient();
  }
  return _db;
}

/**
 * Pre-instantiated db handle.
 * Importing this will throw immediately if DATABASE_URL is not set,
 * which is the desired behaviour for the API server.
 */
export const db = getDb();
