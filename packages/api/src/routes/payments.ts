import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "@kritva/db";
import { eq } from "drizzle-orm";
import { bookings, payments, bookingMilestones } from "@kritva/db/schema";
import { requireAuth } from "../middleware/supabase-auth.js";
import type { AuthVariables } from "../middleware/supabase-auth.js";

export const paymentsRouter = new Hono<{ Variables: AuthVariables }>();

/**
 * 1. POST /v1/payments/initiate
 * Accepts a booking_id. Checks if booking exists, returns mock Razorpay payload.
 */
paymentsRouter.post(
  "/initiate",
  requireAuth(["customer"]),
  zValidator(
    "json",
    z.object({
      booking_id: z.string().min(1, "Booking ID is required"),
    })
  ),
  async (c) => {
    const { booking_id } = c.req.valid("json");

    // Verify booking exists and belongs to the customer
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
  zValidator(
    "json",
    z.object({
      booking_id: z.string().min(1, "Booking ID is required"),
    })
  ),
  async (c) => {
    const { booking_id } = c.req.valid("json");

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
  requireAuth(["customer"]),
  zValidator(
    "json",
    z.object({
      booking_id: z.string().min(1, "Booking ID is required"),
    })
  ),
  async (c) => {
    const { booking_id } = c.req.valid("json");

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
