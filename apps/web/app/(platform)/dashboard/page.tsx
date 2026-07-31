"use client";

/**
 * Customer dashboard — attention-first.
 * Needs attention (never collapsible) → Active → Past (collapsed).
 */

import { useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  checkoutBookingPayment,
  PaymentCancelledError,
  SimulatedCheckoutRedirectError,
} from "@/lib/razorpay-checkout";
import {
  formatEventDate,
  formatInr,
} from "@/lib/booking-form";
import {
  CUSTOMER_ATTENTION_STATUSES,
  CUSTOMER_CONFIRMED_STATUSES,
  CUSTOMER_DONE_STATUSES,
  CUSTOMER_WAITING_STATUSES,
  formatEventTypeLabel,
  getBookingStatusAction,
  getBookingStatusLabel,
} from "@/lib/booking-status";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Page, PageHeader } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BookingListItem } from "@/components/booking/types";

async function fetchBookings(): Promise<BookingListItem[]> {
  const res = await apiClient.get<BookingListItem[]>(
    "/v1/bookings?role=customer",
  );
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
  await checkoutBookingPayment(bookingId);
}

async function releaseFunds(bookingId: string): Promise<void> {
  const res = await apiClient.post("/v1/payments/release", {
    booking_id: bookingId,
  });
  if (res.error) throw new Error(res.error.message);
}

const HELD_ROW_STATUSES = new Set(["payment_held", "in_progress"]);

type RowAction = {
  label: string;
  onClick: () => void;
  pending: boolean;
};

/**
 * One row per booking. Whole row is tappable (View); the right slot carries at
 * most one primary action button (or nothing — the row itself opens details).
 */
