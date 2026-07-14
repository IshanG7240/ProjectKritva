import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "@kritva/db/client";
import { users } from "@kritva/db";
import type { AuthVariables } from "../middleware/supabase-auth.js";

export type AdminUser = {
  id: string;
  role: "admin" | "superadmin";
};

/**
 * Looks up the authenticated user's role and returns a 403 envelope when the
 * caller is not admin/superadmin. Returns the user record on success.
 */
export async function requireAdmin(c: Context<{ Variables: AuthVariables }>) {
  const authUser = c.get("user");

  const [dbUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "superadmin")) {
    return {
      forbidden: c.json(
        {
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "Admin role required.",
          },
        },
        403,
      ),
      adminUser: null as AdminUser | null,
    };
  }

  return {
    forbidden: null,
    adminUser: dbUser as AdminUser,
  };
}
