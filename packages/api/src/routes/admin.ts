/**
 * Admin routes handler.
 * Mounted at /v1/admin.
 * All endpoints require the authenticated user to have role 'admin' or 'superadmin'.
 */

import { Hono } from "hono";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import {
  listUsersQuerySchema,
  updateUserStatusSchema,
  verifyVendorSchema,
} from "@kritva/types";
import { db } from "@kritva/db/client";
import { users, vendorMedia, vendorPackages, vendors } from "@kritva/db";
import { dispatch as dispatchNotification } from "@kritva/notifications/dispatcher";
import { appendAuditLog } from "../lib/audit.js";
import { requireAdmin } from "../lib/require-admin.js";
import { supabaseAuth, type AuthVariables } from "../middleware/supabase-auth.js";

const adminRouter = new Hono<{ Variables: AuthVariables }>();

function requestMeta(c: {
  req: { header: (name: string) => string | undefined };
}) {
  return {
    ipAddress:
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      null,
    userAgent: c.req.header("user-agent") ?? null,
  };
}

/**
 * GET /v1/admin/users
 * Lists users with optional search (q), role/status filters, and offset pagination.
 */
adminRouter.get("/users", supabaseAuth(), async (c) => {
  const { forbidden } = await requireAdmin(c);
  if (forbidden) return forbidden;

  const parsed = listUsersQuerySchema.safeParse({
    q: c.req.query("q") || undefined,
    role: c.req.query("role") || undefined,
    status: c.req.query("status") || undefined,
    limit: c.req.query("limit") ?? 50,
    offset: c.req.query("offset") ?? 0,
  });

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

  const { q, role, status, limit, offset } = parsed.data;
  const conditions: SQL[] = [];

  if (q) {
    const pattern = `%${q}%`;
    const search = or(
      ilike(users.name, pattern),
      ilike(users.email, pattern),
      ilike(users.phone, pattern),
    );
    if (search) conditions.push(search);
  }

  if (role) {
    conditions.push(eq(users.role, role));
  }

  if (status) {
    conditions.push(eq(users.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      suspended_until: users.suspendedUntil,
      created_at: users.createdAt,
      total_count: sql<number>`count(*) over()`.as("total_count"),
    })
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const totalCount = rows.length > 0 ? Number(rows[0]!.total_count) : 0;
  const userList = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    role: row.role,
    status: row.status,
    suspended_until: row.suspended_until?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  }));

  return c.json(
    {
      data: { users: userList },
      error: null,
      meta: {
        pagination: {
          totalCount,
          limit,
          offset,
          hasNextPage: offset + userList.length < totalCount,
        },
      },
    },
    200,
  );
});

/**
 * PATCH /v1/admin/users/:id/status
 * Sets a user's status to active, suspended, or banned.
 */
adminRouter.patch("/users/:id/status", supabaseAuth(), async (c) => {
  const { forbidden, adminUser } = await requireAdmin(c);
  if (forbidden) return forbidden;

  const targetUserId = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateUserStatusSchema.safeParse(body);

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

  if (targetUserId === adminUser!.id) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "You cannot change your own status.",
        },
      },
      403,
    );
  }

  const [existing] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      suspended_until: users.suspendedUntil,
      created_at: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!existing) {
    return c.json(
      {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `User '${targetUserId}' was not found.`,
        },
      },
      404,
    );
  }

  if (existing.role === "admin" || existing.role === "superadmin") {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Cannot modify another admin account.",
        },
      },
      403,
    );
  }

  const { status, suspended_until, reason } = parsed.data;
  const now = new Date();
  const meta = requestMeta(c);

  const nextSuspendedUntil =
    status === "suspended"
      ? suspended_until
        ? new Date(suspended_until)
        : null
      : null;

  const auditAction =
    status === "suspended"
      ? "user.suspend"
      : status === "banned"
        ? "user.ban"
        : "user.reinstate";

  const [updated] = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(users)
      .set({
        status,
        suspendedUntil: nextSuspendedUntil,
        updatedAt: now,
      })
      .where(eq(users.id, targetUserId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        suspended_until: users.suspendedUntil,
        created_at: users.createdAt,
      });

    await appendAuditLog(tx, {
      actorId: adminUser!.id,
      actorRole: adminUser!.role,
      action: auditAction,
      resourceType: "user",
      resourceId: targetUserId,
      oldValue: {
        status: existing.status,
        suspended_until: existing.suspended_until?.toISOString() ?? null,
        reason: null,
      },
      newValue: {
        status,
        suspended_until: nextSuspendedUntil?.toISOString() ?? null,
        reason,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return [row];
  });

  void dispatchNotification({
    kind: "user_status_changed",
    user_id: targetUserId,
    name: existing.name,
    status,
    reason,
    suspended_until: nextSuspendedUntil?.toISOString() ?? null,
    to_email: existing.email ?? null,
  }).catch(() => {});

  return c.json(
    {
      data: {
        user: {
          id: updated!.id,
          status: updated!.status,
          suspended_until: updated!.suspended_until?.toISOString() ?? null,
        },
      },
      error: null,
    },
    200,
  );
});

