/**
 * Internal job routes — cron / ops.
 * Mounted at /v1/internal.
 *
 * Auth: Authorization: Bearer <INTERNAL_JOB_SECRET>, or admin JWT when secret unset.
 */

import { Hono } from "hono";
import { ulid } from "ulid";
import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@kritva/db/client";
import {
  bookingEvents,
  bookingMilestones,
  bookings,
  paymentPayouts,
  payments,
  platformConfig,
  users,
  vendorBankAccounts,
  vendors,
} from "@kritva/db";
import {
  getPaymentProvider,
  transfer as providerTransfer,
} from "@kritva/payments";
import { dispatch as dispatchNotification } from "@kritva/notifications/dispatcher";
import { config } from "../config.js";
import {
  computePlatformAmounts,
  DEFAULT_COMMISSION_BPS,
  vendorPayoutPaisa,
} from "../lib/commission.js";
import { accountStatus } from "../middleware/account-status.js";
import { supabaseAuth, type AuthVariables } from "../middleware/supabase-auth.js";

export const internalRouter = new Hono<{ Variables: AuthVariables }>();

/** IST calendar date as YYYY-MM-DD (product city is Delhi-NCR). */
export function todayDateKeyIst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function webBaseUrl(): string {
  return config.WEB_BASE_URL?.replace(/\/$/, "") ?? "";
}

/**
 * Auto-release window in days.
 * Prefer platform_config.auto_release_days (number), else env AUTO_RELEASE_DAYS (default 7).
 */
export async function resolveAutoReleaseDays(): Promise<number> {
  const [row] = await db
    .select({ value: platformConfig.value })
    .from(platformConfig)
    .where(eq(platformConfig.key, "auto_release_days"))
    .limit(1);

  const raw = row?.value;
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 1) {
    return raw;
  }
  if (typeof raw === "string") {
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1) return n;
  }
  return config.AUTO_RELEASE_DAYS;
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

export type ReleaseActor = {
  id: string;
  role: "customer" | "admin" | "system";
};

export type ReleaseFromStatus = "payment_held" | "completed" | "disputed";

export type ReleaseEscrowResult =
  | {
      ok: true;
      amount_transferred: number;
      platform_commission: number;
      already?: boolean;
    }
  | { ok: false; code: string; message: string };

/**
 * Shared escrow release used by auto-release job and admin resolve(outcome=released).
 * Refuses disputed unless `fromStatuses` explicitly includes it (admin only).
 * Customer path in payments/release already excludes disputed — money stays frozen.
 */
