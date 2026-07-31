import { Hono } from "hono";
import { ulid } from "ulid";
import {
  createOrderSchema,
  linkBankAccountSchema,
  releasePaymentSchema,
  simulatedCheckoutSchema,
  verifyPaymentSchema,
  verifyPennyDropSchema,
} from "@kritva/types";
import { db } from "@kritva/db/client";
import { and, eq } from "drizzle-orm";
import {
  bookings,
  bookingEvents,
  payments,
  bookingMilestones,
  paymentPayouts,
  vendorBankAccounts,
  vendors,
  users,
} from "@kritva/db";
import {
  getPaymentProvider,
  getSimulatedProvider,
  OrderValidationError,
  RazorpayApiError,
  RazorpayAuthError,
  prepareBankAccountForStorage,
  transfer as providerTransfer,
  type PaymentMode,
} from "@kritva/payments";
import { dispatch as dispatchNotification } from "@kritva/notifications/dispatcher";
import { config } from "../config.js";
import {
  computePlatformAmounts,
  DEFAULT_COMMISSION_BPS,
  vendorPayoutPaisa,
} from "../lib/commission.js";
import { accountStatus } from "../middleware/account-status.js";
import { supabaseAuth } from "../middleware/supabase-auth.js";
import type { AuthVariables } from "../middleware/supabase-auth.js";

export const paymentsRouter = new Hono<{ Variables: AuthVariables }>();

paymentsRouter.use("*", supabaseAuth(), accountStatus());

interface BookingForPayment {
  id: string;
  customerId: string;
  vendorId: string;
  status: string;
  totalAmount: number;
  commissionBps: number | null;
}

interface PaymentForCapture {
  id: string;
  bookingId: string;
  amount: number;
  status: string;
  gatewayPaymentId: string | null;
  mode?: string;
}

function assertPaymentMode(
  rowMode: string,
): { ok: true } | { ok: false; code: string; message: string } {
  if (rowMode !== config.PAYMENT_MODE) {
    return {
      ok: false,
      code: "PAYMENT_MODE_MISMATCH",
      message: `This payment was created in '${rowMode}' mode; server is '${config.PAYMENT_MODE}'. Cross-mode operations are refused.`,
    };
  }
  return { ok: true };
}

function webBaseUrl(): string {
  return config.WEB_BASE_URL ?? process.env.WEB_BASE_URL?.replace(/\/$/, "") ?? "";
}

async function notifyPaymentHeld(params: {
  bookingId: string;
  customerId: string;
  vendorId: string;
  totalAmount: number;
}): Promise<void> {
  const [[customer], [vendorRow]] = await Promise.all([
    db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, params.customerId))
      .limit(1),
    db
      .select({
        email: users.email,
        businessName: vendors.businessName,
      })
      .from(vendors)
      .innerJoin(users, eq(users.id, vendors.userId))
      .where(eq(vendors.id, params.vendorId))
      .limit(1),
  ]);

  const base = webBaseUrl();
  const customerUrl = base
    ? `${base}/bookings/${params.bookingId}`
    : `/bookings/${params.bookingId}`;
  const vendorUrl = base
    ? `${base}/vendor/leads/${params.bookingId}`
    : `/vendor/leads/${params.bookingId}`;

  await Promise.all([
    dispatchNotification({
      kind: "booking_payment_held",
      booking_id: params.bookingId,
      customer_id: params.customerId,
      vendor_id: params.vendorId,
      total_amount: params.totalAmount,
      to_email: customer?.email ?? null,
      booking_url: customerUrl,
      recipient_role: "customer",
      counterparty_name: vendorRow?.businessName ?? null,
    }),
    dispatchNotification({
      kind: "booking_payment_held",
      booking_id: params.bookingId,
      customer_id: params.customerId,
      vendor_id: params.vendorId,
      total_amount: params.totalAmount,
      to_email: vendorRow?.email ?? null,
      booking_url: vendorUrl,
      recipient_role: "vendor",
      counterparty_name: customer?.name ?? null,
    }),
  ]);
}

