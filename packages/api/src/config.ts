/**
 * Central API config — read once at boot, fail closed on payment misconfig.
 * Import `config` from here; do not read process.env for these keys elsewhere.
 */

import { createPaymentProvider } from "@kritva/payments";

export type PaymentMode = "simulated" | "live";

export type ApiConfig = {
  NODE_ENV: string;
  PORT: number;
  PAYMENT_MODE: PaymentMode;
  RAZORPAY_KEY_ID: string | null;
  RAZORPAY_KEY_SECRET: string | null;
  RAZORPAY_WEBHOOK_SECRET: string | null;
  SIMULATED_WEBHOOK_SECRET: string;
  WEB_BASE_URL: string | null;
  /** Public base URL of this API (for simulated delayed webhooks). */
  API_PUBLIC_URL: string | null;
  SUPABASE_URL: string | null;
  /**
   * Shared secret for POST /v1/internal/jobs/* (cron).
   * When unset, those routes accept admin JWT only.
   */
  INTERNAL_JOB_SECRET: string | null;
  /**
   * Days after `completed` before auto-release may run.
   * Overridable via platform_config key `auto_release_days`.
   * Default: 7.
   */
  AUTO_RELEASE_DAYS: number;
};

function requirePaymentMode(raw: string | undefined): PaymentMode {
  if (raw === "simulated" || raw === "live") return raw;
  console.error(
    "[@kritva/api] FATAL: PAYMENT_MODE must be set to \"simulated\" or \"live\". Unset aborts startup.",
  );
  process.exit(1);
}

function loadConfig(): ApiConfig {
  const PAYMENT_MODE = requirePaymentMode(process.env.PAYMENT_MODE?.trim());
  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim() || null;
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim() || null;
  const RAZORPAY_WEBHOOK_SECRET =
    process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null;
  const SIMULATED_WEBHOOK_SECRET =
    process.env.SIMULATED_WEBHOOK_SECRET?.trim() || "kritva_simulated_hmac_v1";
  const WEB_BASE_URL =
    process.env.WEB_BASE_URL?.trim().replace(/\/$/, "") || null;

  const apiPublicRaw =
    process.env.API_PUBLIC_URL?.trim() ||
    process.env.API_BASE_URL?.trim() ||
    null;
  // API_BASE_URL in .env.example historically included /v1 — strip it.
  let API_PUBLIC_URL = apiPublicRaw ? apiPublicRaw.replace(/\/$/, "") : null;
  if (API_PUBLIC_URL?.endsWith("/v1")) {
    API_PUBLIC_URL = API_PUBLIC_URL.slice(0, -3);
  }
  if (!API_PUBLIC_URL && PAYMENT_MODE === "simulated") {
    const port = Number(process.env.PORT ?? 5430);
    API_PUBLIC_URL = `http://localhost:${port}`;
  }

  if (PAYMENT_MODE === "live") {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error(
        "[@kritva/api] FATAL: PAYMENT_MODE=live requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      );
      process.exit(1);
    }
    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error(
        "[@kritva/api] FATAL: PAYMENT_MODE=live requires RAZORPAY_WEBHOOK_SECRET.",
      );
      process.exit(1);
    }
    if (RAZORPAY_KEY_ID.startsWith("rzp_test_")) {
      console.error(
        "[@kritva/api] FATAL: PAYMENT_MODE=live refuses test-prefixed Razorpay key (rzp_test_).",
      );
      process.exit(1);
    }
  }

  const autoReleaseRaw = process.env.AUTO_RELEASE_DAYS?.trim();
  const autoReleaseParsed = autoReleaseRaw ? Number(autoReleaseRaw) : NaN;
  const AUTO_RELEASE_DAYS =
    Number.isInteger(autoReleaseParsed) && autoReleaseParsed >= 1
      ? autoReleaseParsed
      : 7;

  return {
    NODE_ENV: process.env.NODE_ENV?.trim() || "development",
    PORT: Number(process.env.PORT ?? 5430),
    PAYMENT_MODE,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET,
    SIMULATED_WEBHOOK_SECRET,
    WEB_BASE_URL,
    API_PUBLIC_URL,
    SUPABASE_URL: process.env.SUPABASE_URL?.trim() || null,
    INTERNAL_JOB_SECRET: process.env.INTERNAL_JOB_SECRET?.trim() || null,
    AUTO_RELEASE_DAYS,
  };
}

export const config: ApiConfig = loadConfig();

createPaymentProvider({
  mode: config.PAYMENT_MODE,
  webhookBaseUrl: config.API_PUBLIC_URL,
  simulatedHmacSecret: config.SIMULATED_WEBHOOK_SECRET,
});

console.log(
  `[@kritva/api] PAYMENT_MODE=${config.PAYMENT_MODE} (NODE_ENV=${config.NODE_ENV}) provider=${config.PAYMENT_MODE === "live" ? "RazorpayProvider" : "SimulatedProvider"} AUTO_RELEASE_DAYS=${config.AUTO_RELEASE_DAYS}`,
);
