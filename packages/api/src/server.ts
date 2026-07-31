/**
 * Node.js server entrypoint for @kritva/api.
 *
 * Binds the Hono app to a TCP port using @hono/node-server.
 * This file is intentionally separate from index.ts so the app
 * can be imported without side effects (e.g. in tests).
 *
 * Config is validated at import time (fail-closed on PAYMENT_MODE).
 */
import { serve } from "@hono/node-server";
import { config } from "./config.js";
import { app } from "./index.js";

serve(
  {
    fetch: app.fetch,
    port: config.PORT,
  },
  (info) => {
    console.log(`[@kritva/api] Server listening on http://localhost:${info.port}`);
  }
);
