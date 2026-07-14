/**
 * Promote an existing public.users row to admin by email.
 *
 * One-time setup:
 * 1. Create the person in Supabase Auth (Dashboard → Authentication → Users,
 *    or sign-in once via the app) so auth.users and public.users share the same id.
 * 2. Ensure they have synced into public.users (sign in once / hit /v1/auth/sync).
 * 3. Run:
 *      pnpm --filter @kritva/db exec tsx src/promote-admin.ts you@example.com
 *
 * Idempotent: re-running on an already-admin user is a no-op success.
 * Does not create auth users — only updates role + onboarding_complete.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { users } from "./schema/index.js";
import * as fs from "fs";
import * as path from "path";

if (!process.env["DATABASE_URL"]) {
  try {
    let currentDir = process.cwd();
    while (currentDir) {
      const envPath = path.join(currentDir, ".env");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        for (const line of envContent.split("\n")) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const index = trimmed.indexOf("=");
            if (index > 0) {
              const key = trimmed.substring(0, index).trim();
              let val = trimmed.substring(index + 1).trim();
              if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1);
              } else if (val.startsWith("'") && val.endsWith("'")) {
                val = val.substring(1, val.length - 1);
              }
              const commentIndex = val.indexOf("#");
              if (commentIndex >= 0) {
                val = val.substring(0, commentIndex).trim();
              }
              process.env[key] = val;
            }
          }
        }
        break;
      }
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }
  } catch (err) {
    console.warn("Could not load .env file:", err);
  }
}

async function promoteAdmin(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("Provide a valid email address.");
  }

  const [existing] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      onboardingComplete: users.onboardingComplete,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);

  if (!existing) {
    throw new Error(
      `No public.users row for email '${normalized}'. Sign in once so /v1/auth/sync creates the row, then retry.`,
    );
  }

  if (
    (existing.role === "admin" || existing.role === "superadmin") &&
    existing.onboardingComplete
  ) {
    console.log(
      `Already provisioned: ${existing.email} (${existing.role}, id=${existing.id})`,
    );
    return;
  }

  const [updated] = await db
    .update(users)
    .set({
      role: "admin",
      onboardingComplete: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, existing.id))
    .returning({
      id: users.id,
      email: users.email,
      role: users.role,
      onboardingComplete: users.onboardingComplete,
    });

  console.log(
    `Promoted ${updated!.email} → ${updated!.role} (onboarding_complete=${updated!.onboardingComplete}, id=${updated!.id})`,
  );
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error(
      "Usage: pnpm --filter @kritva/db exec tsx src/promote-admin.ts you@example.com",
    );
    process.exit(1);
  }

  await promoteAdmin(email);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
