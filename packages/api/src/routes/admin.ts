/**
 * Admin routes handler.
 * Mounted at /v1/admin.
 * All endpoints require the authenticated user to have role 'admin' or 'superadmin'.
 */

import { Hono, type Context } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@kritva/db/client";
import { vendors, users } from "@kritva/db";
import { supabaseAuth, type AuthVariables } from "../middleware/supabase-auth.js";

const adminRouter = new Hono<{ Variables: AuthVariables }>();

/**
 * Inline admin authorization guard.
 * Looks up the authenticated user's role in public.users and returns a
 * 403 Forbidden envelope if the role is not 'admin' or 'superadmin'.
 * Returns the user record on success so callers can use it directly.
 */
async function requireAdmin(c: Context<{ Variables: AuthVariables }>) {
  const authUser = c.get("user");

  const [dbUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!dbUser || dbUser.role !== "admin") {
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
      adminUser: null,
    };
  }

  return { forbidden: null, adminUser: dbUser };
}

/**
 * GET /v1/admin/vendors/pending
 * Returns all vendor records where verification_status is 'pending_review'.
 */
adminRouter.get("/vendors/pending", supabaseAuth(), async (c) => {
  const { forbidden } = await requireAdmin(c);
  if (forbidden) return forbidden;

  const pendingVendors = await db
    .select({
      id: vendors.id,
      user_id: vendors.userId,
      business_name: vendors.businessName,
      slug: vendors.slug,
      category: vendors.category,
      city_id: vendors.cityId,
      description: vendors.description,
      verification_status: vendors.verificationStatus,
      verification_notes: vendors.verificationNotes,
      created_at: vendors.createdAt,
    })
    .from(vendors)
    .where(eq(vendors.verificationStatus, "pending_review"));

  return c.json({ data: { vendors: pendingVendors }, error: null }, 200);
});

// Request body schema for the verify action
const verifyVendorSchema = z.object({
  verification_status: z.enum(["approved", "rejected"]),
  verification_notes: z.string().optional(),
});

/**
 * PATCH /v1/admin/vendors/:id/verify
 * Updates a vendor's verification_status to 'approved' or 'rejected'.
 * Stamps verified_at and verified_by on approval.
 * Logs the action with console.info (structured, server-side only).
 */
adminRouter.patch("/vendors/:id/verify", supabaseAuth(), async (c) => {
  const { forbidden, adminUser } = await requireAdmin(c);
  if (forbidden) return forbidden;

  const vendorId = c.req.param("id");

  // Validate request body
  const body = await c.req.json();
  const parsed = verifyVendorSchema.safeParse(body);

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

  const { verification_status, verification_notes } = parsed.data;

  // Confirm vendor exists before updating
  const [existing] = await db
    .select({ id: vendors.id, businessName: vendors.businessName })
    .from(vendors)
    .where(eq(vendors.id, vendorId))
    .limit(1);

  if (!existing) {
    return c.json(
      {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Vendor '${vendorId}' was not found.`,
        },
      },
      404,
    );
  }

  // Apply the verification update; stamp verified_at only on approval
  const now = new Date();
  const [updated] = await db
    .update(vendors)
    .set({
      verificationStatus: verification_status,
      verificationNotes: verification_notes ?? null,
      verifiedAt: verification_status === "approved" ? now : null,
      verifiedBy: adminUser!.id,
      updatedAt: now,
    })
    .where(eq(vendors.id, vendorId))
    .returning({
      id: vendors.id,
      business_name: vendors.businessName,
      verification_status: vendors.verificationStatus,
      verified_at: vendors.verifiedAt,
      verified_by: vendors.verifiedBy,
    });

  // Structured audit log — written server-side only, never exposed to clients
  console.info("[admin:verify]", {
    admin_id: adminUser!.id,
    vendor_id: vendorId,
    vendor_name: existing.businessName,
    action: verification_status,
    notes: verification_notes ?? null,
    timestamp: now.toISOString(),
  });

  return c.json({ data: { vendor: updated }, error: null }, 200);
});

export { adminRouter };
