"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEventDate, formatInr } from "@/lib/booking-form";

export interface PayoutBooking {
  id: string;
  event_date: string;
  event_type: string;
  total_amount: number;
  status: string;
  customer_first_name?: string;
  /** Present when list/detail API includes snapshot. */
  commission_bps?: number | null;
  /** Present when payment payload is joined. */
  platform_fee?: number | null;
}

const HELD_STATUSES = new Set(["payment_held", "in_progress", "completed"]);
const SETTLED_STATUSES = new Set(["payment_released"]);

export function splitMoneyBookings(bookings: PayoutBooking[]) {
  const held = bookings.filter((b) => HELD_STATUSES.has(b.status));
  const settled = bookings.filter((b) => SETTLED_STATUSES.has(b.status));
  return { held, settled };
}

function releaseHint(status: string): string {
  if (status === "payment_held") {
    return "Released when the customer confirms delivery";
  }
  if (status === "in_progress") {
    return "Job in progress — held until delivery is approved";
  }
  if (status === "completed") {
    return "Delivered — waiting for customer to release";
  }
  return "Paid out to your bank";
}

function commissionLines(booking: PayoutBooking): {
  fee: number;
  toYou: number;
  hasBreakdown: boolean;
} | null {
  const total = booking.total_amount;
  if (typeof booking.platform_fee === "number" && booking.platform_fee >= 0) {
    return {
      fee: booking.platform_fee,
      toYou: total - booking.platform_fee,
      hasBreakdown: true,
    };
  }
  if (
    typeof booking.commission_bps === "number" &&
    Number.isInteger(booking.commission_bps) &&
    booking.commission_bps >= 0
  ) {
    const fee = Math.floor((total * booking.commission_bps) / 10_000);
    return { fee, toYou: total - fee, hasBreakdown: true };
  }
  return null;
}

function BookingMoneyRow({
  booking,
  mode,
}: {
  booking: PayoutBooking;
  mode: "held" | "settled";
}) {
  const breakdown = commissionLines(booking);
  const customer = booking.customer_first_name ?? "Customer";
  const headline = breakdown ? breakdown.toYou : booking.total_amount;

  return (
    <li className="border-b border-mk-border px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-meta font-medium text-mk-ink">
            {customer} · {formatEventDate(booking.event_date)}
          </p>
          <p className="mt-0.5 font-sans text-label text-mk-muted">
            {releaseHint(booking.status)}
          </p>
          {breakdown?.hasBreakdown ? (
            <p className="mt-1 font-sans text-label text-mk-muted">
              Total {formatInr(booking.total_amount)} · Kritva fee{" "}
              {formatInr(breakdown.fee)}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-sans text-meta font-semibold tabular-nums text-mk-ink">
            {formatInr(headline)}
          </p>
          {breakdown?.hasBreakdown ? (
            <p className="font-sans text-label text-mk-muted">to you</p>
          ) : null}
        </div>
      </div>
      <Link
        href={`/bookings/${booking.id}`}
        className="mt-1.5 inline-block font-sans text-label text-mk-navy hover:underline"
      >
        {mode === "held" ? "View booking" : "View receipt"}
      </Link>
    </li>
  );
}

export function MoneySections({
  bookings,
  isLoading,
  isError,
  onRetry,
}: {
  bookings: PayoutBooking[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <section className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </section>
        <section className="space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </section>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <p className="font-sans text-meta text-red-700">
          Could not load money held for you.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={onRetry}
        >
          Try again
        </Button>
      </div>
    );
  }

  const { held, settled } = splitMoneyBookings(bookings ?? []);
  const heldTotal = held.reduce((sum, b) => {
    const lines = commissionLines(b);
    return sum + (lines?.toYou ?? b.total_amount);
  }, 0);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-sans text-body font-semibold text-mk-ink">
            Money held for you
          </h2>
          {held.length > 0 ? (
            <p className="font-sans text-meta font-semibold tabular-nums text-mk-ink">
              {formatInr(heldTotal)}
            </p>
          ) : null}
        </div>
        <p className="mt-0.5 font-sans text-meta text-mk-muted">
          Paid by the customer, waiting for release after the job.
        </p>

        {held.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-mk-border bg-white px-4 py-4">
            <p className="font-sans text-meta text-mk-muted">
              Nothing held yet. When a customer pays, the amount shows here.
            </p>
            <Link
              href="/vendor"
              className="mt-2 inline-flex font-sans text-meta font-medium text-mk-navy underline-offset-2 hover:underline"
            >
              See your bookings
            </Link>
          </div>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-lg border border-mk-border bg-white">
            {held.map((booking) => (
              <BookingMoneyRow key={booking.id} booking={booking} mode="held" />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-sans text-body font-semibold text-mk-ink">
          Paid out
        </h2>
        <p className="mt-0.5 font-sans text-meta text-mk-muted">
          Released to your bank after the job was approved.
        </p>

        {settled.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-mk-border bg-white px-4 py-4">
            <p className="font-sans text-meta text-mk-muted">
              No payouts yet. Settled jobs will appear here with Kritva&apos;s
              fee shown as a line.
            </p>
          </div>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-lg border border-mk-border bg-white">
            {settled.map((booking) => (
              <BookingMoneyRow
                key={booking.id}
                booking={booking}
                mode="settled"
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