/** Shared by browser verify-payment and the authoritative Razorpay webhook. */
export async function captureBookingPayment(
  booking: BookingForPayment,
  paymentRow: PaymentForCapture,
  actorUserId: string,
  gatewayOrderId: string,
  gatewayPaymentId: string,
  paymentMethod: string | null,
): Promise<{ success: true; status: "payment_held" }> {
  if (
    paymentRow.status === "captured" &&
    paymentRow.gatewayPaymentId === gatewayPaymentId
  ) {
    return { success: true, status: "payment_held" };
  }

  if (booking.status === "payment_held") {
    const [heldPayment] = await db
      .select({
        id: payments.id,
        gatewayPaymentId: payments.gatewayPaymentId,
      })
      .from(payments)
      .where(
        and(
          eq(payments.bookingId, booking.id),
          eq(payments.status, "captured"),
        ),
      )
      .limit(1);

    if (
      heldPayment &&
      (heldPayment.id === paymentRow.id ||
        heldPayment.gatewayPaymentId === gatewayPaymentId)
    ) {
      return { success: true, status: "payment_held" };
    }

    throw new Error(
      "Booking already has a captured payment; refusing capture for a different payment.",
    );
  }

  if (booking.status !== "payment_pending") {
    throw new Error(
      `Cannot capture payment on a booking with status '${booking.status}'. Expected 'payment_pending'.`,
    );
  }

  if (paymentRow.status !== "initiated") {
    throw new Error(
      `Cannot capture a payment with status '${paymentRow.status}'. Expected 'initiated'.`,
    );
  }

  let rowMode = paymentRow.mode;
  if (rowMode == null) {
    const [modeRow] = await db
      .select({ mode: payments.mode })
      .from(payments)
      .where(eq(payments.id, paymentRow.id))
      .limit(1);
    rowMode = modeRow?.mode;
  }
  if (!rowMode) {
    throw new Error("Payment row is missing mode");
  }
  const modeCheck = assertPaymentMode(rowMode);
  if (!modeCheck.ok) {
    throw new Error(modeCheck.message);
  }

  const [milestone] = await db
    .select({ id: bookingMilestones.id })
    .from(bookingMilestones)
    .where(eq(bookingMilestones.bookingId, booking.id))
    .limit(1);

  if (!milestone) {
    throw new Error("No payment milestone found for this booking.");
  }

  const commissionBps = booking.commissionBps ?? DEFAULT_COMMISSION_BPS;
  const { platformFee, gstOnFee } = computePlatformAmounts(
    paymentRow.amount,
    commissionBps,
  );

  let newlyCaptured = false;

  await db.transaction(async (tx) => {
    const [updatedPayment] = await tx
      .update(payments)
      .set({
        status: "captured",
        escrowStatus: "held",
        gatewayPaymentId,
        paymentMethod,
        platformFee,
        gstOnFee,
        capturedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(payments.id, paymentRow.id), eq(payments.status, "initiated")),
      )
      .returning({ id: payments.id });

    if (!updatedPayment) {
      const [already] = await tx
        .select({
          id: payments.id,
          gatewayPaymentId: payments.gatewayPaymentId,
        })
        .from(payments)
        .where(
          and(eq(payments.id, paymentRow.id), eq(payments.status, "captured")),
        )
        .limit(1);

      if (already?.gatewayPaymentId === gatewayPaymentId) {
        return;
      }

      throw new Error("Payment state changed during capture");
    }

    const [updatedBooking] = await tx
      .update(bookings)
      .set({ status: "payment_held", updatedAt: new Date() })
      .where(
        and(
          eq(bookings.id, booking.id),
          eq(bookings.status, "payment_pending"),
        ),
      )
      .returning({ id: bookings.id });

    if (!updatedBooking) {
      throw new Error("Booking state changed during capture");
    }

    await tx
      .update(bookingMilestones)
      .set({ paymentStatus: "held", paymentId: paymentRow.id })
      .where(eq(bookingMilestones.id, milestone.id));

    await tx.insert(bookingEvents).values({
      id: ulid(),
      bookingId: booking.id,
      fromStatus: "payment_pending",
      toStatus: "payment_held",
      actorId: actorUserId,
      actorRole: "customer",
      metadata: {
        amount: paymentRow.amount,
        platform_fee: platformFee,
        gst_on_fee: gstOnFee,
        payment_id: paymentRow.id,
        gateway_order_id: gatewayOrderId,
        gateway_payment_id: gatewayPaymentId,
      },
    });

    newlyCaptured = true;
  });

  if (newlyCaptured) {
    void notifyPaymentHeld({
      bookingId: booking.id,
      customerId: booking.customerId,
      vendorId: booking.vendorId,
      totalAmount: paymentRow.amount,
    }).catch(() => {});
  }

  return { success: true, status: "payment_held" };
}

/**
 * POST /v1/payments/create-order
 * Customer-only: vendor_accepted → payment_pending, create Razorpay order,
 * insert payments row (status=initiated, gateway_order_id).
 */
