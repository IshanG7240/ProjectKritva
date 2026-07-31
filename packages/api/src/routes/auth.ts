/**
 * Auth routes handler.
 * Mounted at /v1/auth.
 */

import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@kritva/db/client";
import { users, vendors } from "@kritva/db";
import { accountStatus } from "../middleware/account-status.js";
import { supabaseAuth, type AuthVariables } from "../middleware/supabase-auth.js";

const authRouter = new Hono<{ Variables: AuthVariables }>();

authRouter.use("*", supabaseAuth(), accountStatus());

const syncRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().min(10).max(15).nullish(),
});

/**
 * POST /v1/auth/sync
 * Reconciles the client-side Supabase authenticated user with our database.
 */
authRouter.post("/sync", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.id;

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existingUser) {
    return c.json(
      {
        data: {
          user: {
            id: existingUser.id,
            email: existingUser.email,
            phone: existingUser.phone,
            name: existingUser.name,
            role: existingUser.role,
            onboarding_complete: existingUser.onboardingComplete,
          },
        },
        error: null,
      },
      200,
    );
  }

  const body = await c.req.json();
  const parsed = syncRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        data: null,
        error: {
          code: "VALIDATION_FAILED",
          message: "Request validation failed.",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const { name, email, phone } = parsed.data;

  await db.insert(users).values({
    id: userId,
    phone: phone ?? null,
    email: email || authUser.email,
    name,
    role: "customer",
    onboardingComplete: false,
  });

  return c.json(
    {
      data: {
        user: {
          id: userId,
          email: email || authUser.email,
          phone: phone ?? null,
          name,
          role: "customer",
          onboarding_complete: false,
        },
      },
      error: null,
    },
    210 as Parameters<typeof c.json>[1],
  );
});

const onboardingSchema = z
  .object({
    role: z.enum(["customer", "vendor"]),
    business_name: z.string().min(1).max(200).optional(),
  })
  .refine(
    (data) => data.role !== "vendor" || !!data.business_name,
    { message: "business_name is required when role is vendor", path: ["business_name"] },
  );

function toSlug(businessName: string): string {
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

/**
 * PATCH /v1/auth/onboarding
 * Assigns a role, marks onboarding complete, and upserts a vendor profile if needed.
 */
authRouter.patch("/onboarding", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.id;

  const body = await c.req.json();
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        data: null,
        error: {
          code: "VALIDATION_FAILED",
          message: "Request validation failed.",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      422,
    );
  }

  const [existingUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (
    existingUser &&
    (existingUser.role === "admin" || existingUser.role === "superadmin")
  ) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Admin accounts cannot change role via onboarding.",
        },
      },
      403,
    );
  }

  const { role, business_name } = parsed.data;

  await db
    .update(users)
    .set({ role, onboardingComplete: true })
    .where(eq(users.id, userId));

  if (role === "vendor" && business_name) {
    await db
      .insert(vendors)
      .values({
        userId,
        businessName: business_name,
        slug: toSlug(business_name),
        verificationStatus: "draft",
      })
      .onConflictDoUpdate({
        target: vendors.userId,
        set: { businessName: business_name },
      });
  }

  return c.json(
    {
      data: {
        id: userId,
        role,
        onboarding_complete: true,
      },
      error: null,
    },
    200,
  );
});

export { authRouter };
