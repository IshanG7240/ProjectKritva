/**
 * Bookings routes handler.
 * Mounted at /v1/bookings.
 */

import { Hono } from "hono";
import { ulid } from "ulid";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import {
  cancelBookingSchema,
  counterBookingSchema,
  createBookingInquirySchema,
  declineBookingSchema,
  listBookingsQuerySchema,
} from "@kritva/types";
import { db } from "@kritva/db/client";
import {
  bookings,
  bookingEvents,
  bookingMilestones,
  users,
  vendors,
  vendorPackages,
} from "@kritva/db";
import type { BookingPackageDetail, PackageUnit } from "@kritva/types";
import { dispatch as dispatchNotification } from "@kritva/notifications/dispatcher";
import { vendorDiscoverableWhere } from "../lib/vendor-discoverability.js";
import { supabaseAuth, type AuthVariables } from "../middleware/supabase-auth.js";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const bookingListFields = {
  id: bookings.id,
  vendor_id: bookings.vendorId,
  customer_id: bookings.customerId,
  event_date: bookings.eventDate,
  event_type: bookings.eventType,
  guest_count: bookings.guestCount,
  total_amount: bookings.totalAmount,
  notes: bookings.notes,
  status: bookings.status,
  package_details: bookings.packageDetails,
  counter_amount: bookings.counterAmount,
  counter_message: bookings.counterMessage,
  decline_reason: bookings.declineReason,
  vendor_business_name: vendors.businessName,
  customer_display_name: users.name,
};

function customerFirstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}

function mapBookingListRow(row: {
  id: string;
  vendor_id: string;
  customer_id: string;
  event_date: string;
  event_type: string;
  guest_count: number | null;
  total_amount: number;
  notes: string | null;
  status: (typeof bookings.$inferSelect)["status"];
  package_details: (typeof bookings.$inferSelect)["packageDetails"];
  counter_amount: number | null;
  counter_message: string | null;
  decline_reason: string | null;
  vendor_business_name: string;
  customer_display_name: string;
}) {
  return {
    ...row,
    customer_first_name: customerFirstName(row.customer_display_name),
  };
}

function resolveBookingsListRole(params: {
  roleParam: "customer" | "vendor" | undefined;
  userRole: string;
  hasVendorProfile: boolean;
}): "customer" | "vendor" | null {
  const { roleParam, userRole, hasVendorProfile } = params;

  if (roleParam === "customer") return "customer";
  if (roleParam === "vendor") return hasVendorProfile ? "vendor" : null;
  if (userRole === "vendor" && hasVendorProfile) return "vendor";
  return "customer";
}

async function seedFullPaymentMilestone(
  tx: DbTransaction,
  bookingId: string,
  totalAmount: number,
) {
  await tx.insert(bookingMilestones).values({
    id: ulid(),
    bookingId,
    name: "advance",
    label: "Full Payment",
    amount: totalAmount,
    percentage: "100.00",
    paymentStatus: "pending",
  });
}

async function notifyBookingAccepted(params: {
  bookingId: string;
  customerId: string;
  vendorId: string;
  totalAmount: number;
}) {
  await dispatchNotification({
    kind: "booking_vendor_accepted",
    booking_id: params.bookingId,
    customer_id: params.customerId,
    vendor_id: params.vendorId,
    total_amount: params.totalAmount,
  });
}

// Router typed with AuthVariables so c.var.user is available downstream
const bookingsRouter = new Hono<{ Variables: AuthVariables }>();

/**
 * POST /v1/bookings
 * Creates a booking inquiry with server-built package_details snapshots.
 * Milestones are seeded on vendor accept (Phase 2), not at inquiry.
 */
