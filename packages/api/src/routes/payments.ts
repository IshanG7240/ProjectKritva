import { Hono } from "hono";
import { z } from "zod";
import { db } from "@kritva/db/client";
import { eq } from "drizzle-orm";
import { bookings, payments, bookingMilestones } from "@kritva/db";
import { supabaseAuth } from "../middleware/supabase-auth.js";
import type { AuthVariables } from "../middleware/supabase-auth.js";

export const paymentsRouter = new Hono<{ Variables: AuthVariables }>();

// Zod schemas for validation
const initiateSchema = z.object({
  booking_id: z.string().min(1, "Booking ID is required"),
});

const simulateCaptureSchema = z.object({
  booking_id: z.string().min(1, "Booking ID is required"),
});

const releaseSchema = z.object({
  booking_id: z.string().min(1, "Booking ID is required"),
});

/**
 * 1. POST /v1/payments/initiate
 * Accepts a booking_id. Checks if booking exists, returns mock Razorpay payload.
 */
paymentsRouter.post(
  "/initiate",
  supabaseAuth(),
  async (c) => {
    const body = await c.req.json();
    const parsed = initiateSchema.safeParse(body);

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
        400
      );
    }

    const { booking_id } = parsed.data;

    // Verify booking exists
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, booking_id),
    });

    if (!booking) {
      return c.json(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Booking not found",
          },
        },
        404
      );
    }

    // Return fake success payload mimicking Razorpay order
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
      200
    );
  }
);

/**
 * 2. POST /v1/payments/simulate-capture
 * Replaces webhook: updates booking to customer_confirmed and inserts a held payment.
 */
paymentsRouter.post(
  "/simulate-capture",
  async (c) => {
    const body = await c.req.json();
    const parsed = simulateCaptureSchema.safeParse(body);

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
        400
      );
    }

    const { booking_id } = parsed.data;

    try {
      await db.transaction(async (tx) => {
        // Update booking status
        const [booking] = await tx
          .update(bookings)
          .set({ status: "customer_confirmed", updatedAt: new Date() })
          .where(eq(bookings.id, booking_id))
          .returning();

        if (!booking) {
          throw new Error("Booking not found");
        }

        // Fetch milestone to link payment
        const [milestone] = await tx
          .select()
          .from(bookingMilestones)
          .where(eq(bookingMilestones.bookingId, booking_id))
          .limit(1);

        const milestoneId = milestone ? milestone.id : "mock_milestone_id";

        // Insert captured, held payment
        await tx.insert(payments).values({
          bookingId: booking_id,
          milestoneId: milestoneId,
          customerId: booking.customerId,
          vendorId: booking.vendorId,
          amount: booking.totalAmount,
          currency: "INR",
          status: "captured",
          escrowStatus: "held",
          capturedAt: new Date(),
        });
      });

      return c.json({ data: { success: true }, error: null }, 200);
    } catch (error: any) {
      return c.json(
        {
          data: null,
          error: {
            code: "CAPTURE_FAILED",
            message: error.message || "Failed to simulate capture",
          },
        },
        400
      );
    }
  }
);

/**
 * 3. POST /v1/payments/release
 * Updates payment escrow status to released and booking to completed. Returns commission split.
 */
paymentsRouter.post(
  "/release",
  supabaseAuth(),
  async (c) => {
    const body = await c.req.json();
    const parsed = releaseSchema.safeParse(body);

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
        400
      );
    }

    const { booking_id } = parsed.data;

    try {
      const payout = await db.transaction(async (tx) => {
        // Update payment to released
        const [payment] = await tx
          .update(payments)
          .set({ escrowStatus: "released", updatedAt: new Date() })
          .where(eq(payments.bookingId, booking_id))
          .returning();

        if (!payment) {
          throw new Error("Payment not found for this booking");
        }

        // Update booking to completed
        const [booking] = await tx
          .update(bookings)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(bookings.id, booking_id))
          .returning();

        if (!booking) {
          throw new Error("Booking not found");
        }

        // Calculate 8% commission using integer math (paisa)
        const platform_commission = Math.floor(booking.totalAmount * 0.08);
        const amount_transferred = booking.totalAmount - platform_commission;

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
        200
      );
    } catch (error: any) {
      return c.json(
        {
          data: null,
          error: {
            code: "RELEASE_FAILED",
            message: error.message || "Failed to release payment",
          },
        },
        400
      );
    }
  }
);
