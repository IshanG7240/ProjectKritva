import { RazorpayProvider } from "./razorpay-provider.js";
import { SimulatedProvider } from "./simulated-provider.js";
import type { PaymentMode, PaymentProvider } from "./types.js";

export type CreatePaymentProviderOptions = {
  mode: PaymentMode;
  /** Public base URL of the API (no trailing slash). Required for simulated delayed webhooks. */
  webhookBaseUrl?: string | null;
  /** Override HMAC secret for SimulatedProvider. */
  simulatedHmacSecret?: string | null;
};

let cached: PaymentProvider | null = null;
let cachedMode: PaymentMode | null = null;

/**
 * Create (and memoize) the process-wide PaymentProvider from PAYMENT_MODE.
 * Call once at API boot after config is validated.
 *
 * Live flip (do not claim Route is approved until Razorpay confirms):
 *   PAYMENT_MODE=live
 *   + RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (live keys, not rzp_test_)
 *   + RAZORPAY_WEBHOOK_SECRET
 *   + Route-enabled merchant with vendor linked accounts (acc_*)
 * Simulated rows are refused when mode=live (and vice versa) via payments.mode.
 */
export function createPaymentProvider(
  options: CreatePaymentProviderOptions,
): PaymentProvider {
  if (cached && cachedMode === options.mode) {
    return cached;
  }

  if (options.mode === "live") {
    cached = new RazorpayProvider();
  } else {
    cached = new SimulatedProvider({
      webhookBaseUrl: options.webhookBaseUrl ?? null,
      hmacSecret: options.simulatedHmacSecret ?? undefined,
    });
  }

  cachedMode = options.mode;
  return cached;
}

/** Process-wide provider. Throws if createPaymentProvider has not been called. */
export function getPaymentProvider(): PaymentProvider {
  if (!cached) {
    throw new Error(
      "PaymentProvider not initialised — call createPaymentProvider() at boot",
    );
  }
  return cached;
}

/** Narrow helper when routes need SimulatedProvider-only controls. */
export function getSimulatedProvider(): SimulatedProvider {
  const provider = getPaymentProvider();
  if (!(provider instanceof SimulatedProvider)) {
    throw new Error("SimulatedProvider is only available when PAYMENT_MODE=simulated");
  }
  return provider;
}

export function resetPaymentProviderForTests(): void {
  cached = null;
  cachedMode = null;
}