bookingsRouter.post("/", supabaseAuth(), async (c) => {
  const body = await c.req.json();
  const parsed = createBookingInquirySchema.safeParse(body);

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

  const {
    vendor_id,
    package_details: packageSelections,
    event_date,
    event_type,
    guest_count,
    total_amount,
    notes,
    city_id,
    event_id,
  } = parsed.data;
  const customerId = c.get("user").id;

  const [vendor] = await db
    .select({
      id: vendors.id,
      verificationStatus: vendors.verificationStatus,
    })
    .from(vendors)
    .where(and(eq(vendors.id, vendor_id), vendorDiscoverableWhere()))
    .limit(1);

  if (!vendor) {
    const [existing] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.id, vendor_id))
      .limit(1);

    if (!existing) {
      return c.json(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: `Vendor '${vendor_id}' was not found.`,
          },
        },
        404,
      );
    }

    return c.json(
      {
        data: null,
        error: {
          code: "VENDOR_NOT_LISTED",
          message: "This vendor is not accepting inquiries.",
        },
      },
      403,
    );
  }

  const packageIds = packageSelections.map((detail) => detail.package_id);
  const ownedPackages = await db
    .select({
      id: vendorPackages.id,
      name: vendorPackages.name,
      price: vendorPackages.price,
      unit: vendorPackages.unit,
      minQuantity: vendorPackages.minQuantity,
    })
    .from(vendorPackages)
    .where(
      and(
        eq(vendorPackages.vendorId, vendor_id),
        eq(vendorPackages.isActive, true),
        inArray(vendorPackages.id, packageIds),
      ),
    );

  if (ownedPackages.length !== new Set(packageIds).size) {
    return c.json(
      {
        data: null,
        error: {
          code: "INVALID_PACKAGE",
          message: "One or more packages do not belong to this vendor.",
        },
      },
      400,
    );
  }

  const packageById = new Map(ownedPackages.map((pkg) => [pkg.id, pkg]));
  const packageSnapshots: BookingPackageDetail[] = [];

  for (const selection of packageSelections) {
    const pkg = packageById.get(selection.package_id);
    if (!pkg) {
      return c.json(
        {
          data: null,
          error: {
            code: "INVALID_PACKAGE",
            message: "One or more packages do not belong to this vendor.",
          },
        },
        400,
      );
    }

    if (
      pkg.minQuantity != null &&
      selection.quantity < pkg.minQuantity
    ) {
      return c.json(
        {
          data: null,
          error: {
            code: "MIN_QUANTITY",
            message: `Package '${pkg.name}' requires a minimum quantity of ${pkg.minQuantity}.`,
          },
        },
        400,
      );
    }

    packageSnapshots.push({
      package_id: pkg.id as BookingPackageDetail["package_id"],
      name: pkg.name,
      quantity: selection.quantity,
      unit: pkg.unit as PackageUnit,
      price_at_booking: pkg.price as BookingPackageDetail["price_at_booking"],
    });
  }

  const booking = await db.transaction(async (tx) => {
    const bookingId = ulid();

    const [newBooking] = await tx
      .insert(bookings)
      .values({
        id: bookingId,
        eventId: event_id ?? null,
        vendorId: vendor_id,
        customerId,
        packageDetails: packageSnapshots,
        eventDate: event_date,
        eventType: event_type,
        guestCount: guest_count ?? null,
        totalAmount: total_amount,
        notes: notes ?? null,
        cityId: city_id,
        status: "inquiry",
      })
      .returning({
        id: bookings.id,
        status: bookings.status,
        total_amount: bookings.totalAmount,
        event_date: bookings.eventDate,
        package_details: bookings.packageDetails,
      });

    await tx.insert(bookingEvents).values({
      id: ulid(),
      bookingId,
      fromStatus: "",
      toStatus: "inquiry",
      actorId: customerId,
      actorRole: "customer",
    });

    return newBooking;
  });

  return c.json({ data: { booking }, error: null }, 201);
});

/**
 * PATCH /v1/bookings/:id/accept
 * Vendor-only: inquiry → vendor_accepted.
 * Seeds a single full-payment milestone and notifies the customer.
 */
