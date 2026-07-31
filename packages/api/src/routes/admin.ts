/**
 * Admin routes handler.
 * Mounted at /v1/admin.
 * All endpoints require the authenticated user to have role 'admin' or 'superadmin'.
 */

import { Hono } from "hono";
import { ulid } from "ulid";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import {
  listAdminBookingsQuerySchema,
  listUsersQuerySchema,
  reconciliationQuerySchema,
  resolveBookingSchema,
  updateCategoryCommissionSchema,
  updateUserStatusSchema,
  verifyVendorSchema,
} from "@kritva/types";
import { db } from "@kritva/db/client";
import {
  auditLogs,
  bookingEvents,
  bookingMilestones,
  bookings,
  categoryConfigs,
  payments,
  platformConfig,
  users,
  vendorMedia,
  vendorPackages,
  vendors,
} from "@kritva/db";
import {
  fetchGatewayBalancePaisa,
  refund as providerRefund,
} from "@kritva/payments";
import { dispatch as dispatchNotification } from "@kritva/notifications/dispatcher";
import { config } from "../config.js";
import { appendAuditLog } from "../lib/audit.js";
import { requireAdmin } from "../lib/require-admin.js";
import { accountStatus } from "../middleware/account-status.js";
import { supabaseAuth, type AuthVariables } from "../middleware/supabase-auth.js";
import {
  releaseBookingEscrow,
  resolveAutoReleaseDays,
} from "./internal.js";

const adminRouter = new Hono<{ Variables: AuthVariables }>();

