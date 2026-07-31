import { Hono } from "hono";
import { ulid } from "ulid";
import { and, eq } from "drizzle-orm";
import { db } from "@kritva/db/client";
import { bookings, payments, webhookEvents } from "@kritva/db";
import {
  extractCapturedPayment,
  isCaptureWebhookEvent,
  parseWebhookEvent,
  verifyWebhookSignature,
  type RazorpayWebhookEvent,
} from "@kritva/payments";
import { captureBookingPayment } from "./payments.js";

/**
 * Razorpay webhooks — mounted outside supabaseAuth().
 * POST /v1/payments/webhook
 */
export const webhooksRouter = new Hono();

async function markWebhookDone(
  webhookRowId: string,
  errorMessage?: string,
): Promise<void> {
  await db
    .update(webhookEvents)
    .set({
      processed: true,
      processedAt: new Date(),
      error: errorMessage ?? null,
    })
    .where(eq(webhookEvents.id, webhookRowId));
}

/** Leave processed=false so Razorpay retry can re-enter. */
async function markWebhookRetryableError(
  webhookRowId: string,
  errorMessage: string,
): Promise<void> {
  await db
    .update(webhookEvents)
    .set({
      processed: false,
      processedAt: null,
      error: errorMessage,
    })
    .where(eq(webhookEvents.id, webhookRowId));
}

type CaptureHandleResult =
  | { ok: true }
  | { ok: false; message: string; retryable: boolean };

async function handleCaptureEvent(
  event: RazorpayWebhookEvent,
): Promise<CaptureHandleResult> {
  const captured = extractCapturedPayment(event);
  if (!captured) {
    return {
      ok: false,
      message: "Capture event missing payment/order ids",
      retryable: false,
    };
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
    .where(eq(payments.gatewayOrderId, captured.gatewayOrderId))
    .limit(1);

  if (!paymentRow) {
    return {
      ok: false,
      message: "No payment found for gateway order",
      retryable: false,
    };
  }

  if (captured.amount !== paymentRow.amount) {
    return {
      ok: false,
      message: "Webhook amount does not match payment row",
      retryable: false,
    };
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
    return {
      ok: false,
      message: "Booking not found for payment",
      retryable: false,
    };
  }

  if (paymentRow.amount !== booking.totalAmount) {
    return {
      ok: false,
      message: "Payment amount does not match booking total",
      retryable: false,
    };
  }

  try {
    await captureBookingPayment(
      booking,
      paymentRow,
      paymentRow.customerId,
      captured.gatewayOrderId,
      captured.gatewayPaymentId,
      captured.method,
    );
    return { ok: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Capture failed";
    return {
      ok: false,
      message,
      retryable: message.includes("state changed"),
    };
  }
}

webhooksRouter.post("/", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-razorpay-signature") ?? "";
  const eventIdHeader = c.req.header("x-razorpay-event-id") ?? "";

  let signatureValid = false;
  try {
    signatureValid = verifyWebhookSignature(rawBody, signature);
  } catch {
    console.error("[kritva/api] Webhook secret not configured");
    return c.json(
      {
        data: null,
        error: {
          code: "WEBHOOK_MISCONFIGURED",
          message: "Webhook verification is not configured.",
        },
      },
      503,
    );
  }

  if (!signatureValid) {
    return c.json(
      {
        data: null,
        error: {
          code: "SIGNATURE_MISMATCH",
          message: "Webhook signature verification failed.",
        },
      },
      400,
    );
  }

  let event: RazorpayWebhookEvent;
  try {
    event = parseWebhookEvent(rawBody);
  } catch {
    return c.json(
      {
        data: null,
        error: {
          code: "INVALID_PAYLOAD",
          message: "Webhook payload could not be parsed.",
        },
      },
      400,
    );
  }

  const capturedHint = extractCapturedPayment(event);
  const eventId =
    eventIdHeader ||
    `${event.event}:${capturedHint?.gatewayPaymentId ?? event.created_at ?? "unknown"}`;

  const webhookRowId = ulid();
  const inserted = await db
    .insert(webhookEvents)
    .values({
      id: webhookRowId,
      source: "razorpay",
      eventId,
      eventType: event.event,
      payload: event as unknown as Record<string, unknown>,
      signatureValid: true,
      processed: false,
    })
    .onConflictDoNothing({
      target: [webhookEvents.source, webhookEvents.eventId],
    })
    .returning({ id: webhookEvents.id });

  let rowId = webhookRowId;

  if (inserted.length === 0) {
    const [existing] = await db
      .select({
        id: webhookEvents.id,
        processed: webhookEvents.processed,
      })
      .from(webhookEvents)
      .where(
        and(
          eq(webhookEvents.source, "razorpay"),
          eq(webhookEvents.eventId, eventId),
        ),
      )
      .limit(1);

    if (!existing || existing.processed) {
      return c.json(
        { data: { received: true, duplicate: true }, error: null },
        200,
      );
    }

    rowId = existing.id;
  }

  if (!isCaptureWebhookEvent(event.event)) {
    await markWebhookDone(rowId);
    return c.json(
      { data: { received: true, handled: false }, error: null },
      200,
    );
  }

  const result = await handleCaptureEvent(event);

  if (!result.ok) {
    console.error(
      `[kritva/api] Webhook capture failed event_type=${event.event} event_id=${eventId}`,
    );
    if (result.retryable) {
      await markWebhookRetryableError(rowId, result.message);
      return c.json(
        {
          data: null,
          error: {
            code: "WEBHOOK_PROCESSING_FAILED",
            message: "Webhook event could not be processed.",
          },
        },
        500,
      );
    }

    await markWebhookDone(rowId, result.message);
    return c.json({ data: { received: true, handled: false }, error: null }, 200);
  }

  await markWebhookDone(rowId);
  return c.json({ data: { received: true, handled: true }, error: null }, 200);
});