paymentsRouter.post(
  "/create-order",
  async (c) => {
    const body = await c.req.json();
    const parsed = createOrderSchema.safeParse(body);

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
        commissionBps: bookings.commissionBps,
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

    if (
      booking.status !== "vendor_accepted" &&
      booking.status !== "customer_confirmed" &&
      booking.status !== "payment_pending"
    ) {
      return c.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE_TRANSITION",
            message: `Cannot create order on a booking with status '${booking.status}'. Expected 'vendor_accepted', 'customer_confirmed', or 'payment_pending'.`,
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

    if (
      booking.status === "vendor_accepted" ||
      booking.status === "customer_confirmed"
    ) {
      const fromStatus = booking.status;
      const flipped = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(bookings)
          .set({ status: "payment_pending", updatedAt: new Date() })
          .where(
            and(
              eq(bookings.id, booking_id),
              eq(bookings.status, fromStatus),
            ),
          )
          .returning({ id: bookings.id });

        if (!updated) {
          return false;
        }

        await tx.insert(bookingEvents).values({
          id: ulid(),
          bookingId: booking_id,
          fromStatus,
          toStatus: "payment_pending",
          actorId: actorUserId,
          actorRole: "customer",
          metadata: { amount: booking.totalAmount },
        });

        return true;
      });

      if (!flipped) {
        const [refreshed] = await db
          .select({ status: bookings.status })
          .from(bookings)
          .where(eq(bookings.id, booking_id))
          .limit(1);

        if (refreshed?.status !== "payment_pending") {
          return c.json(
            {
              data: null,
              error: {
                code: "INVALID_STATE_TRANSITION",
                message: `Cannot create order on a booking with status '${refreshed?.status ?? "unknown"}'. Expected 'vendor_accepted', 'customer_confirmed', or 'payment_pending'.`,
              },
            },
            409,
          );
        }
      }
    }

    const [existingInitiated] = await db
      .select({
        id: payments.id,
        gatewayOrderId: payments.gatewayOrderId,
        amount: payments.amount,
        mode: payments.mode,
      })
      .from(payments)
      .where(
        and(
          eq(payments.bookingId, booking_id),
          eq(payments.milestoneId, milestone.id),
          eq(payments.status, "initiated"),
        ),
      )
      .limit(1);

    if (existingInitiated?.gatewayOrderId) {
      const modeCheck = assertPaymentMode(existingInitiated.mode);
      if (!modeCheck.ok) {
        return c.json(
          {
            data: null,
            error: { code: modeCheck.code, message: modeCheck.message },
          },
          409,
        );
      }

      const keyId = getPaymentProvider().getCheckoutKeyId();
      return c.json(
        {
          data: {
            order_id: existingInitiated.gatewayOrderId,
            amount: existingInitiated.amount,
            currency: "INR",
            ...(keyId ? { razorpay_key_id: keyId } : {}),
          },
          error: null,
        },
        200,
      );
    }

    try {
      const provider = getPaymentProvider();
      const order = await provider.createOrder({
        amount: booking.totalAmount,
        currency: "INR",
        receipt: booking_id,
      });

      const paymentId = ulid();
      const mode: PaymentMode = config.PAYMENT_MODE;
      await db.insert(payments).values({
        id: paymentId,
        bookingId: booking_id,
        milestoneId: milestone.id,
        customerId: booking.customerId,
        vendorId: booking.vendorId,
        amount: booking.totalAmount,
        currency: "INR",
        status: "initiated",
        escrowStatus: "none",
        gatewayOrderId: order.order_id,
        mode,
      });

      const keyId = provider.getCheckoutKeyId();
      return c.json(
        {
          data: {
            order_id: order.order_id,
            amount: order.amount,
            currency: order.currency,
            ...(keyId ? { razorpay_key_id: keyId } : {}),
          },
          error: null,
        },
        200,
      );
    } catch (error: unknown) {
      if (error instanceof OrderValidationError) {
        return c.json(
          {
            data: null,
            error: {
              code: "VALIDATION_FAILED",
              message: error.message,
            },
          },
          400,
        );
      }

      if (error instanceof RazorpayAuthError) {
        return c.json(
          {
            data: null,
            error: {
              code: "RAZORPAY_AUTH_FAILED",
              message: error.message,
            },
          },
          401,
        );
      }

      if (error instanceof RazorpayApiError) {
        return c.json(
          {
            data: null,
            error: {
              code: "RAZORPAY_API_ERROR",
              message: error.message,
            },
          },
          500,
        );
      }

      return c.json(
        {
          data: null,
          error: {
            code: "ORDER_CREATION_FAILED",
            message: "Failed to create payment order.",
          },
        },
        500,
      );
    }
  },
);

/**
 * POST /v1/payments/verify-payment
 * Customer-only: verify signature, resolve booking from payments.gateway_order_id,
 * assert Razorpay amount, then initiated → captured / payment_pending → payment_held.
 */
