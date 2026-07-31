/**
 * Account status gate — runs after supabaseAuth().
 *
 * Loads users.status and rejects banned/suspended accounts on every protected
 * route. Optionally revokes Supabase sessions via the Admin API when a service
 * role key is available.
 */

import type { Context, MiddlewareHandler, Next } from "hono";
import { eq } from "drizzle-orm";
import { db } from "@kritva/db/client";
import { users } from "@kritva/db";
import { config } from "../config.js";

async function revokeSupabaseSessions(userId: string): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config.SUPABASE_URL || !serviceRoleKey) return;

  try {
    await fetch(
      `${config.SUPABASE_URL}/auth/v1/admin/users/${userId}/logout`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
      },
    );
  } catch {
    // Best-effort — request is still rejected below.
  }
}

/**
 * Requires `c.var.user` from supabaseAuth(). Unknown users (pre-/sync) pass
 * through so auth sync can create the row.
 */
export function accountStatus(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const authUser = c.get("user") as { id: string } | undefined;
    if (!authUser?.id) {
      return c.json(
        {
          data: null,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
        },
        401,
      );
    }

    const [row] = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!row) {
      await next();
      return;
    }

    if (row.status === "banned" || row.status === "suspended") {
      await revokeSupabaseSessions(authUser.id);

      return c.json(
        {
          data: null,
          error: {
            code: "ACCOUNT_DISABLED",
            message:
              row.status === "banned"
                ? "Your account has been banned."
                : "Your account has been suspended.",
          },
        },
        403,
      );
    }

    await next();
  };
}
