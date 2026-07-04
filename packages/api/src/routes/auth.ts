/**
 * Auth routes handler.
 * Mounted at /v1/auth.
 */

import { Hono } from "hono";
import { z } from "zod";
import { ulid } from "ulid";
import { eq } from "drizzle-orm";
import { db } from "@kritva/db/client";
import { users, vendors } from "@kritva/db";
import { supabaseAuth, type AuthVariables } from "../middleware/supabase-auth.js";

// Router definition with AuthVariables so c.var.user is typed
const authRouter = new Hono<{ Variables: AuthVariables }>();

// Request body schema for sync endpoint
const syncRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number cannot exceed 15 digits"),
});

/**
 * POST /v1/auth/sync
 * Reconciles the client-side Supabase authenticated user with our database.
 */
authRouter.post("/sync", supabaseAuth(), async (c) => {
  const authUser = c.get("user");
  const userId = authUser.id;

  // 1. Query public.users table to see if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existingUser) {
    // User exists, return 200 OK with details
    return c.json({
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
    }, 200);
  }

  // 2. User does not exist, extract and validate request body
  const body = await c.req.json();
  const parsed = syncRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({
      data: null,
      error: {
        code: "VALIDATION_FAILED",
        message: "Request validation failed.",
        fields: parsed.error.flatten().fieldErrors,
      },
    }, 400);
  }

  const { name, email, phone } = parsed.data;

  // Generate client-side ULID for safety/insert (or use a DB default, but spec requested valid ULID primary key)
  const newUserId = ulid();

  // 3. Perform insert into public.users
  await db.insert(users).values({
    id: newUserId,
    phone,
    email: email || authUser.email,
    name,
    role: "customer",
    onboardingComplete: false,
  });

  // 4. Return 210 Created envelope
  return c.json({
    data: {
      user: {
        id: newUserId,
        email: email || authUser.email,
        phone,
        name,
        role: "customer",
        onboarding_complete: false,
      },
    },
    error: null,
  }, 210 as Parameters<typeof c.json>[1]);
});

// Inline schema for onboarding body — strict shape, cross-field refinement
const onboardingSchema = z
  .object({
    role: z.enum(["customer", "vendor"]),
    business_name: z.string().min(1).max(200).optional(),
  })
  .refine(
    (data) => data.role !== "vendor" || !!data.business_name,
    { message: "business_name is required when role is vendor", path: ["business_name"] },
  );

/**
 * Converts a business name into a URL-safe slug with a short random suffix.
 * Example: "Delhi Dream Decorators" → "delhi-dream-decorators-a3f2"
 */
function toSlug(businessName: string): string {
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric runs with a dash
    .replace(/^-+|-+$/g, "");    // trim leading/trailing dashes
  const suffix = Math.random().toString(36).slice(2, 6); // 4-char random suffix
  return `${base}-${suffix}`;
}

/**
 * PATCH /v1/auth/onboarding
 * Assigns a role, marks onboarding complete, and upserts a vendor profile if needed.
 */
authRouter.patch("/onboarding", supabaseAuth(), async (c) => {
  const authUser = c.get("user");
  const userId = authUser.id;

  // 1. Parse and validate request body
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

  const { role, business_name } = parsed.data;

  // 2. Update public.users — set role and mark onboarding done
  await db
    .update(users)
    .set({ role, onboardingComplete: true })
    .where(eq(users.id, userId));

  // 3. Upsert vendor profile when role is vendor
  if (role === "vendor" && business_name) {
    await db
      .insert(vendors)
      .values({
        userId,
        businessName: business_name,
        slug: toSlug(business_name),
      })
      .onConflictDoUpdate({
        target: vendors.userId,
        set: { businessName: business_name },
      });
  }

  // 4. Return spec-mapped 200 OK envelope
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
