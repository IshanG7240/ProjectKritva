// Re-exports for all Drizzle table definitions.
//
// Per-domain modules mirror the SQL migrations under `../../migrations/`.
// T-006: all 25 tables across 7 domain files.

export * from "./admin.js";
export * from "./bookings.js";
export * from "./messaging.js";
export * from "./payments.js";
export * from "./reviews.js";
export * from "./users.js";
export * from "./vendors.js";