paymentsRouter.post(
  "/verify-payment",
  async (c) => {
    const body = await c.req.json();
    const parsed = verifyPaymentSchema.safeParse(body);

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
      booking_id,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = parsed.data;
    const actorUserId = c.get("user").id;
    const provider = getPaymentProvider();

    const signatureValid = provider.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );

    if (!signatureValid) {
      return c.json(
        {
          data: null,
          error: {
            code: "SIGNATURE_MISMATCH",
            message: "Payment signature verification failed.",
          },
        },
        400,
      );
    }

    const [paymentRow] = await db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        amount: payments.amount,
        status: payments.status,
        gatewayPaymentId: payments.gatewayPaymentId,
        customerId: payments.customerId,
        mode: payments.mode,
      })
      .from(payments)
      .where(eq(payments.gatewayOrderId, razorpay_order_id))
      .limit(1);

    if (!paymentRow) {
      return c.json(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "No payment found for this Razorpay order.",
          },
        },
        404,
      );
    }

    if (paymentRow.bookingId !== booking_id) {
      return c.json(
        {
          data: null,
          error: {
            code: "BOOKING_MISMATCH",
            message: "booking_id does not match the order's payment record.",
          },
        },
        400,
      );
    }

    if (paymentRow.customerId !== actorUserId) {
      return c.json(
        {
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to verify payment for this booking.",
          },
        },
        403,
      );
    }

    const modeCheck = assertPaymentMode(paymentRow.mode);
    if (!modeCheck.ok) {
      return c.json(
        {
          data: null,
          error: { code: modeCheck.code, message: modeCheck.message },
        },
        409,
      );
    }

    const [booking] = await db
      .select({
        id: bookings.id,
        customerId: bookings.customerId,
        vendorId: bookings.vendorId,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
        commissionBps: bookings.commissionBps,
      })
      .from(bookings)
      .where(eq(bookings.id, paymentRow.bookingId))
      .limit(1);

    if (!booking) {
      return c.json(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: `Booking '${paymentRow.bookingId}' was not found.`,
          },
        },
        404,
      );
    }

    try {
      let gatewayPayment;
      try {
        gatewayPayment = await provider.fetchPayment(razorpay_payment_id);
      } catch (fetchError: unknown) {
        // Simulated payments live only in process memory; after restart, trust
        // signature + DB amount/order and rehydrate so subsequent fetches work.
        if (
          paymentRow.mode === "simulated" &&
          razorpay_payment_id.startsWith("simulated_") &&
          razorpay_order_id.startsWith("simulated_")
        ) {
          const sim = getSimulatedProvider();
          sim.rememberPayment({
            id: razorpay_payment_id,
            order_id: razorpay_order_id,
            amount: paymentRow.amount,
            currency: "INR",
            status: "captured",
            method: "simulated",
          });
          gatewayPayment = await provider.fetchPayment(razorpay_payment_id);
        } else {
          throw fetchError;
        }
      }

      if (gatewayPayment.order_id !== razorpay_order_id) {
        return c.json(
          {
            data: null,
            error: {
              code: "ORDER_MISMATCH",
              message: "Razorpay payment does not belong to the given order.",
            },
          },
          400,
        );
      }

      if (gatewayPayment.amount !== paymentRow.amount) {
        return c.json(
          {
            data: null,
            error: {
              code: "AMOUNT_MISMATCH",
              message: "Razorpay payment amount does not match the order amount.",
            },
          },
          400,
        );
      }

      if (paymentRow.amount !== booking.totalAmount) {
        return c.json(
          {
            data: null,
            error: {
              code: "AMOUNT_MISMATCH",
              message: "Payment amount does not match booking total.",
            },
          },
          400,
        );
      }

      const result = await captureBookingPayment(
        booking,
        paymentRow,
        actorUserId,
        razorpay_order_id,
        razorpay_payment_id,
        gatewayPayment.method,
      );

      return c.json({ data: result, error: null }, 200);
    } catch (error: unknown) {
      if (error instanceof RazorpayAuthError) {
        return c.json(
          {
            data: null,
            error: {
              code: "RAZORPAY_AUTH_FAILED",
              message: error.message,
            },
          },
          401,
        );
      }

      if (error instanceof RazorpayApiError) {
        return c.json(
          {
            data: null,
            error: {
              code: "RAZORPAY_API_ERROR",
              message: error.message,
            },
          },
          500,
        );
      }

      const message =
        error instanceof Error ? error.message : "Failed to verify payment";

      return c.json(
        {
          data: null,
          error: {
            code: "VERIFY_FAILED",
            message,
          },
        },
        400,
      );
    }
  },
);

/**
 * POST /v1/payments/release
 * Customer-only: marks event complete (if payment_held) then releases escrow.
 * payment_held|completed → payment_released with milestone + audit events.
 */
