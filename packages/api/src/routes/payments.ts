import { Hono } from "hono";
import { ulid } from "ulid";
import { initiatePaymentSchema, releasePaymentSchema, simulateCapturePaymentSchema } from "@kritva/types";
import { db } from "@kritva/db/client";
import { and, eq } from "drizzle-orm";
import { bookings, bookingEvents, payments, bookingMilestones } from "@kritva/db";
import { supabaseAuth } from "../middleware/supabase-auth.js";
import type { AuthVariables } from "../middleware/supabase-auth.js";

export const paymentsRouter = new Hono<{ Variables: AuthVariables }>();

/**
 * 1. POST /v1/payments/initiate
 * Customer-only: vendor_accepted → payment_pending, then return mock Razorpay payload.
 */
paymentsRouter.post(
  "/initiate",
  supabaseAuth(),
  async (c) => {
    const body = await c.req.json();
    const parsed = initiatePaymentSchema.safeParse(body);

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

    const { booking_id } = parsed.data;
    const actorUserId = c.get("user").id;

    const [booking] = await db
      .select({
        id: bookings.id,
        customerId: bookings.customerId,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
      })
      .from(bookings)
      .where(eq(bookings.id, booking_id))
      .limit(1);

    if (!booking) {
      return c.json(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: `Booking '${booking_id}' was not found.`,
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
            message: "You do not have permission to pay for this booking.",
          },
        },
        403,
      );
    }

    if (booking.status !== "vendor_accepted") {
      return c.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE_TRANSITION",
            message: `Cannot initiate payment on a booking with status '${booking.status}'. Expected 'vendor_accepted'.`,
          },
        },
        409,
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({ status: "payment_pending", updatedAt: new Date() })
        .where(eq(bookings.id, booking_id));

      await tx.insert(bookingEvents).values({
        id: ulid(),
        bookingId: booking_id,
        fromStatus: "vendor_accepted",
        toStatus: "payment_pending",
        actorId: actorUserId,
        actorRole: "customer",
        metadata: { amount: booking.totalAmount },
      });
    });

    return c.json(
      {
        data: {
          payment_id: "mock_pay_12345",
          gateway_order_id: "mock_order_12345",
          amount: booking.totalAmount,
          currency: "INR",
          razorpay_key_id: "rzp_test_mock_key",
        },
        error: null,
      },
      200,
    );
  },
);

/**
 * 2. POST /v1/payments/simulate-capture
 * Mock webhook: payment_pending → payment_held with payment row, milestone, and audit event.
 * Idempotent when booking is already payment_held.
 */
paymentsRouter.post(
  "/simulate-capture",
  supabaseAuth(),
  async (c) => {
    const body = await c.req.json();
    const parsed = simulateCapturePaymentSchema.safeParse(body);

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

    const { booking_id } = parsed.data;
    const actorUserId = c.get("user").id;

    const [booking] = await db
      .select({
        id: bookings.id,
        customerId: bookings.customerId,
        vendorId: bookings.vendorId,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
      })
      .from(bookings)
      .where(eq(bookings.id, booking_id))
      .limit(1);

    if (!booking) {
      return c.json(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: `Booking '${booking_id}' was not found.`,
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
            message: "You do not have permission to capture payment for this booking.",
          },
        },
        403,
      );
    }

    if (booking.status === "payment_held") {
      return c.json(
        {
          data: { success: true, status: "payment_held" },
          error: null,
        },
        200,
      );
    }

    if (booking.status !== "payment_pending") {
      return c.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE_TRANSITION",
            message: `Cannot capture payment on a booking with status '${booking.status}'. Expected 'payment_pending'.`,
          },
        },
        409,
      );
    }

    const [milestone] = await db
      .select({ id: bookingMilestones.id })
      .from(bookingMilestones)
      .where(eq(bookingMilestones.bookingId, booking_id))
      .limit(1);

    if (!milestone) {
      return c.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE",
            message: "No payment milestone found for this booking.",
          },
        },
        409,
      );
    }

    try {
      const paymentId = ulid();

      await db.transaction(async (tx) => {
        const [updatedBooking] = await tx
          .update(bookings)
          .set({ status: "payment_held", updatedAt: new Date() })
          .where(
            and(
              eq(bookings.id, booking_id),
              eq(bookings.status, "payment_pending"),
            ),
          )
          .returning({ id: bookings.id });

        if (!updatedBooking) {
          throw new Error("Booking state changed during capture");
        }

        await tx.insert(payments).values({
          id: paymentId,
          bookingId: booking_id,
          milestoneId: milestone.id,
          customerId: booking.customerId,
          vendorId: booking.vendorId,
          amount: booking.totalAmount,
          currency: "INR",
          status: "captured",
          escrowStatus: "held",
          capturedAt: new Date(),
        });

        await tx
          .update(bookingMilestones)
          .set({ paymentStatus: "held", paymentId })
          .where(eq(bookingMilestones.id, milestone.id));

        await tx.insert(bookingEvents).values({
          id: ulid(),
          bookingId: booking_id,
          fromStatus: "payment_pending",
          toStatus: "payment_held",
          actorId: actorUserId,
          actorRole: "customer",
          metadata: {
            amount: booking.totalAmount,
            payment_id: paymentId,
          },
        });
      });

      return c.json(
        {
          data: { success: true, status: "payment_held" },
          error: null,
        },
        200,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to simulate capture";

      return c.json(
        {
          data: null,
          error: {
            code: "CAPTURE_FAILED",
            message,
          },
        },
        400,
      );
    }
  },
);

