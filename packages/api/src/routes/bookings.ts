/**
 * Bookings routes handler.
 * Mounted at /v1/bookings.
 */

import { Hono } from "hono";
import { z } from "zod";
import { ulid } from "ulid";
import { eq } from "drizzle-orm";
import { db } from "@kritva/db/client";
import { bookings, bookingMilestones, bookingEvents, vendors } from "@kritva/db";
import { supabaseAuth, type AuthVariables } from "../middleware/supabase-auth.js";

// Router typed with AuthVariables so c.var.user is available downstream
const bookingsRouter = new Hono<{ Variables: AuthVariables }>();

// Request body schema per API spec
const createBookingSchema = z.object({
  vendor_id: z.string().min(1, "vendor_id is required"),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "event_date must be in YYYY-MM-DD format"),
  event_type: z.string().min(1, "event_type is required"),
  guest_count: z.number().int().positive().optional(),
  total_amount: z.number().int().positive("total_amount must be a positive integer in paisa"),
  notes: z.string().optional(),
});

/**
 * POST /v1/bookings
 * Customer-only: creates a booking inquiry and seeds the initial milestone.
 * Runs both inserts inside a single transaction to keep data consistent.
 */
bookingsRouter.post("/", supabaseAuth(), async (c) => {
  // 1. Parse and validate request body
  const body = await c.req.json();
  const parsed = createBookingSchema.safeParse(body);

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

  const { vendor_id, event_date, event_type, guest_count, total_amount, notes } = parsed.data;
  const customerId = c.get("user").id;

  // 2. Run both inserts in a transaction — any failure rolls back both
  const booking = await db.transaction(async (tx) => {
    const bookingId = ulid();

    // Insert the booking record with status defaulting to 'inquiry'
    const [newBooking] = await tx
      .insert(bookings)
      .values({
        id: bookingId,
        vendorId: vendor_id,
        customerId,
        eventDate: event_date,
        eventType: event_type,
        guestCount: guest_count,
        totalAmount: total_amount,
        notes,
        status: "inquiry",
      })
      .returning({
        id: bookings.id,
        status: bookings.status,
        total_amount: bookings.totalAmount,
        event_date: bookings.eventDate,
      });

    // Insert the single 'advance' milestone covering 100% of the total amount
    await tx.insert(bookingMilestones).values({
      id: ulid(),
      bookingId,
      name: "advance",
      label: "Full Payment",
      percentage: "100",
      amount: total_amount,
      paymentStatus: "pending",
    });

    return newBooking;
  });

  return c.json({ data: { booking }, error: null }, 201);
});

/**
 * PATCH /v1/bookings/:id/accept
 * Vendor-only: transitions a booking from 'inquiry' → 'vendor_accepted'.
 * Verifies booking existence, vendor ownership, and valid source status before
 * running the update + audit event insert inside a single transaction.
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

  // 5. Transition + audit log in one transaction
  await db.transaction(async (tx) => {
    // Update booking status
    await tx
      .update(bookings)
      .set({ status: "vendor_accepted" })
      .where(eq(bookings.id, bookingId));

    // Append an immutable audit event for this state change
    await tx.insert(bookingEvents).values({
      id: ulid(),
      bookingId,
      fromStatus: "inquiry",
      toStatus: "vendor_accepted",
      actorId: actorUserId,
      actorRole: "vendor",
    });
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
 * GET /v1/bookings
 * Authenticated: Returns all bookings belonging to the current user.
 * Dynamically resolves whether user is customer or vendor.
 */
bookingsRouter.get("/", supabaseAuth(), async (c) => {
  const user = c.get("user");
  const userId = user.id;

  // Let's first check if this user is a vendor.
  const [vendor] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.userId, userId))
    .limit(1);

  let results;
  if (vendor) {
    // If user is vendor, fetch bookings where vendorId matches their profile.
    results = await db
      .select({
        id: bookings.id,
        vendor_id: bookings.vendorId,
        customer_id: bookings.customerId,
        event_date: bookings.eventDate,
        event_type: bookings.eventType,
        total_amount: bookings.totalAmount,
        status: bookings.status,
      })
      .from(bookings)
      .where(eq(bookings.vendorId, vendor.id));
  } else {
    // If not vendor, assume customer, fetch bookings where customerId matches userId.
    results = await db
      .select({
        id: bookings.id,
        vendor_id: bookings.vendorId,
        customer_id: bookings.customerId,
        event_date: bookings.eventDate,
        event_type: bookings.eventType,
        total_amount: bookings.totalAmount,
        status: bookings.status,
      })
      .from(bookings)
      .where(eq(bookings.customerId, userId));
  }

  return c.json({ data: results, error: null }, 200);
});

export { bookingsRouter };