adminRouter.use("*", supabaseAuth(), accountStatus());

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
adminRouter.get("/users", async (c) => {
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
adminRouter.patch("/users/:id/status", async (c) => {
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
adminRouter.get("/vendors/pending", async (c) => {
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
adminRouter.get("/vendors/:id", async (c) => {
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
adminRouter.patch("/vendors/:id/verify", async (c) => {
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

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(vendors)
      .set({
        verificationStatus: verification_status,
        verificationNotes: verification_notes ?? null,
        verifiedAt: verification_status === "approved" ? now : null,
        verifiedBy: adminUser!.id,
        updatedAt: now,
      })
      .where(
        and(
          eq(vendors.id, vendorId),
          eq(vendors.verificationStatus, "pending_review"),
        ),
      )
      .returning({
        id: vendors.id,
        business_name: vendors.businessName,
        verification_status: vendors.verificationStatus,
        verified_at: vendors.verifiedAt,
        verified_by: vendors.verifiedBy,
      });

    if (!row) return null;

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

    return row;
  });

  if (!updated) {
    return c.json(
      {
        data: null,
        error: {
          code: "CONFLICT",
          message:
            "Vendor verification status changed. Expected pending_review.",
        },
      },
      409,
    );
  }

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

/**
 * GET /v1/admin/bookings
 * Money control room — held funds and related booking rows.
 * Always includes payments.mode so simulated records are visible.
 */
adminRouter.get("/bookings", async (c) => {
  const { forbidden } = await requireAdmin(c);
  if (forbidden) return forbidden;

  const parsed = listAdminBookingsQuerySchema.safeParse({
    status: c.req.query("status") || undefined,
    held: c.req.query("held") || undefined,
    mode: c.req.query("mode") || undefined,
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

  const { status, held, mode, limit, offset } = parsed.data;
  const conditions: SQL[] = [];

  if (held) {
    conditions.push(inArray(bookings.status, ["payment_held", "completed"]));
  } else if (status) {
    conditions.push(eq(bookings.status, status));
  }

  // Push mode into SQL so LIMIT/OFFSET apply after filtering (not before).
  if (mode) {
    conditions.push(eq(payments.mode, mode));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      event_date: bookings.eventDate,
      total_amount: bookings.totalAmount,
      commission_bps: bookings.commissionBps,
      customer_id: bookings.customerId,
      vendor_id: bookings.vendorId,
      vendor_business_name: vendors.businessName,
      vendor_is_demo: vendors.isDemo,
      customer_name: users.name,
      payment_id: payments.id,
      payment_mode: payments.mode,
      payment_status: payments.status,
      escrow_status: payments.escrowStatus,
      platform_fee: payments.platformFee,
      gateway_payment_id: payments.gatewayPaymentId,
      captured_at: payments.capturedAt,
      created_at: bookings.createdAt,
      total_count: sql<number>`count(*) over()`.as("total_count"),
    })
    .from(bookings)
    .innerJoin(vendors, eq(vendors.id, bookings.vendorId))
    .innerJoin(users, eq(users.id, bookings.customerId))
    .leftJoin(
      payments,
      and(
        eq(payments.bookingId, bookings.id),
        inArray(payments.status, ["captured", "refunded"]),
      ),
    )
    .where(whereClause)
    .orderBy(desc(bookings.createdAt))
    .limit(limit)
    .offset(offset);

  const totalCount = rows.length > 0 ? Number(rows[0]!.total_count) : 0;

  return c.json(
    {
      data: {
        bookings: rows.map((row) => ({
          id: row.id,
          status: row.status,
          event_date: row.event_date,
          total_amount: row.total_amount,
          commission_bps: row.commission_bps,
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          vendor_id: row.vendor_id,
          vendor_business_name: row.vendor_business_name,
          vendor_is_demo: row.vendor_is_demo,
          payment: row.payment_id
            ? {
                id: row.payment_id,
                mode: row.payment_mode,
                status: row.payment_status,
                escrow_status: row.escrow_status,
                platform_fee: row.platform_fee,
                gateway_payment_id: row.gateway_payment_id,
                captured_at: row.captured_at?.toISOString() ?? null,
                is_simulated: row.payment_mode === "simulated",
              }
            : null,
          created_at: row.created_at.toISOString(),
        })),
      },
      error: null,
      meta: {
        pagination: {
          totalCount,
          limit,
          offset,
          hasNextPage: offset + rows.length < totalCount,
        },
      },
    },
    200,
  );
});

/**
 * GET /v1/admin/reconciliation
 * Local ledger summary of held payments + best-effort Razorpay balance when live.
 */
adminRouter.get("/reconciliation", async (c) => {
  const { forbidden } = await requireAdmin(c);
  if (forbidden) return forbidden;

  const parsed = reconciliationQuerySchema.safeParse({
    mode: c.req.query("mode") || undefined,
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

  const { mode } = parsed.data;
  const autoReleaseDays = await resolveAutoReleaseDays();

  const heldRows = await db
    .select({
      booking_id: bookings.id,
      status: bookings.status,
      total_amount: bookings.totalAmount,
      event_date: bookings.eventDate,
      payment_id: payments.id,
      payment_amount: payments.amount,
      platform_fee: payments.platformFee,
      escrow_status: payments.escrowStatus,
      captured_at: payments.capturedAt,
      payment_mode: payments.mode,
    })
    .from(payments)
    .innerJoin(bookings, eq(bookings.id, payments.bookingId))
    .where(
      and(
        eq(payments.mode, mode),
        eq(payments.status, "captured"),
        eq(payments.escrowStatus, "held"),
        inArray(bookings.status, [
          "payment_held",
          "in_progress",
          "completed",
          "disputed",
        ]),
      ),
    )
    .orderBy(desc(payments.capturedAt));

  let held_total_paisa = 0;
  let platform_fee_total_paisa = 0;
  for (const row of heldRows) {
    held_total_paisa += row.payment_amount;
    platform_fee_total_paisa += row.platform_fee;
  }

  let gateway_balance_paisa: number | null = null;
  let gateway_balance_note =
    "Local ledger only — Razorpay balance not fetched (PAYMENT_MODE≠live or keys missing).";

  if (
    config.PAYMENT_MODE === "live" &&
    config.RAZORPAY_KEY_ID &&
    config.RAZORPAY_KEY_SECRET
  ) {
    gateway_balance_paisa = await fetchGatewayBalancePaisa();
    gateway_balance_note =
      gateway_balance_paisa == null
        ? "Razorpay balance unavailable (Route-only merchants often lack banking_balances) — local ledger only."
        : "Razorpay banking_balances sum (paisa), best-effort.";
  }

  return c.json(
    {
      data: {
        mode,
        payment_mode_server: config.PAYMENT_MODE,
        auto_release_days: autoReleaseDays,
        held_count: heldRows.length,
        held_total_paisa,
        platform_fee_total_paisa,
        gateway_balance_paisa,
        gateway_balance_note,
        bookings: heldRows.map((row) => ({
          booking_id: row.booking_id,
          status: row.status,
          total_amount: row.total_amount,
          event_date: row.event_date,
          payment: {
            id: row.payment_id,
            amount: row.payment_amount,
            platform_fee: row.platform_fee,
            escrow_status: row.escrow_status,
            mode: row.payment_mode,
            captured_at: row.captured_at?.toISOString() ?? null,
          },
        })),
      },
      error: null,
    },
    200,
  );
});

/**
 * POST /v1/admin/bookings/:id/resolve
 * Admin money decision: released | refunded | split + written reason.
 * Disputed money stays frozen until this endpoint runs.
 */
adminRouter.post("/bookings/:id/resolve", async (c) => {
  const { forbidden, adminUser } = await requireAdmin(c);
  if (forbidden) return forbidden;

  const bookingId = c.req.param("id");
  const body = await c.req.json();
  const parsed = resolveBookingSchema.safeParse(body);

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

  const { outcome, reason, vendor_payout_amount, customer_refund_amount } =
    parsed.data;

  const [booking] = await db
    .select({
      id: bookings.id,
      customerId: bookings.customerId,
      vendorId: bookings.vendorId,
      status: bookings.status,
      totalAmount: bookings.totalAmount,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    return c.json(
      {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Booking '${bookingId}' was not found.`,
        },
      },
      404,
    );
  }

  if (
    booking.status !== "disputed" &&
    booking.status !== "payment_held" &&
    booking.status !== "completed"
  ) {
    return c.json(
      {
        data: null,
        error: {
          code: "INVALID_STATE_TRANSITION",
          message: `Cannot resolve a booking with status '${booking.status}'. Expected 'disputed', 'payment_held', or 'completed'.`,
        },
      },
      409,
    );
  }

  const meta = requestMeta(c);
  const webBase = config.WEB_BASE_URL?.replace(/\/$/, "") ?? "";
  const customerUrl = webBase
    ? `${webBase}/bookings/${bookingId}`
    : `/bookings/${bookingId}`;
  const vendorUrl = webBase
    ? `${webBase}/vendor/leads/${bookingId}`
    : `/vendor/leads/${bookingId}`;

  async function notifyResolved() {
    const [[customer], [vendorOwner]] = await Promise.all([
      db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, booking!.customerId))
        .limit(1),
      db
        .select({ email: users.email })
        .from(vendors)
        .innerJoin(users, eq(users.id, vendors.userId))
        .where(eq(vendors.id, booking!.vendorId))
        .limit(1),
    ]);

    void Promise.all([
      dispatchNotification({
        kind: "booking_resolved",
        booking_id: bookingId,
        customer_id: booking!.customerId,
        vendor_id: booking!.vendorId,
        outcome,
        reason,
        to_email: customer?.email ?? null,
        booking_url: customerUrl,
        recipient_role: "customer",
      }),
      dispatchNotification({
        kind: "booking_resolved",
        booking_id: bookingId,
        customer_id: booking!.customerId,
        vendor_id: booking!.vendorId,
        outcome,
        reason,
        to_email: vendorOwner?.email ?? null,
        booking_url: vendorUrl,
        recipient_role: "vendor",
      }),
    ]).catch(() => {});
  }

  if (outcome === "released") {
    const fromStatuses =
      booking.status === "disputed"
        ? (["disputed"] as const)
        : booking.status === "payment_held"
          ? (["payment_held"] as const)
          : (["completed"] as const);

    const result = await releaseBookingEscrow({
      bookingId,
      actor: { id: adminUser!.id, role: "admin" },
      fromStatuses: [...fromStatuses],
      metadata: { admin_reason: reason, resolve_outcome: "released" },
      silent: true,
    });

    if (!result.ok) {
      return c.json(
        {
          data: null,
          error: { code: result.code, message: result.message },
        },
        result.code === "NOT_FOUND" ? 404 : 409,
      );
    }

    await appendAuditLog(db, {
      actorId: adminUser!.id,
      actorRole: adminUser!.role,
      action: "booking.resolve",
      resourceType: "booking",
      resourceId: bookingId,
      oldValue: { status: booking.status },
      newValue: { outcome: "released", reason },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await notifyResolved();

    return c.json(
      {
        data: {
          booking_id: bookingId,
          status: "payment_released",
          escrow_outcome: "released",
          payout: {
            amount_transferred: result.amount_transferred,
            platform_commission: result.platform_commission,
          },
          reason,
        },
        error: null,
      },
      200,
    );
  }

  if (outcome === "refunded") {
    const [payment] = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        mode: payments.mode,
        gatewayPaymentId: payments.gatewayPaymentId,
        escrowStatus: payments.escrowStatus,
        status: payments.status,
      })
      .from(payments)
      .where(
        and(
          eq(payments.bookingId, bookingId),
          inArray(payments.status, ["captured", "refunded"]),
        ),
      )
      .limit(1);

    if (!payment?.gatewayPaymentId) {
      return c.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE",
            message: "No captured payment found to refund.",
          },
        },
        409,
      );
    }

    if (payment.mode !== config.PAYMENT_MODE) {
      return c.json(
        {
          data: null,
          error: {
            code: "PAYMENT_MODE_MISMATCH",
            message: `This payment was created in '${payment.mode}' mode; server is '${config.PAYMENT_MODE}'.`,
          },
        },
        409,
      );
    }

    if (booking.status === "refunded" || payment.status === "refunded") {
      return c.json(
        {
          data: {
            booking_id: bookingId,
            status: "refunded",
            escrow_outcome: "refunded",
            reason,
            already: true,
          },
          error: null,
        },
        200,
      );
    }

    let refundResult: { refund_id: string; status: string; amount: number };
    try {
      refundResult = await providerRefund({
        payment_id: payment.gatewayPaymentId,
        amount: payment.amount,
        notes: { booking_id: bookingId, reason },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Refund failed";
      return c.json(
        {
          data: null,
          error: { code: "REFUND_FAILED", message },
        },
        502,
      );
    }

    const fromStatus = booking.status;
    const transitioned = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(bookings)
        .set({
          status: "refunded",
          escrowOutcome: "refunded",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookings.id, bookingId),
            inArray(bookings.status, [
              "disputed",
              "payment_held",
              "completed",
            ]),
          ),
        )
        .returning({ id: bookings.id });

      if (!updated) return false;

      await tx
        .update(payments)
        .set({
          status: "refunded",
          escrowStatus: "refunded",
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      await tx
        .update(bookingMilestones)
        .set({ paymentStatus: "refunded" })
        .where(eq(bookingMilestones.bookingId, bookingId));

      await tx.insert(bookingEvents).values({
        id: ulid(),
        bookingId,
        fromStatus,
        toStatus: "refunded",
        actorId: adminUser!.id,
        actorRole: "admin",
        metadata: {
          reason,
          resolve_outcome: "refunded",
          refund_id: refundResult.refund_id,
          refund_status: refundResult.status,
          amount: refundResult.amount,
        },
      });

      await appendAuditLog(tx, {
        actorId: adminUser!.id,
        actorRole: adminUser!.role,
        action: "booking.resolve",
        resourceType: "booking",
        resourceId: bookingId,
        oldValue: { status: fromStatus },
        newValue: {
          outcome: "refunded",
          reason,
          refund_id: refundResult.refund_id,
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      return true;
    });

    if (!transitioned) {
      return c.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE_TRANSITION",
            message: "Booking state changed during refund resolve.",
          },
        },
        409,
      );
    }

    await notifyResolved();

    return c.json(
      {
        data: {
          booking_id: bookingId,
          status: "refunded",
          escrow_outcome: "refunded",
          refund: refundResult,
          reason,
        },
        error: null,
      },
      200,
    );
  }

  // outcome === "split" — stub: record decision + amounts; full split transfer later.
  const vendorPayout = vendor_payout_amount ?? 0;
  const customerRefund = customer_refund_amount ?? 0;
  if (vendorPayout + customerRefund > booking.totalAmount) {
    return c.json(
      {
        data: null,
        error: {
          code: "VALIDATION_FAILED",
          message:
            "vendor_payout_amount + customer_refund_amount cannot exceed booking total.",
        },
      },
      400,
    );
  }

  const fromStatus = booking.status;
  const transitioned = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(bookings)
      .set({
        status: "payment_released",
        escrowOutcome: "split",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookings.id, bookingId),
          inArray(bookings.status, ["disputed", "payment_held", "completed"]),
        ),
      )
      .returning({ id: bookings.id });

    if (!updated) return false;

    await tx
      .update(payments)
      .set({
        escrowStatus: "released",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(payments.bookingId, bookingId),
          eq(payments.status, "captured"),
        ),
      );

    await tx.insert(bookingEvents).values({
      id: ulid(),
      bookingId,
      fromStatus,
      toStatus: "payment_released",
      actorId: adminUser!.id,
      actorRole: "admin",
      metadata: {
        reason,
        resolve_outcome: "split",
        vendor_payout_amount: vendorPayout,
        customer_refund_amount: customerRefund,
        stub: true,
      },
    });

    await appendAuditLog(tx, {
      actorId: adminUser!.id,
      actorRole: adminUser!.role,
      action: "booking.resolve",
      resourceType: "booking",
      resourceId: bookingId,
      oldValue: { status: fromStatus },
      newValue: {
        outcome: "split",
        reason,
        vendor_payout_amount: vendorPayout,
        customer_refund_amount: customerRefund,
        stub: true,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return true;
  });

  if (!transitioned) {
    return c.json(
      {
        data: null,
        error: {
          code: "INVALID_STATE_TRANSITION",
          message: "Booking state changed during split resolve.",
        },
      },
      409,
    );
  }

  await notifyResolved();

  return c.json(
    {
      data: {
        booking_id: bookingId,
        status: "payment_released",
        escrow_outcome: "split",
        vendor_payout_amount: vendorPayout,
        customer_refund_amount: customerRefund,
        reason,
        stub: true,
        note: "Split amounts recorded; gateway split transfer/refund not executed yet.",
      },
      error: null,
    },
    200,
  );
});

/**
 * GET /v1/admin/settings
 * Category commission_bps + recent audit history for money settings.
 */
adminRouter.get("/settings", async (c) => {
  const { forbidden } = await requireAdmin(c);
  if (forbidden) return forbidden;

  const [categories, defaultBpsRow, recentAudits] = await Promise.all([
    db
      .select({
        id: categoryConfigs.id,
        contract_type: categoryConfigs.contractType,
        commission_bps: categoryConfigs.commissionBps,
        updated_at: categoryConfigs.updatedAt,
      })
      .from(categoryConfigs)
      .orderBy(asc(categoryConfigs.id)),
    db
      .select({ value: platformConfig.value })
      .from(platformConfig)
      .where(eq(platformConfig.key, "default_commission_bps"))
      .limit(1),
    db
      .select({
        id: auditLogs.id,
        actor_id: auditLogs.actorId,
        actor_role: auditLogs.actorRole,
        action: auditLogs.action,
        resource_type: auditLogs.resourceType,
        resource_id: auditLogs.resourceId,
        old_value: auditLogs.oldValue,
        new_value: auditLogs.newValue,
        created_at: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.action, "settings.commission_bps"))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20),
  ]);

  const rawDefault = defaultBpsRow[0]?.value;
  const default_commission_bps =
    typeof rawDefault === "number" && Number.isInteger(rawDefault)
      ? rawDefault
      : 200;

  return c.json(
    {
      data: {
        default_commission_bps,
        categories: categories.map((cat) => ({
          id: cat.id,
          contract_type: cat.contract_type,
          commission_bps: cat.commission_bps,
          updated_at: cat.updated_at.toISOString(),
        })),
        audit_history: recentAudits.map((row) => ({
          id: row.id,
          actor_id: row.actor_id,
          actor_role: row.actor_role,
          action: row.action,
          resource_type: row.resource_type,
          resource_id: row.resource_id,
          old_value: row.old_value,
          new_value: row.new_value,
          created_at: row.created_at.toISOString(),
        })),
      },
      error: null,
    },
    200,
  );
});

/**
 * PATCH /v1/admin/settings/categories/:id
 * Superadmin only — update category commission_bps with audit trail.
 */
adminRouter.patch("/settings/categories/:id", async (c) => {
  const { forbidden, adminUser } = await requireAdmin(c);
  if (forbidden) return forbidden;

  if (adminUser!.role !== "superadmin") {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Superadmin role required to change commission rates.",
        },
      },
      403,
    );
  }

  const categoryId = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateCategoryCommissionSchema.safeParse(body);

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

  const { commission_bps, confirm_commission_bps } = parsed.data;

  if (commission_bps > 500) {
    if (confirm_commission_bps !== commission_bps) {
      return c.json(
        {
          data: null,
          error: {
            code: "CONFIRMATION_REQUIRED",
            message:
              "Rates above 5% require confirm_commission_bps equal to commission_bps.",
          },
        },
        400,
      );
    }
  }

  const [existing] = await db
    .select({
      id: categoryConfigs.id,
      commissionBps: categoryConfigs.commissionBps,
    })
    .from(categoryConfigs)
    .where(eq(categoryConfigs.id, categoryId))
    .limit(1);

  if (!existing) {
    return c.json(
      {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Category '${categoryId}' was not found.`,
        },
      },
      404,
    );
  }

  const meta = requestMeta(c);
  const now = new Date();

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(categoryConfigs)
      .set({ commissionBps: commission_bps, updatedAt: now })
      .where(eq(categoryConfigs.id, categoryId))
      .returning({
        id: categoryConfigs.id,
        commission_bps: categoryConfigs.commissionBps,
        updated_at: categoryConfigs.updatedAt,
      });

    await appendAuditLog(tx, {
      actorId: adminUser!.id,
      actorRole: adminUser!.role,
      action: "settings.commission_bps",
      resourceType: "category_config",
      resourceId: categoryId,
      oldValue: { commission_bps: existing.commissionBps },
      newValue: { commission_bps },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return row;
  });

  return c.json(
    {
      data: {
        category: {
          id: updated!.id,
          commission_bps: updated!.commission_bps,
          updated_at: updated!.updated_at.toISOString(),
        },
      },
      error: null,
    },
    200,
  );
});

export { adminRouter };
