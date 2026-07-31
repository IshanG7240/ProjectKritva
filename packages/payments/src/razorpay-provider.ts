import crypto from "node:crypto";
import {
  createOrder as razorpayCreateOrder,
  fetchOrder as razorpayFetchOrder,
  fetchPayment as razorpayFetchPayment,
  MIN_ORDER_AMOUNT_PAISE,
  type CreateOrderInput,
} from "./orders.js";
import { getRazorpayClient, getRazorpayKeyId } from "./razorpay-client.js";
import {
  extractCapturedPayment,
  parseWebhookEvent,
  verifyWebhookSignature,
} from "./webhooks.js";
import type {
  PaymentProvider,
  RefundInput,
  RefundResult,
  TransferInput,
  TransferResult,
  VendorPayoutDetails,
  WebhookEvent,
} from "./types.js";

type RazorpayTransferItem = {
  id: string;
  status?: string;
  settlement_status?: string | null;
  notes?: Record<string, string> | string[] | null;
  recipient?: string;
  amount?: number;
};

function isRazorpayHttpError(
  error: unknown,
): error is { statusCode: number; error?: { description?: string; code?: string } } {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  );
}

function razorpayErrorMessage(error: unknown, fallback: string): string {
  if (isRazorpayHttpError(error)) {
    const desc = error.error?.description;
    const code = error.error?.code;
    if (desc && code) return `${desc} (${code})`;
    return desc ?? fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function assertLiveGatewayId(id: string, kind: string): void {
  if (!id) {
    throw new Error(`${kind} id is required`);
  }
  if (id.startsWith("simulated_")) {
    throw new Error(
      `RazorpayProvider refuses simulated ${kind} ids — server must use PAYMENT_MODE=simulated for those rows`,
    );
  }
}

function mapTransferStatus(item: RazorpayTransferItem): TransferResult {
  const raw = item.settlement_status ?? item.status ?? "pending";
  const status =
    raw === "settled" || raw === "processed" || raw === "completed"
      ? ("settled" as const)
      : raw === "failed" || raw === "reversed"
        ? ("failed" as const)
        : ("pending" as const);
  return { transfer_id: item.id, status };
}

function notesRecord(
  notes: RazorpayTransferItem["notes"],
): Record<string, string> {
  if (!notes || Array.isArray(notes)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(notes)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function findExistingTransfer(
  items: RazorpayTransferItem[],
  input: TransferInput,
): RazorpayTransferItem | undefined {
  return items.find((item) => {
    const notes = notesRecord(item.notes);
    if (input.booking_id && notes.booking_id === input.booking_id) return true;
    if (notes.gateway_payment_id === input.payment_id) return true;
    if (
      input.account_id &&
      item.recipient === input.account_id &&
      item.amount === input.amount
    ) {
      return true;
    }
    return false;
  });
}

/**
 * Live Razorpay adapter — orders/webhooks + Route linked accounts & transfers.
 * Amounts are paisa integers throughout.
 */
export class RazorpayProvider implements PaymentProvider {
  readonly mode = "live" as const;

  async createOrder(input: CreateOrderInput) {
    return razorpayCreateOrder(input);
  }

  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    assertLiveGatewayId(orderId, "order");
    assertLiveGatewayId(paymentId, "payment");

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured");
    }

    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const receivedBuf = Buffer.from(signature, "utf8");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  }

  fetchPayment(paymentId: string) {
    assertLiveGatewayId(paymentId, "payment");
    return razorpayFetchPayment(paymentId);
  }

  fetchOrder(orderId: string) {
    assertLiveGatewayId(orderId, "order");
    return razorpayFetchOrder(orderId);
  }

  async createLinkedAccount(
    vendor: VendorPayoutDetails,
  ): Promise<{ account_id: string }> {
    const razorpay = getRazorpayClient();

    // SDK typings lag Route v2 (accounts / fundAccount shapes).
    const route = razorpay as unknown as {
      accounts: {
        create: (body: Record<string, unknown>) => Promise<{ id: string }>;
      };
      fundAccount: {
        create: (body: Record<string, unknown>) => Promise<{ id: string }>;
      };
    };

    try {
      // Route linked account (acc_*) — this id is what payments.transfer expects.
      const account = await route.accounts.create({
        email: vendor.email,
        ...(vendor.phone ? { phone: vendor.phone } : {}),
        type: "route",
        legal_business_name: vendor.legal_business_name,
        business_type: "individual",
        contact_name: vendor.account_holder_name,
      });

      if (!account?.id) {
        throw new Error(
          "Razorpay Route did not return a linked account id — is Route enabled on this merchant?",
        );
      }

      // Fund account attaches the bank destination for linked-account settlement.
      try {
        await route.fundAccount.create({
          account_id: account.id,
          account_type: "bank_account",
          bank_account: {
            name: vendor.account_holder_name,
            ifsc: vendor.ifsc_code,
            account_number: vendor.account_number,
          },
        });
      } catch (fundError: unknown) {
        throw new Error(
          `Linked account created (${account.id}) but bank fund account failed: ${razorpayErrorMessage(fundError, "unknown error")}. Route product configuration may be incomplete.`,
        );
      }

      return { account_id: account.id };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("fund account")) {
        throw error;
      }
      const msg = razorpayErrorMessage(
        error,
        "Razorpay linked account creation failed",
      );
      throw new Error(
        `${msg}. Ensure Razorpay Route is approved and live keys belong to a Route-enabled merchant.`,
      );
    }
  }

  async transfer(input: TransferInput): Promise<TransferResult> {
    assertLiveGatewayId(input.payment_id, "payment");
    if (!input.account_id) {
      throw new Error(
        "Linked account id is required for Route transfer (vendor has no razorpay_fund_id / acc_*)",
      );
    }
    if (input.account_id.startsWith("simulated_")) {
      throw new Error(
        "RazorpayProvider refuses simulated account ids — cannot transfer live funds to a simulated account",
      );
    }
    if (
      !Number.isInteger(input.amount) ||
      input.amount < MIN_ORDER_AMOUNT_PAISE
    ) {
      throw new Error(
        `Transfer amount must be an integer of at least ${MIN_ORDER_AMOUNT_PAISE} paisa`,
      );
    }

    const razorpay = getRazorpayClient();

    // Prefer reusing an existing transfer on this payment (idempotent retry).
    try {
      const existing = (await razorpay.payments.fetchTransfer(
        input.payment_id,
      )) as { items?: RazorpayTransferItem[] };
      const match = findExistingTransfer(existing.items ?? [], input);
      if (match?.id) {
        return mapTransferStatus(match);
      }
    } catch {
      // Listing transfers can fail on some accounts — fall through to create.
    }

    try {
      const notes: Record<string, string> = {
        gateway_payment_id: input.payment_id,
      };
      if (input.booking_id) notes.booking_id = input.booking_id;
      if (input.vendor_id) notes.vendor_id = input.vendor_id;

      const result = (await razorpay.payments.transfer(input.payment_id, {
        transfers: [
          {
            account: input.account_id,
            amount: input.amount,
            currency: input.currency ?? "INR",
            notes,
          },
        ],
      })) as { items?: RazorpayTransferItem[] };

      const item = result.items?.[0];
      if (!item?.id) {
        throw new Error("Razorpay transfer returned no transfer id");
      }

      return mapTransferStatus(item);
    } catch (error: unknown) {
      const msg = razorpayErrorMessage(error, "Razorpay transfer failed");
      throw new Error(
        `${msg}. Check Route linked account (${input.account_id}) and that the payment is captured.`,
      );
    }
  }

  async getTransfer(transferId: string): Promise<TransferResult | null> {
    assertLiveGatewayId(transferId, "transfer");
    const razorpay = getRazorpayClient();
    try {
      const item = (await razorpay.transfers.fetch(
        transferId,
      )) as RazorpayTransferItem;
      if (!item?.id) return null;
      return mapTransferStatus(item);
    } catch (error: unknown) {
      if (isRazorpayHttpError(error) && error.statusCode === 404) {
        return null;
      }
      throw new Error(razorpayErrorMessage(error, "Failed to fetch transfer"));
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    assertLiveGatewayId(input.payment_id, "payment");
    if (
      input.amount != null &&
      (!Number.isInteger(input.amount) || input.amount < 1)
    ) {
      throw new Error("Refund amount must be a positive integer (paisa)");
    }

    const razorpay = getRazorpayClient();

    try {
      const body: { amount?: number; notes?: Record<string, string> } = {};
      if (input.amount != null) body.amount = input.amount;
      if (input.notes) body.notes = input.notes;

      const refund = await razorpay.payments.refund(input.payment_id, body);

      return {
        refund_id: String(refund.id),
        status: String(refund.status),
        amount: Number(refund.amount),
      };
    } catch (error: unknown) {
      throw new Error(razorpayErrorMessage(error, "Razorpay refund failed"));
    }
  }

  parseWebhook(rawBody: string, signature: string): WebhookEvent {
    const signature_valid = verifyWebhookSignature(rawBody, signature);
    const event = parseWebhookEvent(rawBody);
    return {
      event: event.event,
      account_id: event.account_id,
      created_at: event.created_at,
      payload: event.payload,
      signature_valid,
    };
  }

  getCheckoutKeyId(): string | null {
    return getRazorpayKeyId();
  }
}

/**
 * Best-effort Razorpay balance in paisa for admin reconciliation.
 * Uses RazorpayX banking_balances when available; returns null on any failure
 * (Route-only merchants often have no balance endpoint).
 */
export async function fetchGatewayBalancePaisa(): Promise<number | null> {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/banking_balances", {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      items?: Array<{ amount?: number; available_amount?: number }>;
      amount?: number;
    };

    if (typeof body.amount === "number" && Number.isInteger(body.amount)) {
      return body.amount;
    }

    const items = body.items ?? [];
    if (items.length === 0) return null;

    let total = 0;
    for (const item of items) {
      const value =
        typeof item.available_amount === "number"
          ? item.available_amount
          : item.amount;
      if (typeof value === "number" && Number.isInteger(value)) {
        total += value;
      }
    }
    return total;
  } catch {
    return null;
  }
}

/** Re-export helper for routes that already use extractCapturedPayment. */
export { extractCapturedPayment };