bookingsRouter.patch("/:id/accept", supabaseAuth(), async (c) => {
  const bookingId = c.req.param("id");
  const actorUserId = c.get("user").id;

  // 1. Resolve the authenticated user → vendor profile
  //    vendors.userId is the FK linking a Supabase auth user to a vendor record.
  const [vendor] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.userId, actorUserId))
    .limit(1);

  if (!vendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "No vendor profile is associated with this account.",
        },
      },
      403,
    );
  }

  // 2. Fetch the booking
  const [booking] = await db
    .select({
      id: bookings.id,
      vendorId: bookings.vendorId,
      customerId: bookings.customerId,
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

  // 3. Ownership check — the booking must belong to this vendor
  if (booking.vendorId !== vendor.id) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to act on this booking.",
        },
      },
      403,
    );
  }

  // 4. State guard — can only accept an inquiry
  if (booking.status !== "inquiry") {
    return c.json(
      {
        data: null,
        error: {
          code: "INVALID_STATE_TRANSITION",
          message: `Cannot accept a booking with status '${booking.status}'. Expected 'inquiry'.`,
        },
      },
      409,
    );
  }

  // 5. Transition, milestone seed, and audit log in one transaction
  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({ status: "vendor_accepted" })
      .where(eq(bookings.id, bookingId));

    await seedFullPaymentMilestone(tx, bookingId, booking.totalAmount);

    await tx.insert(bookingEvents).values({
      id: ulid(),
      bookingId,
      fromStatus: "inquiry",
      toStatus: "vendor_accepted",
      actorId: actorUserId,
      actorRole: "vendor",
      metadata: { total_amount: booking.totalAmount },
    });
  });

  await notifyBookingAccepted({
    bookingId,
    customerId: booking.customerId,
    vendorId: booking.vendorId,
    totalAmount: booking.totalAmount,
  });

  return c.json(
    {
      data: {
        booking_id: bookingId,
        status: "vendor_accepted",
      },
      error: null,
    },
    200,
  );
});

/**
 * PATCH /v1/bookings/:id/decline
 * Vendor-only: inquiry → vendor_declined with required reason.
 */
bookingsRouter.patch("/:id/decline", supabaseAuth(), async (c) => {
  const bookingId = c.req.param("id");
  const actorUserId = c.get("user").id;

  const body = await c.req.json();
  const parsed = declineBookingSchema.safeParse(body);
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

  const [vendor] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.userId, actorUserId))
    .limit(1);

  if (!vendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "No vendor profile is associated with this account.",
        },
      },
      403,
    );
  }

  const [booking] = await db
    .select({
      id: bookings.id,
      vendorId: bookings.vendorId,
      status: bookings.status,
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

  if (booking.vendorId !== vendor.id) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to act on this booking.",
        },
      },
      403,
    );
  }

  if (booking.status !== "inquiry") {
    return c.json(
      {
        data: null,
        error: {
          code: "INVALID_STATE_TRANSITION",
          message: `Cannot decline a booking with status '${booking.status}'. Expected 'inquiry'.`,
        },
      },
      409,
    );
  }

  const { decline_reason } = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({
        status: "vendor_declined",
        declineReason: decline_reason,
      })
      .where(eq(bookings.id, bookingId));

    await tx.insert(bookingEvents).values({
      id: ulid(),
      bookingId,
      fromStatus: "inquiry",
      toStatus: "vendor_declined",
      actorId: actorUserId,
      actorRole: "vendor",
      metadata: { decline_reason },
    });
  });

  return c.json(
    {
      data: {
        booking_id: bookingId,
        status: "vendor_declined",
      },
      error: null,
    },
    200,
  );
});

/**
 * PATCH /v1/bookings/:id/counter
 * Vendor-only: inquiry → vendor_countered with counter amount and optional message.
 */
