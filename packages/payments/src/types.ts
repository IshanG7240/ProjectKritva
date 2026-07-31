/** Shared payment-provider types. Paisa integers only. */

export type PaymentMode = "simulated" | "live";

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

export interface FetchedPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
}

export interface FetchedOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string | null;
}

export interface VendorPayoutDetails {
  email: string;
  phone?: string | null;
  legal_business_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  /** Soft ref — used only for simulated account ids. */
  vendor_id?: string;
}

export interface TransferInput {
  /** Gateway payment id to transfer from (Route). */
  payment_id: string;
  /** Linked account / fund account id. */
  account_id: string;
  /** Net vendor payout in paisa. */
  amount: number;
  currency?: string;
  /** Soft refs for simulated ledger shapes. */
  booking_id?: string;
  vendor_id?: string;
}

export interface TransferResult {
  transfer_id: string;
  status: "pending" | "settled" | "failed";
}

export interface RefundInput {
  payment_id: string;
  /** Paisa. Omit or equal full amount for full refund. */
  amount?: number;
  notes?: Record<string, string>;
}

export interface RefundResult {
  refund_id: string;
  status: string;
  amount: number;
}

/** Normalised capture payload shared by live + simulated webhooks. */
export interface CapturedPaymentFromWebhook {
  eventType: string;
  gatewayPaymentId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  method: string | null;
}

export interface WebhookEvent {
  event: string;
  account_id?: string;
  created_at?: number;
  payload: Record<string, unknown>;
  /** True after HMAC verification inside parseWebhook. */
  signature_valid: boolean;
}

export interface PaymentProvider {
  readonly mode: PaymentMode;

  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;

  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean;

  fetchPayment(paymentId: string): Promise<FetchedPayment>;

  fetchOrder(orderId: string): Promise<FetchedOrder>;

  createLinkedAccount(
    vendor: VendorPayoutDetails,
  ): Promise<{ account_id: string }>;

  transfer(input: TransferInput): Promise<TransferResult>;

  getTransfer?(transferId: string): Promise<TransferResult | null>;

  refund(input: RefundInput): Promise<RefundResult>;

  /**
   * Verify HMAC and parse body. Throws on invalid JSON.
   * Returns signature_valid=false when HMAC mismatches (caller decides 400).
   */
  parseWebhook(rawBody: string, signature: string): WebhookEvent;

  /** Public key returned to the browser for live Checkout; null in simulated. */
  getCheckoutKeyId(): string | null;
}

export interface SimulatedCheckoutInput {
  order_id: string;
  /** Paisa — from payments row (source of truth after process restart). */
  amount: number;
  currency: string;
  outcome: "success" | "failure";
  /** Failure-injection knobs for demo / QA. */
  inject?: "bad_signature" | "replay" | null;
}

export interface SimulatedCheckoutResult {
  order_id: string;
  payment_id: string | null;
  signature: string | null;
  status: "captured_pending_webhook" | "failed" | "injected";
  webhook_scheduled: boolean;
}
