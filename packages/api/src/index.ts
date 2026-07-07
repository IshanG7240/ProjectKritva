/**
 * @kritva/api – Hono.js server entrypoint.
 *
 * Responsibilities of this file:
 *   1. Instantiate the Hono application with a typed app-wide variable context.
 *   2. Register global cross-cutting middleware (CORS).
 *   3. Mount the global error handler  → always returns a 500 envelope.
 *   4. Mount the custom 404 handler    → returns a 404 envelope for unmatched routes.
 *
 * Business-domain routers are imported and mounted from dedicated route modules
 * (not defined here) to keep this file focused on infrastructure concerns only.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { AuthVariables } from "./middleware/supabase-auth.js";
import { authRouter } from "./routes/auth.js";
import { vendorsRouter } from "./routes/vendors.js";
import { bookingsRouter } from "./routes/bookings.js";
import { paymentsRouter } from "./routes/payments.js";
import { adminRouter } from "./routes/admin.js";


/** Shape of every error object that appears inside the error envelope. */
interface ApiError {
  /** Machine-readable error code (e.g. "INTERNAL_SERVER_ERROR"). */
  code: string;
  /** Human-readable description safe to surface to API consumers. */
  message: string;
  /** Optional per-field validation details. */
  fields?: Record<string, string>;
}

/** The uniform error envelope returned for all 4xx / 5xx responses. */
interface ErrorEnvelope {
  data: null;
  error: ApiError;
}

/** Hono app typed with auth variables so `c.var.user` is fully inferred. */
const app = new Hono<{ Variables: AuthVariables }>();

/**
 * CORS – applied before any route handler so that pre-flight OPTIONS requests
 * are answered correctly for all endpoints, including ones that do not yet exist.
 *
 * Replace `origin` with an explicit allow-list once environments are defined
 * (e.g. read from `process.env.ALLOWED_ORIGINS`).
 */
app.use(
  "*",
  cors({
    origin: "*",          // TODO: tighten in production via env var
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

app.get("/health", (c) => c.json({ data: { status: "ok" }, error: null }));

// Mount business-domain routes
app.route("/v1/auth", authRouter);
app.route("/v1/vendors", vendorsRouter);
app.route("/v1/bookings", bookingsRouter);
app.route("/v1/payments", paymentsRouter);
app.route("/v1/admin", adminRouter);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

/**
 * Intercepts every uncaught error thrown inside a route handler or middleware.
 *
 * Hono's own `HTTPException` carries an explicit status code; all other
 * `Error` instances are treated as unexpected runtime failures (500).
 */
app.onError((err, c) => {
  // Hono-native HTTP exception – preserve its intended status code.
  if (err instanceof HTTPException) {
    const body: ErrorEnvelope = {
      data: null,
      error: {
        code: `HTTP_${err.status}`,
        message: err.message || "An HTTP error occurred.",
      },
    };
    return c.json(body, err.status);
  }

  // Everything else is an unhandled runtime exception → 500.
  console.error("[kritva/api] Unhandled error:", err);

  const body: ErrorEnvelope = {
    data: null,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    },
  };
  return c.json(body, 500);
});

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

/**
 * Catches requests to routes that have no matching handler registered.
 *
 * Returns the same error envelope shape so the frontend never needs to handle
 * an inconsistent response format.
 */
app.notFound((c) => {
  const body: ErrorEnvelope = {
    data: null,
    error: {
      code: "NOT_FOUND",
      message: `The requested resource was not found: ${c.req.method} ${c.req.path}`,
    },
  };
  return c.json(body, 404);
});

export { app };
export type { ApiError, ErrorEnvelope };
export type { AuthVariables } from "./middleware/supabase-auth.js";
