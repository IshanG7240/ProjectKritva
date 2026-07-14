import crypto from "node:crypto";
import { getRazorpayClient } from "./razorpay-client.js";

export const MIN_ORDER_AMOUNT_PAISE = 100;

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

export class RazorpayAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RazorpayAuthError";
  }
}

export class RazorpayApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RazorpayApiError";
  }
}

export interface CreateOrderInput {
  amount: number;
  currency: string;
  receipt: string;
}

export interface CreateOrderResult {
  order_id: string;
  amount: number;
  currency: string;
}

function isRazorpayHttpError(
  error: unknown,
): error is { statusCode: number; error?: { description?: string } } {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  );
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  if (!Number.isInteger(input.amount) || input.amount < MIN_ORDER_AMOUNT_PAISE) {
    throw new OrderValidationError(
      `Amount must be an integer of at least ${MIN_ORDER_AMOUNT_PAISE} paise`,
    );
  }

  const razorpay = getRazorpayClient();

  try {
    const order = await razorpay.orders.create({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
    });

    return {
      order_id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    };
  } catch (error: unknown) {
    if (isRazorpayHttpError(error)) {
      if (error.statusCode === 401) {
        throw new RazorpayAuthError("Razorpay authentication failed");
      }
      throw new RazorpayApiError(
        error.error?.description ?? "Razorpay order creation failed",
      );
    }

    throw new RazorpayApiError("Razorpay order creation failed");
  }
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured");
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expected === signature;
}