paymentsRouter.post(
  "/release",
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
        commissionBps: bookings.commissionBps,
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

    const commissionBps = booking.commissionBps ?? DEFAULT_COMMISSION_BPS;

    if (booking.status === "payment_released") {
      const [existingPayment] = await db
        .select({
          platformFee: payments.platformFee,
          amount: payments.amount,
        })
        .from(payments)
        .where(
          and(
            eq(payments.bookingId, booking_id),
            eq(payments.status, "captured"),
          ),
        )
        .limit(1);

      const platform_commission =
        existingPayment?.platformFee ??
        computePlatformAmounts(booking.totalAmount, commissionBps).platformFee;
      const amount_transferred = vendorPayoutPaisa(
        existingPayment?.amount ?? booking.totalAmount,
        platform_commission,
      );

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
      .select({
        id: payments.id,
        amount: payments.amount,
        platformFee: payments.platformFee,
        gstOnFee: payments.gstOnFee,
        mode: payments.mode,
        gatewayPaymentId: payments.gatewayPaymentId,
        vendorId: payments.vendorId,
      })
      .from(payments)
      .where(
        and(
          eq(payments.bookingId, booking_id),
          eq(payments.status, "captured"),
        ),
      )
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

    const modeCheck = assertPaymentMode(payment.mode);
    if (!modeCheck.ok) {
      return c.json(
        {
          data: null,
          error: { code: modeCheck.code, message: modeCheck.message },
        },
        409,
      );
    }

    const [existingPayout] = await db
      .select({
        id: paymentPayouts.id,
        gatewayTransferId: paymentPayouts.gatewayTransferId,
        status: paymentPayouts.status,
        amount: paymentPayouts.amount,
      })
      .from(paymentPayouts)
      .where(eq(paymentPayouts.paymentId, payment.id))
      .limit(1);

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

    if (!payment.gatewayPaymentId) {
      return c.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE",
            message: "Captured payment is missing a gateway payment id.",
          },
        },
        409,
      );
    }

    const computed = computePlatformAmounts(payment.amount, commissionBps);
    const platformFee =
      payment.platformFee > 0 ? payment.platformFee : computed.platformFee;
    const gstOnFee =
      payment.platformFee > 0 ? payment.gstOnFee : computed.gstOnFee;
    const amount_transferred = vendorPayoutPaisa(payment.amount, platformFee);

    // Persist payout row BEFORE calling the provider. If transfer succeeds but
    // the booking TX fails, retry finds gateway_transfer_id and skips a new transfer.
    let payoutId = existingPayout?.id ?? null;
    let gatewayTransferId = existingPayout?.gatewayTransferId ?? null;
    let transferStatus: string =
      existingPayout?.status === "completed" ? "settled" : "pending";

    if (!payoutId) {
      payoutId = ulid();
      await db.insert(paymentPayouts).values({
        id: payoutId,
        vendorId: payment.vendorId,
        bookingId: booking_id,
        paymentId: payment.id,
        amount: amount_transferred,
        status: "initiated",
        initiatedAt: new Date(),
      });
    }

    if (!gatewayTransferId) {
      const [bankAccount] = await db
        .select({
          id: vendorBankAccounts.id,
          razorpayFundId: vendorBankAccounts.razorpayFundId,
          accountHolderName: vendorBankAccounts.accountHolderName,
          ifscCode: vendorBankAccounts.ifscCode,
          lastFour: vendorBankAccounts.lastFour,
        })
        .from(vendorBankAccounts)
        .where(eq(vendorBankAccounts.vendorId, payment.vendorId))
        .limit(1);

      if (!bankAccount) {
        return c.json(
          {
            data: null,
            error: {
              code: "BANK_ACCOUNT_REQUIRED",
              message:
                "Vendor has no linked payout account. They must add a bank account before funds can be released.",
            },
          },
          409,
        );
      }

      let fundAccountId = bankAccount.razorpayFundId;
      // Seeded rows often lack a gateway fund id — provision one in simulated mode.
      if (!fundAccountId && config.PAYMENT_MODE === "simulated") {
        const [vendorRow] = await db
          .select({ businessName: vendors.businessName })
          .from(vendors)
          .where(eq(vendors.id, payment.vendorId))
          .limit(1);
        const linked = await getPaymentProvider().createLinkedAccount({
          email: `${payment.vendorId}@vendors.kritva.local`,
          legal_business_name:
            vendorRow?.businessName ?? bankAccount.accountHolderName,
          account_number: `00000000${bankAccount.lastFour}`,
          ifsc_code: bankAccount.ifscCode,
          account_holder_name: bankAccount.accountHolderName,
          vendor_id: payment.vendorId,
        });
        fundAccountId = linked.account_id;
        await db
          .update(vendorBankAccounts)
          .set({ razorpayFundId: fundAccountId })
          .where(eq(vendorBankAccounts.id, bankAccount.id));
      }

      if (!fundAccountId) {
        return c.json(
          {
            data: null,
            error: {
              code: "BANK_ACCOUNT_REQUIRED",
              message:
                "Vendor payout account is not linked to the payment provider.",
            },
          },
          409,
        );
      }

      let transferResult: { transfer_id: string; status: string };
      try {
        transferResult = await providerTransfer({
          payment_id: payment.gatewayPaymentId,
          account_id: fundAccountId,
          amount: amount_transferred,
          currency: "INR",
          booking_id,
          vendor_id: payment.vendorId,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Transfer failed";
        return c.json(
          {
            data: null,
            error: { code: "TRANSFER_FAILED", message },
          },
          502,
        );
      }

      gatewayTransferId = transferResult.transfer_id;
      transferStatus = transferResult.status;
      const payoutStatus =
        transferResult.status === "settled" ? "completed" : "pending";

      // Critical: record transfer id before booking-state TX so retries never double-pay.
      await db
        .update(paymentPayouts)
        .set({
          gatewayTransferId,
          status: payoutStatus,
          amount: amount_transferred,
          completedAt: payoutStatus === "completed" ? new Date() : null,
        })
        .where(eq(paymentPayouts.id, payoutId));
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

          if (markedComplete) {
            await tx.insert(bookingEvents).values({
              id: ulid(),
              bookingId: booking_id,
              fromStatus: "payment_held",
              toStatus: "completed",
              actorId: actorUserId,
              actorRole: "customer",
              metadata: { amount: booking.totalAmount },
            });
          } else {
            // Concurrent release may have already advanced past payment_held.
            const [current] = await tx
              .select({ status: bookings.status })
              .from(bookings)
              .where(eq(bookings.id, booking_id))
              .limit(1);
            if (
              current?.status !== "completed" &&
              current?.status !== "payment_released"
            ) {
              throw new Error("Booking state changed during release");
            }
          }
        }

        await tx
          .update(payments)
          .set({
            escrowStatus: "released",
            platformFee,
            gstOnFee,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));

        const [releasedBooking] = await tx
          .update(bookings)
          .set({
            status: "payment_released",
            escrowOutcome: "released",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(bookings.id, booking_id),
              eq(bookings.status, "completed"),
            ),
          )
          .returning({ totalAmount: bookings.totalAmount });

        if (!releasedBooking) {
          // Concurrent release may have already flipped status — treat as success
          // when transfer id is already recorded.
          const [alreadyReleased] = await tx
            .select({ totalAmount: bookings.totalAmount })
            .from(bookings)
            .where(
              and(
                eq(bookings.id, booking_id),
                eq(bookings.status, "payment_released"),
              ),
            )
            .limit(1);
          if (!alreadyReleased) {
            throw new Error("Booking state changed during release");
          }
          return {
            amount_transferred,
            platform_commission: platformFee,
            transfer_id: gatewayTransferId!,
            transfer_status: transferStatus,
          };
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
            platform_fee: platformFee,
            gst_on_fee: gstOnFee,
            amount_transferred,
            payment_id: payment.id,
            transfer_id: gatewayTransferId,
            transfer_status: transferStatus,
          },
        });

        return {
          amount_transferred,
          platform_commission: platformFee,
          transfer_id: gatewayTransferId!,
          transfer_status: transferStatus,
        };
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