bookingsRouter.patch("/:id/counter", supabaseAuth(), async (c) => {
  const bookingId = c.req.param("id");
  const actorUserId = c.get("user").id;

  const body = await c.req.json();
  const parsed = counterBookingSchema.safeParse(body);
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

  const [vendor] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.userId, actorUserId))
    .limit(1);

  if (!vendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "No vendor profile is associated with this account.",
        },
      },
      403,
    );
  }

  const [booking] = await db
    .select({
      id: bookings.id,
      vendorId: bookings.vendorId,
      status: bookings.status,
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

  if (booking.vendorId !== vendor.id) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to act on this booking.",
        },
      },
      403,
    );
  }

  if (booking.status !== "inquiry") {
    return c.json(
      {
        data: null,
        error: {
          code: "INVALID_STATE_TRANSITION",
          message: `Cannot counter a booking with status '${booking.status}'. Expected 'inquiry'.`,
        },
      },
      409,
    );
  }

  const { counter_amount, counter_message } = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({
        status: "vendor_countered",
        counterAmount: counter_amount,
        counterMessage: counter_message ?? null,
      })
      .where(eq(bookings.id, bookingId));

    await tx.insert(bookingEvents).values({
      id: ulid(),
      bookingId,
      fromStatus: "inquiry",
      toStatus: "vendor_countered",
      actorId: actorUserId,
      actorRole: "vendor",
      metadata: {
        counter_amount,
        counter_message: counter_message ?? null,
      },
    });
  });

  return c.json(
    {
      data: {
        booking_id: bookingId,
        status: "vendor_countered",
      },
      error: null,
    },
    200,
  );
});

/**
 * PATCH /v1/bookings/:id/accept-counter
 * Customer-only: vendor_countered → vendor_accepted.
 * Locks total_amount to counter_amount, seeds milestone, notifies customer.
 */
bookingsRouter.patch("/:id/accept-counter", supabaseAuth(), async (c) => {
  const bookingId = c.req.param("id");
  const actorUserId = c.get("user").id;

  const [booking] = await db
    .select({
      id: bookings.id,
      customerId: bookings.customerId,
      vendorId: bookings.vendorId,
      status: bookings.status,
      totalAmount: bookings.totalAmount,
      counterAmount: bookings.counterAmount,
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

  if (booking.customerId !== actorUserId) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to act on this booking.",
        },
      },
      403,
    );
  }

  if (booking.status !== "vendor_countered") {
    return c.json(
      {
        data: null,
        error: {
          code: "INVALID_STATE_TRANSITION",
          message: `Cannot accept counter on a booking with status '${booking.status}'. Expected 'vendor_countered'.`,
        },
      },
      409,
    );
  }

  if (booking.counterAmount == null) {
    return c.json(
      {
        data: null,
        error: {
          code: "INVALID_STATE",
          message: "Booking has no counter amount to accept.",
        },
      },
      409,
    );
  }

  const counterAmount = booking.counterAmount;
  const previousTotal = booking.totalAmount;

  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({
        status: "vendor_accepted",
        totalAmount: counterAmount,
      })
      .where(eq(bookings.id, bookingId));

    await seedFullPaymentMilestone(tx, bookingId, counterAmount);

    await tx.insert(bookingEvents).values({
      id: ulid(),
      bookingId,
      fromStatus: "vendor_countered",
      toStatus: "vendor_accepted",
      actorId: actorUserId,
      actorRole: "customer",
      metadata: {
        counter_amount: counterAmount,
        previous_total_amount: previousTotal,
      },
    });
  });

  await notifyBookingAccepted({
    bookingId,
    customerId: booking.customerId,
    vendorId: booking.vendorId,
    totalAmount: counterAmount,
  });

  return c.json(
    {
      data: {
        booking_id: bookingId,
        status: "vendor_accepted",
        total_amount: counterAmount,
      },
      error: null,
    },
    200,
  );
});

/**
 * PATCH /v1/bookings/:id/cancel
 * Pre-payment cancellation by customer or vendor (vendor_accepted only for vendors).
 */