export async function releaseBookingEscrow(params: {
  bookingId: string;
  actor: ReleaseActor;
  fromStatuses: ReleaseFromStatus[];
  metadata?: Record<string, unknown>;
  /** When true, skip party emails (caller sends booking_resolved instead). */
  silent?: boolean;
}): Promise<ReleaseEscrowResult> {
  const { bookingId, actor, fromStatuses, metadata, silent } = params;

  if (fromStatuses.includes("disputed") && actor.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only an admin can release a disputed booking.",
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
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    return { ok: false, code: "NOT_FOUND", message: `Booking '${bookingId}' was not found.` };
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
        and(eq(payments.bookingId, bookingId), eq(payments.status, "captured")),
      )
      .limit(1);

    const platform_commission =
      existingPayment?.platformFee ??
      computePlatformAmounts(booking.totalAmount, commissionBps).platformFee;
    const amount_transferred = vendorPayoutPaisa(
      existingPayment?.amount ?? booking.totalAmount,
      platform_commission,
    );

    return {
      ok: true,
      amount_transferred,
      platform_commission,
      already: true,
    };
  }

  if (booking.status === "disputed" && !fromStatuses.includes("disputed")) {
    return {
      ok: false,
      code: "DISPUTE_FREEZE",
      message:
        "This booking is disputed — money stays held until an admin resolves it.",
    };
  }

  if (!(fromStatuses as string[]).includes(booking.status)) {
    return {
      ok: false,
      code: "INVALID_STATE_TRANSITION",
      message: `Cannot release payment on a booking with status '${booking.status}'. Expected one of: ${fromStatuses.join(", ")}.`,
    };
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
      escrowStatus: payments.escrowStatus,
    })
    .from(payments)
    .where(
      and(eq(payments.bookingId, bookingId), eq(payments.status, "captured")),
    )
    .limit(1);

  if (!payment) {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: "No captured payment found for this booking.",
    };
  }

  if (payment.escrowStatus === "released") {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: "Payment escrow is already released.",
    };
  }

  const modeCheck = assertPaymentMode(payment.mode);
  if (!modeCheck.ok) {
    return { ok: false, code: modeCheck.code, message: modeCheck.message };
  }

  if (!payment.gatewayPaymentId) {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: "Captured payment is missing a gateway payment id.",
    };
  }

  const [milestone] = await db
    .select({ id: bookingMilestones.id })
    .from(bookingMilestones)
    .where(eq(bookingMilestones.bookingId, bookingId))
    .limit(1);

  if (!milestone) {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: "No payment milestone found for this booking.",
    };
  }

  const computed = computePlatformAmounts(payment.amount, commissionBps);
  const platformFee =
    payment.platformFee > 0 ? payment.platformFee : computed.platformFee;
  const gstOnFee =
    payment.platformFee > 0 ? payment.gstOnFee : computed.gstOnFee;
  const amount_transferred = vendorPayoutPaisa(payment.amount, platformFee);

  const [existingPayout] = await db
    .select({
      id: paymentPayouts.id,
      gatewayTransferId: paymentPayouts.gatewayTransferId,
      status: paymentPayouts.status,
    })
    .from(paymentPayouts)
    .where(eq(paymentPayouts.paymentId, payment.id))
    .limit(1);

  let payoutId = existingPayout?.id ?? null;
  let gatewayTransferId = existingPayout?.gatewayTransferId ?? null;
  let transferStatus: string =
    existingPayout?.status === "completed" ? "settled" : "pending";

  if (!payoutId) {
    payoutId = ulid();
    await db.insert(paymentPayouts).values({
      id: payoutId,
      vendorId: payment.vendorId,
      bookingId,
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
      return {
        ok: false,
        code: "BANK_ACCOUNT_REQUIRED",
        message:
          "Vendor has no linked payout account. They must add a bank account before funds can be released.",
      };
    }

    let fundAccountId = bankAccount.razorpayFundId;
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
      return {
        ok: false,
        code: "BANK_ACCOUNT_REQUIRED",
        message:
          "Vendor payout account is not linked to the payment provider.",
      };
    }

    try {
      const transferResult = await providerTransfer({
        payment_id: payment.gatewayPaymentId,
        account_id: fundAccountId,
        amount: amount_transferred,
        currency: "INR",
        booking_id: bookingId,
        vendor_id: payment.vendorId,
      });
      gatewayTransferId = transferResult.transfer_id;
      transferStatus = transferResult.status;
      const payoutStatus =
        transferResult.status === "settled" ? "completed" : "pending";

      await db
        .update(paymentPayouts)
        .set({
          gatewayTransferId,
          status: payoutStatus,
          amount: amount_transferred,
          completedAt: payoutStatus === "completed" ? new Date() : null,
        })
        .where(eq(paymentPayouts.id, payoutId));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Transfer failed";
      return { ok: false, code: "TRANSFER_FAILED", message };
    }
  }

  const fromStatus = booking.status;

  try {
    await db.transaction(async (tx) => {
      // disputed / payment_held → completed intermediate (same shape as customer release)
      if (fromStatus === "payment_held" || fromStatus === "disputed") {
        const [markedComplete] = await tx
          .update(bookings)
          .set({ status: "completed", updatedAt: new Date() })
          .where(
            and(
              eq(bookings.id, bookingId),
              eq(bookings.status, fromStatus),
            ),
          )
          .returning({ id: bookings.id });

        if (markedComplete) {
          await tx.insert(bookingEvents).values({
            id: ulid(),
            bookingId,
            fromStatus,
            toStatus: "completed",
            actorId: actor.id,
            actorRole: actor.role,
            metadata: {
              amount: booking.totalAmount,
              ...(metadata ?? {}),
              intermediate: true,
            },
          });
        } else {
          const [current] = await tx
            .select({ status: bookings.status })
            .from(bookings)
            .where(eq(bookings.id, bookingId))
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
          and(eq(bookings.id, bookingId), eq(bookings.status, "completed")),
        )
        .returning({ totalAmount: bookings.totalAmount });

      if (!releasedBooking) {
        const [alreadyReleased] = await tx
          .select({ totalAmount: bookings.totalAmount })
          .from(bookings)
          .where(
            and(
              eq(bookings.id, bookingId),
              eq(bookings.status, "payment_released"),
            ),
          )
          .limit(1);
        if (!alreadyReleased) {
          throw new Error("Booking state changed during release");
        }
        return;
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
        bookingId,
        fromStatus: "completed",
        toStatus: "payment_released",
        actorId: actor.id,
        actorRole: actor.role,
        metadata: {
          amount: releasedBooking.totalAmount,
          platform_fee: platformFee,
          gst_on_fee: gstOnFee,
          amount_transferred,
          payment_id: payment.id,
          transfer_id: gatewayTransferId,
          transfer_status: transferStatus,
          ...(metadata ?? {}),
        },
      });
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to release payment";
    return { ok: false, code: "RELEASE_FAILED", message };
  }

  if (!silent) {
    const [[customer], [vendorOwner], [vendorRow]] = await Promise.all([
      db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, booking.customerId))
        .limit(1),
      db
        .select({ email: users.email })
        .from(vendors)
        .innerJoin(users, eq(users.id, vendors.userId))
        .where(eq(vendors.id, booking.vendorId))
        .limit(1),
      db
        .select({ businessName: vendors.businessName })
        .from(vendors)
        .where(eq(vendors.id, booking.vendorId))
        .limit(1),
    ]);

    const base = webBaseUrl();
    const customerUrl = base
      ? `${base}/bookings/${bookingId}`
      : `/bookings/${bookingId}`;
    const vendorUrl = base
      ? `${base}/vendor/payouts`
      : `/vendor/payouts`;

    void Promise.all([
      dispatchNotification({
        kind: "booking_released",
        booking_id: bookingId,
        customer_id: booking.customerId,
        vendor_id: booking.vendorId,
        total_amount: booking.totalAmount,
        amount_transferred,
        to_email: customer?.email ?? null,
        booking_url: customerUrl,
        recipient_role: "customer",
        vendor_business_name: vendorRow?.businessName ?? null,
      }),
      dispatchNotification({
        kind: "booking_released",
        booking_id: bookingId,
        customer_id: booking.customerId,
        vendor_id: booking.vendorId,
        total_amount: booking.totalAmount,
        amount_transferred,
        to_email: vendorOwner?.email ?? null,
        booking_url: vendorUrl,
        recipient_role: "vendor",
        vendor_business_name: vendorRow?.businessName ?? null,
      }),
    ]).catch(() => {});
  }

  return { ok: true, amount_transferred, platform_commission: platformFee };
}

