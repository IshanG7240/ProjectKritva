"use client";

/**
 * Customer dashboard — protected for role: customer.
 * Shows bookings awaiting payment, handles the mock escrow checkout loop,
 * and lets the customer release escrowed funds to the vendor after the event.
 */

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  formatEventDate,
  formatInr,
  formatServiceSummary,
} from "@/lib/booking-form";
import { AppNav } from "@/components/layout/app-nav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface ServiceDetail {
  service_id: string;
  name: string;
  quantity: number;
  price_at_booking: number;
}

interface Booking {
  id: string;
  vendor_id: string;
  event_date: string;
  event_type: string;
  total_amount: number;
  status: string;
  service_details?: ServiceDetail[];
  counter_amount?: number | null;
  counter_message?: string | null;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  corporate: "Corporate",
  birthday: "Birthday",
  social: "Social",
  other: "Other",
};

function formatEventType(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

async function fetchBookings(): Promise<Booking[]> {
  const res = await apiClient.get<Booking[]>("/v1/bookings?role=customer");
  if (res.error) throw new Error(res.error.message);
  return Array.isArray(res.data) ? res.data : [];
}

async function acceptCounter(bookingId: string): Promise<void> {
  const res = await apiClient.patch(`/v1/bookings/${bookingId}/accept-counter`);
  if (res.error) throw new Error(res.error.message);
}

async function declineCounter(bookingId: string): Promise<void> {
  const res = await apiClient.patch(`/v1/bookings/${bookingId}/cancel`, {});
  if (res.error) throw new Error(res.error.message);
}

async function checkout(bookingId: string): Promise<void> {
  const initRes = await apiClient.post("/v1/payments/initiate", {
    booking_id: bookingId,
  });
  if (initRes.error) throw new Error(initRes.error.message);

  const captureRes = await apiClient.post("/v1/payments/simulate-capture", {
    booking_id: bookingId,
  });
  if (captureRes.error) throw new Error(captureRes.error.message);
}

async function releaseFunds(bookingId: string): Promise<void> {
  const res = await apiClient.post("/v1/payments/release", {
    booking_id: bookingId,
  });
  if (res.error) throw new Error(res.error.message);
}

function SectionCard({
  title,
  emptyMessage,
  children,
}: {
  title: string;
  emptyMessage: string;
  children: ReactNode;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;

  return (
    <section>
      <h2 className="font-sans text-base font-semibold text-mk-ink">{title}</h2>
      {!hasRows ? (
        <p className="mt-2 font-sans text-sm text-mk-muted">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-lg border border-mk-border bg-white">
          {children}
        </ul>
      )}
    </section>
  );
}

function CounterOfferRow({
  booking,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
  actionError,
}: {
  booking: Booking;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting: boolean;
  isDeclining: boolean;
  actionError: string | null;
}) {
  const service = formatServiceSummary(booking.service_details);
  const counterAmount = booking.counter_amount ?? 0;
  const priceDiff = counterAmount - booking.total_amount;
  const isHigher = priceDiff > 0;

  return (
    <li className="border-b border-mk-border last:border-b-0 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="font-sans text-sm font-semibold text-mk-ink">
            {formatEventType(booking.event_type)} ·{" "}
            {formatEventDate(booking.event_date)}
          </p>
          <p className="font-sans text-xs text-mk-muted">{service}</p>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-sans text-sm">
            <span className="text-mk-muted">
              Your budget:{" "}
              <span className="font-medium text-mk-ink tabular-nums">
                {formatInr(booking.total_amount)}
              </span>
            </span>
            <span className="text-mk-muted">→</span>
            <span className="text-mk-muted">
              Counter-offer:{" "}
              <span className="font-semibold text-mk-ink tabular-nums">
                {formatInr(counterAmount)}
              </span>
            </span>
            {priceDiff !== 0 && (
              <span
                className={`font-sans text-xs font-medium tabular-nums ${
                  isHigher ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                ({isHigher ? "+" : ""}
                {formatInr(priceDiff)})
              </span>
            )}
          </div>

          {booking.counter_message?.trim() && (
            <blockquote className="rounded-md border border-mk-border bg-[#FAF7F0] px-3 py-2 font-sans text-xs leading-relaxed text-mk-ink">
              <span className="font-medium text-mk-muted">Vendor note: </span>
              {booking.counter_message.trim()}
            </blockquote>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
          <button
            type="button"
            onClick={onAccept}
            disabled={isAccepting || isDeclining}
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-mk-navy px-3 font-sans text-xs font-medium text-white transition-colors hover:bg-[#162C47] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAccepting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Accepting…
              </>
            ) : (
              "Accept counter"
            )}
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={isAccepting || isDeclining}
            className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-white px-3 font-sans text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Decline
          </button>
          {actionError && (
            <p className="font-sans text-[10px] leading-tight text-red-600">
              {actionError}
            </p>
          )}
          <Link
            href={`/bookings/${booking.id}`}
            className="font-sans text-[10px] text-mk-navy hover:underline"
          >
            View details
          </Link>
        </div>
      </div>
    </li>
  );
}

function DeclineCounterDialog({
  booking,
  open,
  onOpenChange,
  onConfirm,
  isPending,
  error,
}: {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  error: string | null;
}) {
  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-mk-border bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sans text-base text-mk-ink">
            Decline counter-offer?
          </DialogTitle>
          <DialogDescription className="font-sans text-sm text-mk-muted">
            This will cancel your inquiry for{" "}
            {formatEventType(booking.event_type)} on{" "}
            {formatEventDate(booking.event_date)}. The vendor will be notified
            and this booking cannot be reopened.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="font-sans text-xs text-red-600">{error}</p>
        )}
        <DialogFooter className="border-mk-border bg-[#FAF7F0]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center rounded-md border border-mk-border bg-white px-3 font-sans text-sm font-medium text-mk-ink hover:bg-white/80"
          >
            Keep reviewing
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-200 bg-red-600 px-3 font-sans text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Decline offer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerDashboardPage() {
  const { user, loading } = useRequireAuth("customer");
  const queryClient = useQueryClient();
  const [declineTarget, setDeclineTarget] = useState<Booking | null>(null);
  const [actionErrorId, setActionErrorId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: bookings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["bookings"],
    queryFn: fetchBookings,
    enabled: !loading && !!user,
  });

  const acceptCounterMutation = useMutation({
    mutationFn: acceptCounter,
    onMutate: (bookingId) => {
      setActionErrorId(bookingId);
      setActionError(null);
    },
    onSuccess: () => {
      setActionErrorId(null);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err) => {
      setActionError(
        err instanceof Error ? err.message : "Failed to accept counter-offer",
      );
    },
  });

  const declineCounterMutation = useMutation({
    mutationFn: declineCounter,
    onSuccess: () => {
      setDeclineTarget(null);
      setActionErrorId(null);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err) => {
      setActionError(
        err instanceof Error ? err.message : "Failed to decline counter-offer",
      );
    },
  });

  const payMutation = useMutation({
    mutationFn: checkout,
    onSuccess: () => {
      alert("Payment successful! Funds held in escrow.");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: releaseFunds,
    onSuccess: () => {
      alert("Funds released to vendor!");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  if (loading || !user) return null;

  const pendingVendorResponse =
    bookings?.filter((b) => b.status === "inquiry") ?? [];

  const counterOffers =
    bookings?.filter((b) => b.status === "vendor_countered") ?? [];

  const awaitingPayment =
    bookings?.filter((b) => b.status === "vendor_accepted") ?? [];

  const readyToRelease =
    bookings?.filter((b) => b.status === "payment_held") ?? [];

  const settledBookings =
    bookings?.filter((b) => b.status === "payment_released") ?? [];

  return (
    <div className="min-h-screen bg-mk-bg">
      <AppNav />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <h1 className="font-sans text-xl font-semibold text-mk-ink">
            Your Event Bookings
          </h1>
          <p className="mt-1 font-sans text-sm text-mk-muted">
            Track inquiries, respond to counter-offers, and manage payments.
          </p>
        </div>

        {isLoading ? (
          <p className="font-sans text-sm text-mk-muted">Loading bookings…</p>
        ) : isError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
            Error loading bookings:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        ) : (
          <div className="space-y-6">
            <SectionCard
              title="Pending vendor response"
              emptyMessage="No inquiries awaiting a vendor response."
            >
              {pendingVendorResponse.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-wrap items-start justify-between gap-3 border-b border-mk-border px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-sans text-sm font-semibold text-mk-ink">
                      {formatEventType(booking.event_type)} ·{" "}
                      {formatEventDate(booking.event_date)}
                    </p>
                    <p className="font-sans text-xs text-mk-muted">
                      {formatServiceSummary(booking.service_details)}
                    </p>
                    <p className="font-sans text-xs text-mk-muted">
                      Budget:{" "}
                      <span className="font-medium tabular-nums text-mk-ink">
                        {formatInr(booking.total_amount)}
                      </span>
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 rounded-full bg-[#FAF7F0] px-2.5 py-1 font-sans text-xs font-medium text-mk-ink">
                    Awaiting vendor response
                  </span>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="w-full font-sans text-xs text-mk-navy hover:underline sm:w-auto"
                  >
                    View details
                  </Link>
                </li>
              ))}
            </SectionCard>

            <SectionCard
              title="Vendor counter-offers"
              emptyMessage="No counter-offers to review."
            >
              {counterOffers.map((booking) => (
                <CounterOfferRow
                  key={booking.id}
                  booking={booking}
                  onAccept={() => acceptCounterMutation.mutate(booking.id)}
                  onDecline={() => setDeclineTarget(booking)}
                  isAccepting={
                    acceptCounterMutation.isPending &&
                    acceptCounterMutation.variables === booking.id
                  }
                  isDeclining={
                    declineCounterMutation.isPending &&
                    declineTarget?.id === booking.id
                  }
                  actionError={
                    actionErrorId === booking.id ? actionError : null
                  }
                />
              ))}
            </SectionCard>

            <SectionCard
              title="Awaiting payment"
              emptyMessage="No bookings awaiting payment."
            >
              {awaitingPayment.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-mk-border px-4 py-3 last:border-b-0"
                >
                  <div className="space-y-1">
                    <p className="font-sans text-sm font-semibold text-mk-ink">
                      {formatEventType(booking.event_type)} ·{" "}
                      {formatEventDate(booking.event_date)}
                    </p>
                    <p className="font-sans text-xs text-mk-muted">
                      {formatServiceSummary(booking.service_details)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-sans text-sm font-medium tabular-nums text-mk-ink">
                      {formatInr(booking.total_amount)}
                    </span>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center rounded-md bg-mk-navy px-3 font-sans text-xs font-medium text-white transition-colors hover:bg-[#162C47] disabled:opacity-50"
                      onClick={() => payMutation.mutate(booking.id)}
                      disabled={payMutation.isPending}
                    >
                      {payMutation.isPending ? "Processing…" : "Pay to Escrow"}
                    </button>
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="font-sans text-xs text-mk-navy hover:underline"
                    >
                      Details
                    </Link>
                  </div>
                  {payMutation.isError && (
                    <p className="w-full font-sans text-xs text-red-600">
                      Error:{" "}
                      {payMutation.error instanceof Error
                        ? payMutation.error.message
                        : "Payment failed"}
                    </p>
                  )}
                </li>
              ))}
            </SectionCard>

            <SectionCard
              title="Ready to release"
              emptyMessage="No bookings awaiting fund release."
            >
              {readyToRelease.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-mk-border px-4 py-3 last:border-b-0"
                >
                  <div className="space-y-1">
                    <p className="font-sans text-sm font-semibold text-mk-ink">
                      {formatEventType(booking.event_type)} ·{" "}
                      {formatEventDate(booking.event_date)}
                    </p>
                    <p className="font-sans text-xs text-mk-muted">
                      {formatServiceSummary(booking.service_details)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-sans text-sm font-medium tabular-nums text-mk-ink">
                      {formatInr(booking.total_amount)}
                    </span>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center rounded-md bg-mk-navy px-3 font-sans text-xs font-medium text-white transition-colors hover:bg-[#162C47] disabled:opacity-50"
                      onClick={() => releaseMutation.mutate(booking.id)}
                      disabled={releaseMutation.isPending}
                    >
                      {releaseMutation.isPending
                        ? "Releasing…"
                        : "Event complete — release funds"}
                    </button>
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="font-sans text-xs text-mk-navy hover:underline"
                    >
                      Details
                    </Link>
                  </div>
                  {releaseMutation.isError && (
                    <p className="w-full font-sans text-xs text-red-600">
                      Error:{" "}
                      {releaseMutation.error instanceof Error
                        ? releaseMutation.error.message
                        : "Release failed"}
                    </p>
                  )}
                </li>
              ))}
            </SectionCard>

            <SectionCard
              title="Settled"
              emptyMessage="No settled bookings yet."
            >
              {settledBookings.map((booking) => (
                <li
                  key={booking.id}
                  className="flex items-center justify-between border-b border-mk-border px-4 py-3 last:border-b-0"
                >
                  <div className="space-y-1">
                    <p className="font-sans text-sm font-semibold text-mk-ink">
                      {formatEventType(booking.event_type)} ·{" "}
                      {formatEventDate(booking.event_date)}
                    </p>
                    <p className="font-sans text-xs text-mk-muted">
                      {formatServiceSummary(booking.service_details)}
                    </p>
                  </div>
                  <span className="font-sans text-sm font-medium tabular-nums text-mk-ink">
                    {formatInr(booking.total_amount)}
                  </span>
                </li>
              ))}
            </SectionCard>
          </div>
        )}
      </main>

      <DeclineCounterDialog
        booking={declineTarget}
        open={declineTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeclineTarget(null);
            setActionError(null);
          }
        }}
        onConfirm={() => {
          if (declineTarget) {
            declineCounterMutation.mutate(declineTarget.id);
          }
        }}
        isPending={declineCounterMutation.isPending}
        error={
          declineTarget && declineCounterMutation.isError
            ? declineCounterMutation.error instanceof Error
              ? declineCounterMutation.error.message
              : "Failed to decline"
            : null
        }
      />
    </div>
  );
}
