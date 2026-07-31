import crypto from "node:crypto";
import { MIN_ORDER_AMOUNT_PAISE, OrderValidationError } from "./orders.js";

function simId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(16).toString("hex")}`;
}
import type {
  CreateOrderInput,
  CreateOrderResult,
  FetchedOrder,
  FetchedPayment,
  PaymentProvider,
  RefundInput,
  RefundResult,
  SimulatedCheckoutInput,
  SimulatedCheckoutResult,
  TransferInput,
  TransferResult,
  VendorPayoutDetails,
  WebhookEvent,
} from "./types.js";

const DEFAULT_SIM_SECRET = "kritva_simulated_hmac_v1";
const WEBHOOK_DELAY_MS_MIN = 2_000;
const WEBHOOK_DELAY_MS_MAX = 5_000;
const TRANSFER_SETTLE_MS = 3_000;

type StoredOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: "created" | "paid" | "failed";
};

type StoredPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
};

type StoredTransfer = {
  transfer_id: string;
  status: TransferResult["status"];
  amount: number;
  account_id: string;
  payment_id: string;
};

export type SimulatedProviderOptions = {
  /** Base URL of this API, e.g. http://localhost:5430 — used for delayed webhooks. */
  webhookBaseUrl: string | null;
  /** HMAC secret for payment + webhook signatures in simulated mode. */
  hmacSecret?: string;
};

function randomDelayMs(): number {
  return (
    WEBHOOK_DELAY_MS_MIN +
    Math.floor(Math.random() * (WEBHOOK_DELAY_MS_MAX - WEBHOOK_DELAY_MS_MIN + 1))
  );
}

/**
 * Kritva-hosted payment simulation. IDs are always `simulated_*` — never Razorpay-shaped.
 */
export class SimulatedProvider implements PaymentProvider {
  readonly mode = "simulated" as const;

  private readonly hmacSecret: string;
  private readonly webhookBaseUrl: string | null;

  private readonly orders = new Map<string, StoredOrder>();
  private readonly payments = new Map<string, StoredPayment>();
  private readonly transfers = new Map<string, StoredTransfer>();
  private readonly accounts = new Map<string, VendorPayoutDetails>();
  private readonly refunds = new Map<string, RefundResult>();

  constructor(options: SimulatedProviderOptions) {
    this.hmacSecret = options.hmacSecret?.trim() || DEFAULT_SIM_SECRET;
    this.webhookBaseUrl = options.webhookBaseUrl
      ? options.webhookBaseUrl.replace(/\/$/, "")
      : null;
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    if (!Number.isInteger(input.amount) || input.amount < MIN_ORDER_AMOUNT_PAISE) {
      throw new OrderValidationError(
        `Amount must be an integer of at least ${MIN_ORDER_AMOUNT_PAISE} paise`,
      );
    }

    const order_id = simId("simulated_order");
    this.orders.set(order_id, {
      id: order_id,
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      status: "created",
    });

    return {
      order_id,
      amount: input.amount,
      currency: input.currency,
    };
  }

  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    if (!orderId.startsWith("simulated_") || !paymentId.startsWith("simulated_")) {
      return false;
    }
    const expected = this.signPayment(orderId, paymentId);
    const expectedBuf = Buffer.from(expected, "utf8");
    const receivedBuf = Buffer.from(signature, "utf8");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  }

  async fetchPayment(paymentId: string): Promise<FetchedPayment> {
    if (!paymentId.startsWith("simulated_")) {
      throw new Error(
        "SimulatedProvider refuses live payment ids — server must use PAYMENT_MODE=live for those rows",
      );
    }
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Simulated payment '${paymentId}' not found`);
    }
    return { ...payment };
  }

  /**
   * Re-register a simulated payment into process memory (e.g. verify after restart
   * when checkout created the id in a previous process).
   */
  rememberPayment(payment: FetchedPayment): void {
    if (!payment.id.startsWith("simulated_")) {
      throw new Error("rememberPayment refuses non-simulated payment ids");
    }
    this.payments.set(payment.id, { ...payment });
    if (!this.orders.has(payment.order_id)) {
      this.orders.set(payment.order_id, {
        id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        receipt: payment.order_id,
        status: payment.status === "captured" ? "paid" : "created",
      });
    }
  }

  async fetchOrder(orderId: string): Promise<FetchedOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Simulated order '${orderId}' not found`);
    }
    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      receipt: order.receipt,
    };
  }

  async createLinkedAccount(
    vendor: VendorPayoutDetails,
  ): Promise<{ account_id: string }> {
    const account_id = simId("simulated_acc");
    this.accounts.set(account_id, vendor);
    return { account_id };
  }

  async transfer(input: TransferInput): Promise<TransferResult> {
    if (!input.account_id.startsWith("simulated_")) {
      throw new Error("SimulatedProvider refuses non-simulated account ids");
    }
    if (!input.payment_id.startsWith("simulated_")) {
      throw new Error(
        "SimulatedProvider refuses live payment ids — cannot transfer a Razorpay payment in simulated mode",
      );
    }

    const transfer_id = simId("simulated_trf");
    const row: StoredTransfer = {
      transfer_id,
      status: "pending",
      amount: input.amount,
      account_id: input.account_id,
      payment_id: input.payment_id,
    };
    this.transfers.set(transfer_id, row);

    setTimeout(() => {
      const current = this.transfers.get(transfer_id);
      if (current && current.status === "pending") {
        current.status = "settled";
      }
    }, TRANSFER_SETTLE_MS);

    return { transfer_id, status: "pending" };
  }

  async getTransfer(transferId: string): Promise<TransferResult | null> {
    const row = this.transfers.get(transferId);
    if (!row) return null;
    return { transfer_id: row.transfer_id, status: row.status };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!input.payment_id.startsWith("simulated_")) {
      throw new Error(
        "SimulatedProvider refuses live payment ids — cannot refund a Razorpay payment in simulated mode",
      );
    }
    const payment = this.payments.get(input.payment_id);
    if (!payment) {
      throw new Error(`Simulated payment '${input.payment_id}' not found`);
    }

    const amount = input.amount ?? payment.amount;
    if (!Number.isInteger(amount) || amount <= 0 || amount > payment.amount) {
      throw new Error("Invalid simulated refund amount");
    }

    const refund_id = simId("simulated_rfnd");
    const result: RefundResult = {
      refund_id,
      status: "processed",
      amount,
    };
    this.refunds.set(refund_id, result);
    payment.status = amount === payment.amount ? "refunded" : "captured";
    return result;
  }

  parseWebhook(rawBody: string, signature: string): WebhookEvent {
    const signature_valid = this.verifyWebhookSignature(rawBody, signature);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new Error("Webhook body is not valid JSON");
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { event?: unknown }).event !== "string"
    ) {
      throw new Error("Webhook body missing event type");
    }

    const record = parsed as {
      event: string;
      account_id?: string;
      created_at?: number;
      payload?: Record<string, unknown>;
    };

    if (!record.payload || typeof record.payload !== "object") {
      throw new Error("Webhook body missing payload");
    }

    return {
      event: record.event,
      account_id: record.account_id,
      created_at: record.created_at,
      payload: record.payload,
      signature_valid,
    };
  }

  getCheckoutKeyId(): string | null {
    return null;
  }

  /**
   * Simulated checkout control — succeed/fail + failure injection.
   * Order may only exist in DB after process restart; amount/currency from the
   * payments row are the source of truth. In-memory maps are a cache for the
   * current process (inject/replay + fetchPayment).
   */
  async checkout(input: SimulatedCheckoutInput): Promise<SimulatedCheckoutResult> {
    if (!input.order_id.startsWith("simulated_")) {
      throw new Error(`Simulated order '${input.order_id}' is not a simulated id`);
    }
    if (!Number.isInteger(input.amount) || input.amount < MIN_ORDER_AMOUNT_PAISE) {
      throw new OrderValidationError(
        `Amount must be an integer of at least ${MIN_ORDER_AMOUNT_PAISE} paise`,
      );
    }

    let order = this.orders.get(input.order_id);
    if (!order) {
      order = {
        id: input.order_id,
        amount: input.amount,
        currency: input.currency,
        receipt: input.order_id,
        status: "created",
      };
      this.orders.set(input.order_id, order);
    } else if (order.amount !== input.amount) {
      throw new Error(
        `Simulated order amount mismatch: memory=${order.amount} db=${input.amount}`,
      );
    }

    if (input.outcome === "failure") {
      order.status = "failed";
      return {
        order_id: input.order_id,
        payment_id: null,
        signature: null,
        status: "failed",
        webhook_scheduled: false,
      };
    }

    const payment_id = simId("simulated_pay");
    this.payments.set(payment_id, {
      id: payment_id,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: "captured",
      method: "simulated",
    });
    order.status = "paid";

    if (input.inject === "bad_signature") {
      return {
        order_id: input.order_id,
        payment_id,
        signature: "invalid_simulated_signature",
        status: "injected",
        webhook_scheduled: false,
      };
    }

    const signature = this.signPayment(order.id, payment_id);
    const replay = input.inject === "replay";

    this.scheduleCaptureWebhook({
      orderId: order.id,
      paymentId: payment_id,
      amount: order.amount,
      currency: order.currency,
      replay,
    });

    return {
      order_id: input.order_id,
      payment_id,
      signature,
      status: "captured_pending_webhook",
      webhook_scheduled: Boolean(this.webhookBaseUrl),
    };
  }

  /** Build a capture webhook body + HMAC (also used for manual replay tests). */
  buildCaptureWebhook(input: {
    orderId: string;
    paymentId: string;
    amount: number;
    currency: string;
  }): { body: string; signature: string; eventId: string } {
    const eventId = simId("simulated_evt");
    const payload = {
      event: "payment.captured",
      account_id: "simulated_account",
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: input.paymentId,
            order_id: input.orderId,
            amount: input.amount,
            currency: input.currency,
            status: "captured",
            method: "simulated",
          },
        },
      },
    };
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", this.hmacSecret)
      .update(body)
      .digest("hex");
    return { body, signature, eventId };
  }

  private signPayment(orderId: string, paymentId: string): string {
    return crypto
      .createHmac("sha256", this.hmacSecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
  }

  private verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!signature) return false;
    const expected = crypto
      .createHmac("sha256", this.hmacSecret)
      .update(rawBody)
      .digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const receivedBuf = Buffer.from(signature, "utf8");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  }

  private scheduleCaptureWebhook(input: {
    orderId: string;
    paymentId: string;
    amount: number;
    currency: string;
    replay: boolean;
  }): void {
    if (!this.webhookBaseUrl) {
      console.warn(
        "[@kritva/payments] SimulatedProvider: no webhook base URL; delayed webhook skipped",
      );
      return;
    }

    const url = `${this.webhookBaseUrl}/v1/payments/webhook`;
    const delay = randomDelayMs();

    const fire = async () => {
      const { body, signature, eventId } = this.buildCaptureWebhook(input);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-razorpay-signature": signature,
            "x-razorpay-event-id": eventId,
          },
          body,
        });
        if (!res.ok) {
          console.error(
            `[@kritva/payments] Simulated webhook POST failed status=${res.status}`,
          );
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "webhook post failed";
        console.error(
          `[@kritva/payments] Simulated webhook POST error: ${message}`,
        );
      }
    };

    setTimeout(() => {
      void fire();
      if (input.replay) {
        // Razorpay-style retry of the same logical event (new event id, same payment).
        setTimeout(() => {
          void fire();
        }, 500);
      }
    }, delay);
  }
}