bookingsRouter.patch("/:id/cancel", supabaseAuth(), async (c) => {
  const bookingId = c.req.param("id");
  const actorUserId = c.get("user").id;

  const body = await c.req.json().catch(() => ({}));
  const parsed = cancelBookingSchema.safeParse(body);
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

  const [booking] = await db
    .select({
      id: bookings.id,
      customerId: bookings.customerId,
      vendorId: bookings.vendorId,
      status: bookings.status,
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

  const [vendor] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.userId, actorUserId))
    .limit(1);

  const isCustomer = booking.customerId === actorUserId;
  const isVendor = vendor != null && booking.vendorId === vendor.id;

  if (!isCustomer && !isVendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to act on this booking.",
        },
      },
      403,
    );
  }

  const customerCancelStatuses = new Set([
    "inquiry",
    "vendor_countered",
    "vendor_accepted",
  ]);
  const vendorCancelStatuses = new Set(["vendor_accepted"]);

  const allowedStatuses = isCustomer
    ? customerCancelStatuses
    : vendorCancelStatuses;

  if (!allowedStatuses.has(booking.status)) {
    const hint =
      isVendor && !isCustomer && booking.status === "inquiry"
        ? " Use decline for inquiries you cannot take."
        : "";
    return c.json(
      {
        data: null,
        error: {
          code: "INVALID_STATE_TRANSITION",
          message: `Cannot cancel a booking with status '${booking.status}'.${hint}`,
        },
      },
      409,
    );
  }

  const { reason } = parsed.data;
  const actorRole = isVendor ? "vendor" : "customer";
  const fromStatus = booking.status;

  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({ status: "cancelled" })
      .where(eq(bookings.id, bookingId));

    await tx.insert(bookingEvents).values({
      id: ulid(),
      bookingId,
      fromStatus,
      toStatus: "cancelled",
      actorId: actorUserId,
      actorRole,
      metadata: { reason: reason ?? null },
    });
  });

  return c.json(
    {
      data: {
        booking_id: bookingId,
        status: "cancelled",
      },
      error: null,
    },
    200,
  );
});

/**
 * GET /v1/bookings
 * Lists bookings for the authenticated user as customer or vendor.
 * Supports status filter, cursor pagination, and explicit ?role=.
 */
bookingsRouter.get("/", supabaseAuth(), async (c) => {
  const userId = c.get("user").id;

  const parsed = listBookingsQuerySchema.safeParse({
    status: c.req.query("status") || undefined,
    limit: c.req.query("limit") ?? undefined,
    cursor: c.req.query("cursor") || undefined,
    role: c.req.query("role") || undefined,
  });

  if (!parsed.success) {
    return c.json(
      {
        data: null,
        error: {
          code: "VALIDATION_FAILED",
          message: "Invalid query parameters.",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const { status: statusFilter, limit, cursor, role: roleParam } = parsed.data;

  const [[userRecord], [vendor]] = await Promise.all([
    db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.userId, userId))
      .limit(1),
  ]);

  const listRole = resolveBookingsListRole({
    roleParam,
    userRole: userRecord?.role ?? "customer",
    hasVendorProfile: vendor != null,
  });

  if (listRole == null) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "No vendor profile is associated with this account.",
        },
      },
      403,
    );
  }

  const whereConditions = [
    listRole === "vendor"
      ? eq(bookings.vendorId, vendor!.id)
      : eq(bookings.customerId, userId),
  ];

  if (statusFilter?.length) {
    whereConditions.push(inArray(bookings.status, statusFilter));
  }

  if (cursor) {
    whereConditions.push(lt(bookings.id, cursor));
  }

  const rows = await db
    .select(bookingListFields)
    .from(bookings)
    .innerJoin(vendors, eq(bookings.vendorId, vendors.id))
    .innerJoin(users, eq(bookings.customerId, users.id))
    .where(and(...whereConditions))
    .orderBy(desc(bookings.id))
    .limit(limit + 1);

  const hasNextPage = rows.length > limit;
  const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage ? pageRows[pageRows.length - 1]?.id : undefined;

  return c.json(
    {
      data: pageRows.map(mapBookingListRow),
      error: null,
      meta: {
        pagination: {
          limit,
          hasNextPage,
          ...(nextCursor ? { nextCursor } : {}),
        },
      },
    },
    200,
  );
});