/**
 * GET /v1/admin/vendors/pending
 * Returns vendors awaiting admin review, newest submissions first.
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
      submitted_at: vendors.submittedAt,
      created_at: vendors.createdAt,
      package_count: sql<number>`(
        SELECT count(*)::int
        FROM vendor_packages vp
        WHERE vp.vendor_id = ${vendors.id}
          AND vp.is_active = true
      )`,
      portfolio_media_count: sql<number>`(
        SELECT count(*)::int
        FROM vendor_media vm
        WHERE vm.vendor_id = ${vendors.id}
          AND vm.section = 'portfolio'
      )`,
    })
    .from(vendors)
    .where(eq(vendors.verificationStatus, "pending_review"))
    .orderBy(sql`${vendors.submittedAt} desc nulls last`);

  return c.json(
    {
      data: {
        vendors: pendingVendors.map((vendor) => ({
          ...vendor,
          description: vendor.description ?? null,
          verification_notes: vendor.verification_notes ?? null,
          submitted_at: vendor.submitted_at?.toISOString() ?? null,
          created_at: vendor.created_at.toISOString(),
        })),
      },
      error: null,
    },
    200,
  );
});

/**
 * GET /v1/admin/vendors/:id
 * Full vendor review payload for admin decision-making.
 */
adminRouter.get("/vendors/:id", supabaseAuth(), async (c) => {
  const { forbidden } = await requireAdmin(c);
  if (forbidden) return forbidden;

  const vendorId = c.req.param("id");

  const [vendor] = await db
    .select({
      id: vendors.id,
      user_id: vendors.userId,
      business_name: vendors.businessName,
      slug: vendors.slug,
      category: vendors.category,
      city_id: vendors.cityId,
      description: vendors.description,
      years_in_business: vendors.yearsInBusiness,
      profile_photo_url: vendors.profilePhotoUrl,
      verification_status: vendors.verificationStatus,
      verification_notes: vendors.verificationNotes,
      submitted_at: vendors.submittedAt,
      created_at: vendors.createdAt,
      owner_email: users.email,
    })
    .from(vendors)
    .leftJoin(users, eq(users.id, vendors.userId))
    .where(eq(vendors.id, vendorId))
    .limit(1);

  if (!vendor) {
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

  const [packages, media] = await Promise.all([
    db
      .select({
        id: vendorPackages.id,
        name: vendorPackages.name,
        price: vendorPackages.price,
        unit: vendorPackages.unit,
        min_quantity: vendorPackages.minQuantity,
        inclusions: vendorPackages.inclusions,
      })
      .from(vendorPackages)
      .where(
        and(
          eq(vendorPackages.vendorId, vendorId),
          eq(vendorPackages.isActive, true),
        ),
      )
      .orderBy(asc(vendorPackages.createdAt)),
    db
      .select({
        id: vendorMedia.id,
        url: vendorMedia.url,
        thumbnail_url: vendorMedia.thumbnailUrl,
        section: vendorMedia.section,
        position: vendorMedia.position,
      })
      .from(vendorMedia)
      .where(
        and(
          eq(vendorMedia.vendorId, vendorId),
          eq(vendorMedia.section, "portfolio"),
        ),
      )
      .orderBy(asc(vendorMedia.position)),
  ]);

  return c.json(
    {
      data: {
        vendor: {
          id: vendor.id,
          user_id: vendor.user_id,
          business_name: vendor.business_name,
          slug: vendor.slug,
          category: vendor.category,
          city_id: vendor.city_id,
          description: vendor.description ?? null,
          years_in_business: vendor.years_in_business ?? null,
          profile_photo_url: vendor.profile_photo_url ?? null,
          verification_status: vendor.verification_status,
          verification_notes: vendor.verification_notes ?? null,
          submitted_at: vendor.submitted_at?.toISOString() ?? null,
          created_at: vendor.created_at.toISOString(),
          owner_email: vendor.owner_email ?? null,
          packages: packages.map((pkg) => ({
            id: pkg.id,
            name: pkg.name,
            price: Number(pkg.price),
            unit: pkg.unit,
            min_quantity: pkg.min_quantity != null ? Number(pkg.min_quantity) : null,
            inclusions: Array.isArray(pkg.inclusions) ? pkg.inclusions : [],
          })),
          media: media.map((item) => ({
            id: item.id,
            url: item.url,
            thumbnail_url: item.thumbnail_url ?? null,
            section: item.section,
            position: item.position,
          })),
        },
      },
      error: null,
    },
    200,
  );
});

/**
 * PATCH /v1/admin/vendors/:id/verify
 * Approves or rejects a vendor that is pending_review.
 */
adminRouter.patch("/vendors/:id/verify", supabaseAuth(), async (c) => {
  const { forbidden, adminUser } = await requireAdmin(c);
  if (forbidden) return forbidden;

  const vendorId = c.req.param("id");

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

  const [existing] = await db
    .select({
      id: vendors.id,
      user_id: vendors.userId,
      business_name: vendors.businessName,
      slug: vendors.slug,
      verification_status: vendors.verificationStatus,
      verification_notes: vendors.verificationNotes,
      verified_at: vendors.verifiedAt,
      owner_email: users.email,
    })
    .from(vendors)
    .leftJoin(users, eq(users.id, vendors.userId))
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

  if (existing.verification_status !== "pending_review") {
    return c.json(
      {
        data: null,
        error: {
          code: "CONFLICT",
          message: `Cannot verify vendor while status is ${existing.verification_status}.`,
        },
      },
      409,
    );
  }

  const now = new Date();
  const meta = requestMeta(c);
  const auditAction =
    verification_status === "approved" ? "vendor.approve" : "vendor.reject";

  const [updated] = await db.transaction(async (tx) => {
    const [row] = await tx
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

    await appendAuditLog(tx, {
      actorId: adminUser!.id,
      actorRole: adminUser!.role,
      action: auditAction,
      resourceType: "vendor",
      resourceId: vendorId,
      oldValue: {
        verification_status: existing.verification_status,
        verification_notes: existing.verification_notes,
        verified_at: existing.verified_at?.toISOString() ?? null,
      },
      newValue: {
        verification_status,
        verification_notes: verification_notes ?? null,
        verified_at:
          verification_status === "approved" ? now.toISOString() : null,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return [row];
  });

  const webBase = process.env.WEB_BASE_URL?.replace(/\/$/, "") ?? "";
  void dispatchNotification({
    kind: "vendor_verification_decided",
    vendor_id: vendorId,
    user_id: existing.user_id,
    business_name: existing.business_name,
    slug: existing.slug,
    status: verification_status,
    verification_notes: verification_notes ?? null,
    to_email: existing.owner_email ?? null,
    profile_url:
      verification_status === "approved" && webBase
        ? `${webBase}/vendors/${existing.slug}`
        : webBase
          ? `${webBase}/vendor/profile`
          : "/vendor/profile",
  }).catch(() => {});

  return c.json({ data: { vendor: updated }, error: null }, 200);
});

export { adminRouter };
