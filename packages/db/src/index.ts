// Aggregated re-exports for @kritva/db.
//
// The Drizzle client lives in `./client` (T-007) and per-domain schema
// modules live in `./schema/*` (T-006). The raw SQL migrations under
// `../migrations/` are the source of truth for the database structure and
// are applied independently via the Supabase CLI or `./migrations/run_all.sh`.

export * from "./schema/index.js";