async function authorizeInternalJob(c: {
  req: {
    header: (name: string) => string | undefined;
  };
  get: (key: "user") => { id: string } | undefined;
  json: (
    body: unknown,
    status?: number,
  ) => Response;
}): Promise<{ ok: true; actorId: string } | { ok: false; response: Response }> {
  const secret = config.INTERNAL_JOB_SECRET;
  const authHeader = c.req.header("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  const headerSecret =
    c.req.header("x-internal-job-secret")?.trim() || bearer;

  if (secret && headerSecret && headerSecret === secret) {
    return { ok: true, actorId: "system" };
  }

  // Admin JWT fallback (when secret unset, or as alternate).
  let userId: string | undefined;
  try {
    userId = c.get("user")?.id;
  } catch {
    userId = undefined;
  }
  if (userId) {
    const [dbUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (dbUser && (dbUser.role === "admin" || dbUser.role === "superadmin")) {
      return { ok: true, actorId: dbUser.id };
    }
  }

  if (!secret) {
    return {
      ok: false,
      response: c.json(
        {
          data: null,
          error: {
            code: "UNAUTHORIZED",
            message:
              "INTERNAL_JOB_SECRET is unset — call as an admin, or set the secret.",
          },
        },
        401,
      ),
    };
  }

  return {
    ok: false,
    response: c.json(
      {
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or missing internal job credentials.",
        },
      },
      401,
    ),
  };
}

/**
 * Optional JWT path — when Authorization is a Supabase JWT (not the job secret),
 * attach user so authorizeInternalJob can accept admins.
 */
internalRouter.use("/jobs/*", async (c, next) => {
  const secret = config.INTERNAL_JOB_SECRET;
  const authHeader = c.req.header("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  const headerSecret = c.req.header("x-internal-job-secret")?.trim();

  if (
    (secret && bearer === secret) ||
    (secret && headerSecret === secret)
  ) {
    return next();
  }

  // Try admin JWT.
  return supabaseAuth()(c, async () => {
    await accountStatus()(c, next);
  });
});

/**
 * POST /v1/internal/jobs/advance-booking-states
 *
 * a) payment_held + event_date <= today → in_progress
 * b) completed + auto_release window passed → payment_released (if safe)
 *
 * Auto-release window: platform_config.auto_release_days or AUTO_RELEASE_DAYS (default 7)
 * from the booking_events row that entered `completed`.
 * Disputed bookings are never auto-released.
 */
internalRouter.post("/jobs/advance-booking-states", async (c) => {
  const auth = await authorizeInternalJob(c);
  if (!auth.ok) return auth.response;

  const today = todayDateKeyIst();
  const autoReleaseDays = await resolveAutoReleaseDays();
  const actorId = auth.actorId;

  const advancedToInProgress: string[] = [];
  const autoReleased: string[] = [];
  const releaseErrors: Array<{ booking_id: string; code: string; message: string }> =
    [];

  // (a) payment_held → in_progress when event_date has arrived
  const dueForProgress = await db
    .select({
      id: bookings.id,
      customerId: bookings.customerId,
      vendorId: bookings.vendorId,
      totalAmount: bookings.totalAmount,
    })
    .from(bookings)
    .where(
      and(eq(bookings.status, "payment_held"), lte(bookings.eventDate, today)),
    )
    .limit(200);

  for (const row of dueForProgress) {
    const [updated] = await db
      .update(bookings)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(
        and(eq(bookings.id, row.id), eq(bookings.status, "payment_held")),
      )
      .returning({ id: bookings.id });

    if (!updated) continue;

    await db.insert(bookingEvents).values({
      id: ulid(),
      bookingId: row.id,
      fromStatus: "payment_held",
      toStatus: "in_progress",
      actorId,
      actorRole: actorId === "system" ? "system" : "admin",
      metadata: { event_date: today, job: "advance-booking-states" },
    });

    advancedToInProgress.push(row.id);
  }

  // (b) completed past auto-release window → release (never disputed)
  const dueForRelease = await db
    .select({
      id: bookings.id,
      completedAt: sql<Date>`(
        SELECT be.created_at
        FROM booking_events be
        WHERE be.booking_id = ${bookings.id}
          AND be.to_status = 'completed'
        ORDER BY be.created_at DESC
        LIMIT 1
      )`.as("completed_at"),
    })
    .from(bookings)
    .where(eq(bookings.status, "completed"))
    .limit(200);

  const cutoffMs = autoReleaseDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const row of dueForRelease) {
    if (!row.completedAt) continue;
    const completedMs =
      row.completedAt instanceof Date
        ? row.completedAt.getTime()
        : new Date(row.completedAt).getTime();
    if (Number.isNaN(completedMs) || now - completedMs < cutoffMs) continue;

    const result = await releaseBookingEscrow({
      bookingId: row.id,
      actor: {
        id: actorId,
        role: actorId === "system" ? "system" : "admin",
      },
      fromStatuses: ["completed"],
      metadata: {
        job: "advance-booking-states",
        auto_release_days: autoReleaseDays,
      },
    });

    if (result.ok) {
      autoReleased.push(row.id);
    } else {
      releaseErrors.push({
        booking_id: row.id,
        code: result.code,
        message: result.message,
      });
    }
  }

  return c.json(
    {
      data: {
        today,
        auto_release_days: autoReleaseDays,
        advanced_to_in_progress: advancedToInProgress,
        auto_released: autoReleased,
        release_errors: releaseErrors,
      },
      error: null,
    },
    200,
  );
});