/**
 * POST /v1/payments/simulated/checkout
 * Kritva-hosted simulated checkout control. Only when PAYMENT_MODE=simulated.
 */
paymentsRouter.post("/simulated/checkout", async (c) => {
  if (config.PAYMENT_MODE !== "simulated") {
    return c.json(
      {
        data: null,
        error: {
          code: "NOT_AVAILABLE",
          message: "Simulated checkout is only available when PAYMENT_MODE=simulated.",
        },
      },
      404,
    );
  }

  const body = await c.req.json();
  const parsed = simulatedCheckoutSchema.safeParse(body);
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

  const actorUserId = c.get("user").id;
  const { order_id, outcome, inject } = parsed.data;

    const [paymentRow] = await db
      .select({
        id: payments.id,
        customerId: payments.customerId,
        mode: payments.mode,
        status: payments.status,
        amount: payments.amount,
        currency: payments.currency,
      })
      .from(payments)
      .where(eq(payments.gatewayOrderId, order_id))
      .limit(1);

  if (!paymentRow) {
    return c.json(
      {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "No payment found for this simulated order.",
        },
      },
      404,
    );
  }

  if (paymentRow.customerId !== actorUserId) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to complete this checkout.",
        },
      },
      403,
    );
  }

  const modeCheck = assertPaymentMode(paymentRow.mode);
  if (!modeCheck.ok) {
    return c.json(
      {
        data: null,
        error: { code: modeCheck.code, message: modeCheck.message },
      },
      409,
    );
  }

  if (paymentRow.status !== "initiated") {
    return c.json(
      {
        data: null,
        error: {
          code: "INVALID_STATE",
          message: `Cannot checkout a payment with status '${paymentRow.status}'. Expected 'initiated'.`,
        },
      },
      409,
    );
  }

  try {
    const sim = getSimulatedProvider();
    // Amount/currency from DB — survives API restart when in-memory orders are gone.
    const result = await sim.checkout({
      order_id,
      amount: paymentRow.amount,
      currency: paymentRow.currency,
      outcome,
      inject: inject ?? null,
    });

    if (result.status === "failed") {
      await db
        .update(payments)
        .set({
          status: "failed",
          failureReason: "Simulated checkout failure",
          updatedAt: new Date(),
        })
        .where(
          and(eq(payments.id, paymentRow.id), eq(payments.status, "initiated")),
        );
    }

    return c.json({ data: result, error: null }, 200);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Simulated checkout failed";
    return c.json(
      {
        data: null,
        error: { code: "SIMULATED_CHECKOUT_FAILED", message },
      },
      400,
    );
  }
});