/**
 * 3. POST /v1/payments/release
 * Customer-only: marks event complete (if payment_held) then releases escrow.
 * payment_held|completed → payment_released with milestone + audit events.
 */
paymentsRouter.post(
  "/release",
  supabaseAuth(),
  async (c) => {
    const body = await c.req.json();
    const parsed = releasePaymentSchema.safeParse(body);

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

    const { booking_id } = parsed.data;
    const actorUserId = c.get("user").id;

    const [booking] = await db
      .select({
        id: bookings.id,
        customerId: bookings.customerId,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
      })
      .from(bookings)
      .where(eq(bookings.id, booking_id))
      .limit(1);

    if (!booking) {
      return c.json(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: `Booking '${booking_id}' was not found.`,
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
            message: "You do not have permission to release payment for this booking.",
          },
        },
        403,
      );
    }

    if (booking.status === "payment_released") {
      const platform_commission = Math.floor(booking.totalAmount * 0.08);
      const amount_transferred = booking.totalAmount - platform_commission;

      return c.json(
        {
          data: {
            booking_id,
            status: "payment_released",
            payout: { amount_transferred, platform_commission },
          },
          error: null,
        },
        200,
      );
    }

    if (booking.status !== "payment_held" && booking.status !== "completed") {
      return c.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE_TRANSITION",
            message: `Cannot release payment on a booking with status '${booking.status}'. Expected 'payment_held' or 'completed'.`,
          },
        },
        409,
      );
    }

    const [payment] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.bookingId, booking_id))
      .limit(1);

    if (!payment) {
      return c.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE",
            message: "No captured payment found for this booking.",
          },
        },
        409,
      );
    }

    const [milestone] = await db
      .select({ id: bookingMilestones.id })
      .from(bookingMilestones)
      .where(eq(bookingMilestones.bookingId, booking_id))
      .limit(1);

    if (!milestone) {
      return c.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE",
            message: "No payment milestone found for this booking.",
          },
        },
        409,
      );
    }

    try {
      const payout = await db.transaction(async (tx) => {
        if (booking.status === "payment_held") {
          const [markedComplete] = await tx
            .update(bookings)
            .set({ status: "completed", updatedAt: new Date() })
            .where(
              and(
                eq(bookings.id, booking_id),
                eq(bookings.status, "payment_held"),
              ),
            )
            .returning({ id: bookings.id });

          if (!markedComplete) {
            throw new Error("Booking state changed during release");
          }

          await tx.insert(bookingEvents).values({
            id: ulid(),
            bookingId: booking_id,
            fromStatus: "payment_held",
            toStatus: "completed",
            actorId: actorUserId,
            actorRole: "customer",
            metadata: { amount: booking.totalAmount },
          });
        }

        await tx
          .update(payments)
          .set({ escrowStatus: "released", updatedAt: new Date() })
          .where(eq(payments.id, payment.id));

        const [releasedBooking] = await tx
          .update(bookings)
          .set({ status: "payment_released", updatedAt: new Date() })
          .where(
            and(
              eq(bookings.id, booking_id),
              eq(bookings.status, "completed"),
            ),
          )
          .returning({ totalAmount: bookings.totalAmount });

        if (!releasedBooking) {
          throw new Error("Booking state changed during release");
        }

        await tx
          .update(bookingMilestones)
          .set({
            paymentStatus: "released",
            paymentId: payment.id,
            releasedAt: new Date(),
          })
          .where(eq(bookingMilestones.id, milestone.id));

        await tx.insert(bookingEvents).values({
          id: ulid(),
          bookingId: booking_id,
          fromStatus: "completed",
          toStatus: "payment_released",
          actorId: actorUserId,
          actorRole: "customer",
          metadata: {
            amount: releasedBooking.totalAmount,
            payment_id: payment.id,
          },
        });

        const platform_commission = Math.floor(
          releasedBooking.totalAmount * 0.08,
        );
        const amount_transferred =
          releasedBooking.totalAmount - platform_commission;

        return { amount_transferred, platform_commission };
      });

      return c.json(
        {
          data: {
            booking_id,
            status: "payment_released",
            payout,
          },
          error: null,
        },
        200,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to release payment";

      return c.json(
        {
          data: null,
          error: {
            code: "RELEASE_FAILED",
            message,
          },
        },
        400,
      );
    }
  },
);
