// Kritva API server entrypoint.
//
// The Hono application, middleware chain, and route registration are
// implemented across T-008 (app entry, health, error handler), T-009
// (JWT + auth middleware), T-010 (validation, rate limiting), and T-011
// (audit, config reader). Subsequent tickets mount domain routers under
// `./routes/*` and wire services under `./services/*`.

export {};