async function resolveVendorForUser(userId: string) {
  const [vendor] = await db
    .select({
      id: vendors.id,
      businessName: vendors.businessName,
      userId: vendors.userId,
    })
    .from(vendors)
    .where(eq(vendors.userId, userId))
    .limit(1);
  return vendor ?? null;
}

/**
 * GET /v1/payments/bank-accounts
 * Vendor: return linked bank account (last_four only — never full number).
 */
paymentsRouter.get("/bank-accounts", async (c) => {
  const userId = c.get("user").id;
  const vendor = await resolveVendorForUser(userId);
  if (!vendor) {
    return c.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Vendor profile not found." },
      },
      404,
    );
  }

  const [row] = await db
    .select({
      id: vendorBankAccounts.id,
      lastFour: vendorBankAccounts.lastFour,
      ifscCode: vendorBankAccounts.ifscCode,
      accountHolderName: vendorBankAccounts.accountHolderName,
      pennyDropStatus: vendorBankAccounts.pennyDropStatus,
      razorpayFundId: vendorBankAccounts.razorpayFundId,
      verifiedAt: vendorBankAccounts.verifiedAt,
      createdAt: vendorBankAccounts.createdAt,
    })
    .from(vendorBankAccounts)
    .where(eq(vendorBankAccounts.vendorId, vendor.id))
    .limit(1);

  if (!row) {
    return c.json({ data: { bank_account: null }, error: null }, 200);
  }

  return c.json(
    {
      data: {
        bank_account: {
          id: row.id,
          last_four: row.lastFour,
          ifsc_code: row.ifscCode,
          account_holder_name: row.accountHolderName,
          penny_drop_status: row.pennyDropStatus,
          gateway_account_id: row.razorpayFundId,
          verified_at: row.verifiedAt?.toISOString() ?? null,
          created_at: row.createdAt.toISOString(),
        },
      },
      error: null,
    },
    200,
  );
});

/**
 * POST /v1/payments/bank-accounts
 * Vendor: link bank account via PaymentProvider.createLinkedAccount.
 * Changing details resets penny-drop to pending (payouts paused until re-verify).
 */
