import { apiClient } from "@/lib/api-client";
import {
  buildSimulatedCheckoutPath,
  isSimulatedOrderId,
} from "@/lib/simulated-checkout";

const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: RazorpayFailedResponse) => void): void;
}

interface RazorpayFailedResponse {
  error: {
    description: string;
    reason?: string;
  };
}

interface RazorpayConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayCheckoutInstance;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  razorpay_key_id?: string;
}

let scriptLoadPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay Checkout is only available in the browser"));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SCRIPT_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Razorpay Checkout script")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Razorpay Checkout script"));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

export class PaymentCancelledError extends Error {
  constructor() {
    super("Payment cancelled");
    this.name = "PaymentCancelledError";
  }
}

export class PaymentFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentFailedError";
  }
}

/** Thrown after navigating to Kritva's simulated checkout — not a user-facing failure. */
export class SimulatedCheckoutRedirectError extends Error {
  constructor() {
    super("Redirecting to simulated checkout");
    this.name = "SimulatedCheckoutRedirectError";
  }
}

function shouldUseSimulatedCheckout(order: CreateOrderResponse): boolean {
  return isSimulatedOrderId(order.order_id) || !order.razorpay_key_id;
}

async function openRazorpayCheckout(
  bookingId: string,
  order: CreateOrderResponse,
): Promise<void> {
  const keyId =
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? order.razorpay_key_id;

  if (!keyId) {
    throw new Error("Razorpay key is not configured");
  }

  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error("Razorpay Checkout is unavailable");
  }

  await new Promise<void>((resolve, reject) => {
    const razorpay = new window.Razorpay!({
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      name: "Kritva",
      description: "Escrow payment for your booking",
      order_id: order.order_id,
      theme: { color: "#1B2F4B" },
      handler: async (response) => {
        try {
          const verifyRes = await apiClient.post("/v1/payments/verify-payment", {
            booking_id: bookingId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (verifyRes.error) {
            reject(new Error(verifyRes.error.message));
            return;
          }

          resolve();
        } catch (error: unknown) {
          reject(
            error instanceof Error
              ? error
              : new Error("Payment verification failed"),
          );
        }
      },
      modal: {
        ondismiss: () => reject(new PaymentCancelledError()),
      },
    });

    razorpay.on("payment.failed", (response) => {
      reject(
        new PaymentFailedError(
          response.error.description ?? "Payment failed. Please try again.",
        ),
      );
    });

    razorpay.open();
  });
}

export async function checkoutBookingPayment(bookingId: string): Promise<void> {
  const orderRes = await apiClient.post<CreateOrderResponse>(
    "/v1/payments/create-order",
    { booking_id: bookingId },
  );

  if (orderRes.error) {
    throw new Error(orderRes.error.message);
  }

  const order = orderRes.data;
  if (!order) {
    throw new Error("Failed to create payment order");
  }

  if (shouldUseSimulatedCheckout(order)) {
    if (typeof window === "undefined") {
      throw new Error("Simulated checkout is only available in the browser");
    }
    window.location.assign(buildSimulatedCheckoutPath(bookingId, order));
    throw new SimulatedCheckoutRedirectError();
  }

  await openRazorpayCheckout(bookingId, order);
}
