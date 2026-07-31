"use client";

import { formatInr } from "@/lib/booking-form";
import {
  computeVendorPayout,
  type BookingStatusRole,
} from "@/lib/booking-status";
import type { BookingDetail } from "./types";
import { cn } from "@/lib/utils";

const HELD_STATUSES = new Set([
  "payment_held",
  "in_progress",
  "completed",
  "disputed",
]);

/** Amount + one plain money sentence. No CTAs live here. */
export function MoneyCard({
  booking,
  role,
}: {
  booking: BookingDetail;
  role: BookingStatusRole;
}) {
  const amount = booking.total_amount;
  const vendorPreview = computeVendorPayout(amount, booking.commission_bps);
  const status = booking.status;

  const displayAmount =
    status === "vendor_countered" && booking.counter_amount != null
      ? booking.counter_amount
      : amount;

  const isHeld = HELD_STATUSES.has(status);

  let body: string;
  if (status === "payment_held" || status === "in_progress") {
    body =
      role === "customer"
        ? "Held safely. Released when the job's done."
        : "Funded and held for you until the job is done.";
  } else if (status === "completed") {
    body =
      role === "customer"
        ? "Delivery is in — release when you're happy, or say something's wrong."
        : "Waiting for the customer to release payment.";
  } else if (status === "payment_released") {
    body =
      role === "customer"
        ? "Released to the photographer."
        : "Released to your account.";
  } else if (status === "disputed") {
    body = "On hold while we look into it. Nothing moves until then.";
  } else if (status === "refunded") {
    body = role === "customer" ? "Refunded to you." : "Refunded to the customer.";
  } else if (status === "vendor_countered" && booking.counter_amount != null) {
    body =
      role === "customer"
        ? `Suggested instead of ${formatInr(amount)}.`
        : "Your suggestion — waiting for their reply.";
  } else if (
    status === "vendor_accepted" ||
    status === "customer_confirmed" ||
    status === "payment_pending"
  ) {
    body =
      role === "customer"
        ? "Pay to confirm. Held safely until the job is done."
        : "Waiting for the customer to pay.";
  } else {
    body =
      role === "customer"
        ? "Indicative — the photographer will confirm."
        : "Quoted amount for this enquiry.";
  }

  return (
    <section>
      <p
        className={cn(
          "text-money-lg tabular-nums",
          isHeld ? "text-mk-navy" : "text-mk-ink",
        )}
      >
        {formatInr(displayAmount)}
      </p>
      <p className="mt-1.5 text-body text-mk-muted">{body}</p>
      {role === "vendor" ? (
        <p className="mt-1 text-meta text-mk-muted tabular-nums">
          {formatInr(displayAmount)} total →{" "}
          <span className="font-medium text-mk-ink">
            {formatInr(vendorPreview.vendorPayout)} to you
          </span>{" "}
          (Kritva fee {formatInr(vendorPreview.platformFee)})
        </p>
      ) : null}
    </section>
  );
}