paymentsRouter.post("/bank-accounts", async (c) => {
  const userId = c.get("user").id;
  const vendor = await resolveVendorForUser(userId);
  if (!vendor) {
    return c.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Vendor profile not found." },
      },
      404,
    );
  }

  const body = await c.req.json();
  const parsed = linkBankAccountSchema.safeParse(body);
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

  const [owner] = await db
    .select({ email: users.email, phone: users.phone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const { account_number, ifsc_code, account_holder_name } = parsed.data;

  let accountNumberEnc: Buffer;
  let lastFour: string;
  try {
    ({ accountNumberEnc, lastFour } =
      prepareBankAccountForStorage(account_number));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Encryption not configured";
    return c.json(
      {
        data: null,
        error: { code: "ENCRYPTION_MISCONFIGURED", message },
      },
      503,
    );
  }

  let account_id: string;
  try {
    const linked = await getPaymentProvider().createLinkedAccount({
      email: owner?.email ?? `${vendor.id}@vendors.kritva.local`,
      phone: owner?.phone ?? null,
      legal_business_name: vendor.businessName,
      account_number,
      ifsc_code,
      account_holder_name,
      vendor_id: vendor.id,
    });
    account_id = linked.account_id;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Linked account creation failed";
    return c.json(
      {
        data: null,
        error: { code: "LINKED_ACCOUNT_FAILED", message },
      },
      502,
    );
  }

  const id = ulid();
  const [existing] = await db
    .select({ id: vendorBankAccounts.id })
    .from(vendorBankAccounts)
    .where(eq(vendorBankAccounts.vendorId, vendor.id))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(vendorBankAccounts)
      .set({
        accountNumberEnc,
        ifscCode: ifsc_code,
        accountHolderName: account_holder_name,
        lastFour,
        pennyDropStatus: "pending",
        razorpayFundId: account_id,
        verifiedAt: null,
      })
      .where(eq(vendorBankAccounts.id, existing.id))
      .returning({
        id: vendorBankAccounts.id,
        lastFour: vendorBankAccounts.lastFour,
        ifscCode: vendorBankAccounts.ifscCode,
        accountHolderName: vendorBankAccounts.accountHolderName,
        pennyDropStatus: vendorBankAccounts.pennyDropStatus,
        razorpayFundId: vendorBankAccounts.razorpayFundId,
        verifiedAt: vendorBankAccounts.verifiedAt,
        createdAt: vendorBankAccounts.createdAt,
      });

    return c.json(
      {
        data: {
          bank_account: {
            id: updated!.id,
            last_four: updated!.lastFour,
            ifsc_code: updated!.ifscCode,
            account_holder_name: updated!.accountHolderName,
            penny_drop_status: updated!.pennyDropStatus,
            gateway_account_id: updated!.razorpayFundId,
            verified_at: null,
            created_at: updated!.createdAt.toISOString(),
          },
        },
        error: null,
      },
      200,
    );
  }

  const [inserted] = await db
    .insert(vendorBankAccounts)
    .values({
      id,
      vendorId: vendor.id,
      accountNumberEnc,
      ifscCode: ifsc_code,
      accountHolderName: account_holder_name,
      lastFour,
      pennyDropStatus: "pending",
      razorpayFundId: account_id,
    })
    .returning({
      id: vendorBankAccounts.id,
      lastFour: vendorBankAccounts.lastFour,
      ifscCode: vendorBankAccounts.ifscCode,
      accountHolderName: vendorBankAccounts.accountHolderName,
      pennyDropStatus: vendorBankAccounts.pennyDropStatus,
      razorpayFundId: vendorBankAccounts.razorpayFundId,
      verifiedAt: vendorBankAccounts.verifiedAt,
      createdAt: vendorBankAccounts.createdAt,
    });

  return c.json(
    {
      data: {
        bank_account: {
          id: inserted!.id,
          last_four: inserted!.lastFour,
          ifsc_code: inserted!.ifscCode,
          account_holder_name: inserted!.accountHolderName,
          penny_drop_status: inserted!.pennyDropStatus,
          gateway_account_id: inserted!.razorpayFundId,
          verified_at: null,
          created_at: inserted!.createdAt.toISOString(),
        },
      },
      error: null,
    },
    201,
  );
});

/**
 * POST /v1/payments/bank-accounts/verify
 * Vendor: penny-drop verification stub (simulated always verifies on amount=100).
 */
paymentsRouter.post("/bank-accounts/verify", async (c) => {
  const userId = c.get("user").id;
  const vendor = await resolveVendorForUser(userId);
  if (!vendor) {
    return c.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Vendor profile not found." },
      },
      404,
    );
  }

  const body = await c.req.json();
  const parsed = verifyPennyDropSchema.safeParse(body);
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

  const [row] = await db
    .select({
      id: vendorBankAccounts.id,
      pennyDropStatus: vendorBankAccounts.pennyDropStatus,
    })
    .from(vendorBankAccounts)
    .where(eq(vendorBankAccounts.vendorId, vendor.id))
    .limit(1);

  if (!row) {
    return c.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "No bank account on file." },
      },
      404,
    );
  }

  if (row.pennyDropStatus === "verified") {
    return c.json(
      {
        data: { penny_drop_status: "verified" as const },
        error: null,
      },
      200,
    );
  }

  // Simulated / stub: accept exactly ₹1.00 (100 paisa) as the penny-drop amount.
  const verified = parsed.data.amount === 100;
  const now = new Date();

  const [updated] = await db
    .update(vendorBankAccounts)
    .set({
      pennyDropStatus: verified ? "verified" : "failed",
      verifiedAt: verified ? now : null,
    })
    .where(eq(vendorBankAccounts.id, row.id))
    .returning({
      pennyDropStatus: vendorBankAccounts.pennyDropStatus,
      verifiedAt: vendorBankAccounts.verifiedAt,
    });

  return c.json(
    {
      data: {
        penny_drop_status: updated!.pennyDropStatus,
        verified_at: updated!.verifiedAt?.toISOString() ?? null,
      },
      error: null,
    },
    verified ? 200 : 400,
  );
});
