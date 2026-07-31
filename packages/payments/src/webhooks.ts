import crypto from "node:crypto";

/** Event types that mean money was successfully taken. */
export const CAPTURE_WEBHOOK_EVENTS = [
  "payment.captured",
  "order.paid",
] as const;

export type CaptureWebhookEventType = (typeof CAPTURE_WEBHOOK_EVENTS)[number];

export interface RazorpayWebhookPaymentEntity {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
}

export interface RazorpayWebhookEvent {
  event: string;
  account_id?: string;
  created_at?: number;
  payload: Record<string, unknown>;
}

export interface CapturedPaymentFromWebhook {
  eventType: CaptureWebhookEventType;
  gatewayPaymentId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  method: string | null;
}

function getWebhookSecret(): string {
  const mode = process.env.PAYMENT_MODE?.trim();
  if (mode === "simulated") {
    return (
      process.env.SIMULATED_WEBHOOK_SECRET?.trim() || "kritva_simulated_hmac_v1"
    );
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
  }
  return secret;
}

/**
 * HMAC-SHA256 over the raw body using RAZORPAY_WEBHOOK_SECRET
 * (not RAZORPAY_KEY_SECRET). Timing-safe compare.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", getWebhookSecret())
    .update(rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function extractPaymentEntity(
  payload: Record<string, unknown>,
): RazorpayWebhookPaymentEntity | null {
  const paymentWrapper = asRecord(payload.payment);
  const entity = paymentWrapper ? asRecord(paymentWrapper.entity) : null;
  if (!entity) return null;

  const id = typeof entity.id === "string" ? entity.id : null;
  if (!id) return null;

  const orderId =
    typeof entity.order_id === "string" ? entity.order_id : null;

  const amount = Number(entity.amount);
  if (!Number.isInteger(amount)) return null;

  return {
    id,
    order_id: orderId,
    amount,
    currency: typeof entity.currency === "string" ? entity.currency : "INR",
    status: typeof entity.status === "string" ? entity.status : "",
    method: typeof entity.method === "string" ? entity.method : null,
  };
}

/** Parse raw body after signature verification. Does not log the body. */
export function parseWebhookEvent(rawBody: string): RazorpayWebhookEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error("Webhook body is not valid JSON");
  }

  const record = asRecord(parsed);
  if (!record || typeof record.event !== "string") {
    throw new Error("Webhook body missing event type");
  }

  const payload = asRecord(record.payload);
  if (!payload) {
    throw new Error("Webhook body missing payload");
  }

  return {
    event: record.event,
    account_id:
      typeof record.account_id === "string" ? record.account_id : undefined,
    created_at:
      typeof record.created_at === "number" ? record.created_at : undefined,
    payload,
  };
}

export function isCaptureWebhookEvent(
  eventType: string,
): eventType is CaptureWebhookEventType {
  return (CAPTURE_WEBHOOK_EVENTS as readonly string[]).includes(eventType);
}

/**
 * Pull payment + order ids from payment.captured / order.paid payloads.
 * Returns null when the shape is unusable (caller should ack + skip capture).
 */
export function extractCapturedPayment(
  event: RazorpayWebhookEvent,
): CapturedPaymentFromWebhook | null {
  if (!isCaptureWebhookEvent(event.event)) return null;

  const payment = extractPaymentEntity(event.payload);
  if (!payment?.order_id) return null;

  return {
    eventType: event.event,
    gatewayPaymentId: payment.id,
    gatewayOrderId: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
  };
}
