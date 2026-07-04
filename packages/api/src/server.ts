/**
 * Node.js server entrypoint for @kritva/api.
 *
 * Binds the Hono app to a TCP port using @hono/node-server.
 * This file is intentionally separate from index.ts so the app
 * can be imported without side effects (e.g. in tests).
 */
import { serve } from "@hono/node-server";
import { app } from "./index.js";

const port = Number(process.env.PORT ?? 5430);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`[@kritva/api] Server listening on http://localhost:${info.port}`);
  }
);