function BookingRow({
  booking,
  action,
  meta,
}: {
  booking: BookingListItem;
  action?: RowAction;
  meta?: string;
}) {
  const isHeld = HELD_ROW_STATUSES.has(booking.status);
  const amount =
    booking.status === "vendor_countered" && booking.counter_amount != null
      ? booking.counter_amount
      : booking.total_amount;

  const eventLabel = `${formatEventTypeLabel(booking.event_type)} · ${formatEventDate(booking.event_date)}`;

  return (
    <li className="relative border-b border-mk-border last:border-b-0 hover:bg-mk-surface-2">
      <Link
        href={`/bookings/${booking.id}`}
        aria-label={`Open booking: ${eventLabel}`}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      />
      <div className="pointer-events-none relative z-10 grid min-h-14 grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 sm:gap-4">
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-mk-ink">
            {eventLabel}
          </p>
          <p className="truncate text-meta text-mk-muted">
            {booking.vendor_business_name ?? ""}
            {meta ? ` · ${meta}` : ""}
          </p>
        </div>

        <p
          className={cn(
            "text-right text-money tabular-nums",
            isHeld ? "text-mk-navy" : "text-mk-ink",
          )}
        >
          {formatInr(amount)}
        </p>

        <div className="pointer-events-auto justify-self-end">
          {action ? (
            <Button
              type="button"
              size="md"
              variant="primary"
              disabled={action.pending}
              onClick={action.onClick}
            >
              {action.pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {action.label}
            </Button>
          ) : (
            <span className="text-meta text-mk-muted" aria-hidden>
              View
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function Section({
  title,
  emptyMessage,
  rows,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  emptyMessage: string;
  rows: React.ReactNode[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = collapsible ? open : true;
  const count = rows.length;

  const heading = (
    <h2 className="text-heading text-mk-ink">
      {title}
      {count > 0 ? (
        <span className="ml-2 text-body font-normal text-mk-muted">
          ({count})
        </span>
      ) : null}
    </h2>
  );

  return (
    <section className="mb-8">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mb-3 flex w-full items-baseline justify-between gap-2 text-left"
        >
          {heading}
          <span className="text-meta text-mk-muted">
            {isOpen ? "Hide" : "Show"}
          </span>
        </button>
      ) : (
        <div className="mb-3">{heading}</div>
      )}
      {isOpen ? (
        count === 0 ? (
          <p className="text-body text-mk-muted">{emptyMessage}</p>
        ) : (
          <Card className="overflow-hidden">
            <ul>{rows}</ul>
          </Card>
        )
      ) : null}
    </section>
  );
}

export default function CustomerDashboardPage() {
  const { user, loading } = useRequireAuth("customer");
  const queryClient = useQueryClient();
  const [declineTarget, setDeclineTarget] = useState<BookingListItem | null>(
    null,
  );
  const [payingId, setPayingId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  const {
    data: bookings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["bookings", "customer"],
    queryFn: fetchBookings,
    enabled: !loading && !!user,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["bookings", "customer"] });

  const acceptCounterMutation = useMutation({
    mutationFn: acceptCounter,
    onSuccess: () => {
      toast.add({
        title: "Price accepted",
        description: "Pay to confirm the booking.",
        type: "success",
      });
      invalidate();
    },
    onError: (err) => {
      toast.add({
        title: "Couldn't accept",
        description:
          err instanceof Error ? err.message : "Failed to accept counter",
        type: "error",
      });
    },
  });

  const declineCounterMutation = useMutation({
    mutationFn: declineCounter,
    onSuccess: () => {
      setDeclineTarget(null);
      toast.add({
        title: "Counter declined",
        description: "This booking was cancelled.",
        type: "info",
      });
      invalidate();
    },
    onError: (err) => {
      toast.add({
        title: "Couldn't decline",
        description:
          err instanceof Error ? err.message : "Failed to decline counter",
        type: "error",
      });
    },
  });

  const payMutation = useMutation({
    mutationFn: checkout,
    onMutate: (id) => setPayingId(id),
    onSettled: () => setPayingId(null),
    onSuccess: () => {
      toast.add({
        title: "Payment successful",
        description: "Funds are held safely until the job is done.",
        type: "success",
      });
      invalidate();
    },
    onError: (err) => {
      if (
        err instanceof PaymentCancelledError ||
        err instanceof SimulatedCheckoutRedirectError
      ) {
        return;
      }
      toast.add({
        title: "Payment failed",
        description:
          err instanceof Error ? err.message : "Could not complete payment",
        type: "error",
      });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: releaseFunds,
    onMutate: (id) => setReleasingId(id),
    onSettled: () => setReleasingId(null),
    onSuccess: () => {
      toast.add({
        title: "Payment released",
        description: "Funds have been released to the photographer.",
        type: "success",
      });
      invalidate();
    },
    onError: (err) => {
      toast.add({
        title: "Couldn't release",
        description: err instanceof Error ? err.message : "Release failed",
        type: "error",
      });
    },
  });

  if (loading || !user) return null;

  const list = bookings ?? [];
  const attention = list.filter((b) =>
    (CUSTOMER_ATTENTION_STATUSES as readonly string[]).includes(b.status),
  );
  const active = list.filter(
    (b) =>
      (CUSTOMER_WAITING_STATUSES as readonly string[]).includes(b.status) ||
      (CUSTOMER_CONFIRMED_STATUSES as readonly string[]).includes(b.status),
  );
  const past = list.filter((b) =>
    (CUSTOMER_DONE_STATUSES as readonly string[]).includes(b.status),
  );

  const attentionRows = attention.map((booking) => {
    const spec = getBookingStatusAction(booking.status, "customer");
    let action: RowAction | undefined;

    if (spec?.kind === "pay" || spec?.kind === "resume-pay") {
      action = {
        label: spec.kind === "resume-pay" ? "Resume" : "Pay",
        onClick: () => payMutation.mutate(booking.id),
        pending: payingId === booking.id && payMutation.isPending,
      };
    } else if (spec?.kind === "release") {
      action = {
        label: "Release",
        onClick: () => releaseMutation.mutate(booking.id),
        pending: releasingId === booking.id && releaseMutation.isPending,
      };
    } else if (spec?.kind === "accept-counter") {
      action = {
        label: "Accept",
        onClick: () => acceptCounterMutation.mutate(booking.id),
        pending:
          acceptCounterMutation.isPending &&
          acceptCounterMutation.variables === booking.id,
      };
    }

    const meta =
      booking.status === "vendor_countered"
        ? "New price suggested"
        : getBookingStatusLabel(booking.status, "customer");

    return (
      <BookingRow
        key={booking.id}
        booking={booking}
        action={action}
        meta={meta}
      />
    );
  });

  const activeRows = active.map((booking) => (
    <BookingRow
      key={booking.id}
      booking={booking}
      meta={getBookingStatusLabel(booking.status, "customer")}
    />
  ));

  const pastRows = past.map((booking) => (
    <BookingRow
      key={booking.id}
      booking={booking}
      meta={getBookingStatusLabel(booking.status, "customer")}
    />
  ));

  return (
    <Page width="wide">
      <PageHeader title="Your bookings" />

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <p className="text-body text-mk-ink">
          Couldn&apos;t load bookings
          {error instanceof Error ? `: ${error.message}` : "."}
        </p>
      ) : (
        <>
          <Section
            title="Needs your attention"
            emptyMessage="Nothing needs you right now."
            rows={attentionRows}
          />
          <Section
            title="Active"
            emptyMessage="No active bookings."
            rows={activeRows}
          />
          <Section
            title="Past"
            emptyMessage="No finished bookings yet."
            rows={pastRows}
            collapsible
            defaultOpen={false}
          />
        </>
      )}

      <Dialog
        open={declineTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeclineTarget(null);
        }}
      >
        <DialogContent className="border-mk-border bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-mk-ink">
              Decline suggested price?
            </DialogTitle>
            <DialogDescription className="text-mk-muted">
              This will cancel your enquiry
              {declineTarget
                ? ` for ${formatEventTypeLabel(declineTarget.event_type)} on ${formatEventDate(declineTarget.event_date)}`
                : ""}
              . This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-mk-border bg-mk-app">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeclineTarget(null)}
            >
              Keep reviewing
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={declineCounterMutation.isPending}
              onClick={() => {
                if (declineTarget) {
                  declineCounterMutation.mutate(declineTarget.id);
                }
              }}
            >
              {declineCounterMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Decline offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