const RECENT_BOOKING_EVENTS_LIMIT = 20;

/**
 * GET /v1/bookings/:id
 * Returns full booking detail for the owning customer or vendor.
 */
bookingsRouter.get("/:id", supabaseAuth(), async (c) => {
  const bookingId = c.req.param("id");
  const actorUserId = c.get("user").id;

  const [row] = await db
    .select({
      id: bookings.id,
      vendor_id: bookings.vendorId,
      customer_id: bookings.customerId,
      event_id: bookings.eventId,
      event_date: bookings.eventDate,
      event_type: bookings.eventType,
      guest_count: bookings.guestCount,
      total_amount: bookings.totalAmount,
      notes: bookings.notes,
      city_id: bookings.cityId,
      status: bookings.status,
      package_details: bookings.packageDetails,
      counter_amount: bookings.counterAmount,
      counter_message: bookings.counterMessage,
      decline_reason: bookings.declineReason,
      created_at: bookings.createdAt,
      updated_at: bookings.updatedAt,
      vendor_business_name: vendors.businessName,
      customer_display_name: users.name,
    })
    .from(bookings)
    .innerJoin(vendors, eq(bookings.vendorId, vendors.id))
    .innerJoin(users, eq(bookings.customerId, users.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) {
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

  const [vendor] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.userId, actorUserId))
    .limit(1);

  const isCustomer = row.customer_id === actorUserId;
  const isVendor = vendor != null && row.vendor_id === vendor.id;

  if (!isCustomer && !isVendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to view this booking.",
        },
      },
      403,
    );
  }

  const [milestones, recentEvents] = await Promise.all([
    db
      .select({
        id: bookingMilestones.id,
        name: bookingMilestones.name,
        label: bookingMilestones.label,
        amount: bookingMilestones.amount,
        percentage: bookingMilestones.percentage,
        due_date: bookingMilestones.dueDate,
        payment_status: bookingMilestones.paymentStatus,
        released_at: bookingMilestones.releasedAt,
      })
      .from(bookingMilestones)
      .where(eq(bookingMilestones.bookingId, bookingId)),
    db
      .select({
        id: bookingEvents.id,
        from_status: bookingEvents.fromStatus,
        to_status: bookingEvents.toStatus,
        actor_id: bookingEvents.actorId,
        actor_role: bookingEvents.actorRole,
        metadata: bookingEvents.metadata,
        created_at: bookingEvents.createdAt,
      })
      .from(bookingEvents)
      .where(eq(bookingEvents.bookingId, bookingId))
      .orderBy(desc(bookingEvents.createdAt))
      .limit(RECENT_BOOKING_EVENTS_LIMIT),
  ]);

  const booking = {
    id: row.id,
    vendor_id: row.vendor_id,
    customer_id: row.customer_id,
    event_id: row.event_id,
    event_date: row.event_date,
    event_type: row.event_type,
    guest_count: row.guest_count,
    total_amount: row.total_amount,
    notes: row.notes,
    city_id: row.city_id,
    status: row.status,
    package_details: row.package_details,
    counter_amount: row.counter_amount,
    counter_message: row.counter_message,
    decline_reason: row.decline_reason,
    vendor_business_name: row.vendor_business_name,
    customer_display_name: row.customer_display_name,
    customer_first_name: customerFirstName(row.customer_display_name),
    milestones: milestones.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      label: milestone.label,
      amount: milestone.amount,
      percentage: Number(milestone.percentage),
      due_date: milestone.due_date,
      payment_status: milestone.payment_status,
      released_at: milestone.released_at?.toISOString() ?? null,
    })),
    booking_events: recentEvents
      .slice()
      .reverse()
      .map((event) => ({
        id: event.id,
        from_status: event.from_status,
        to_status: event.to_status,
        actor_id: event.actor_id,
        actor_role: event.actor_role,
        metadata: event.metadata ?? null,
        created_at: event.created_at.toISOString(),
      })),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };

  return c.json({ data: { booking }, error: null }, 200);
});

export { bookingsRouter };
