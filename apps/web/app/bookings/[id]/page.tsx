"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  checkoutBookingPayment,
  PaymentCancelledError,
} from "@/lib/razorpay-checkout";
import {
  formatEventDate,
  formatInr,
  formatPackageSummary,
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
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  corporate: "Corporate",
  birthday: "Birthday",
  social: "Social",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry submitted",
  vendor_countered: "Counter-offer sent",
  vendor_accepted: "Vendor accepted",
  vendor_declined: "Declined by vendor",
  payment_pending: "Payment in progress",
  payment_held: "Funds in escrow",
  in_progress: "In progress",
  completed: "Event complete",
  payment_released: "Payment released",
  cancelled: "Cancelled",
  customer_confirmed: "Confirmed",
};

const STEPPER_STEPS = [
  "Inquiry",
  "Accepted",
  "Paid",
  "Complete",
  "Released",
] as const;

interface PackageDetail {
  package_id: string;
  name: string;
  quantity: number;
  price_at_booking: number;
}

interface BookingEvent {
  id: string;
  from_status: string;
  to_status: string;
  actor_id: string;
  actor_role: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface BookingMilestone {
  id: string;
  name: string;
  label: string;
  amount: number;
  percentage: number;
  payment_status: string;
}

interface BookingDetail {
  id: string;
  vendor_id: string;
  customer_id: string;
  event_date: string;
  event_type: string;
  guest_count: number | null;
  total_amount: number;
  notes: string | null;
  status: string;
  package_details: PackageDetail[];
  counter_amount: number | null;
  counter_message: string | null;
  decline_reason: string | null;
  vendor_business_name: string;
  customer_display_name: string;
  customer_first_name: string;
  milestones: BookingMilestone[];
  booking_events: BookingEvent[];
  created_at: string;
  updated_at: string;
}

interface BookingDetailResponse {
  booking: BookingDetail;
}

function formatEventType(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

function formatStatus(status: string): string {
  if (!status) return "Created";
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

function formatEventTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseRupeeInput(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const rupees = Number(normalized);
  if (!Number.isFinite(rupees) || rupees <= 0) return null;
  return Math.round(rupees * 100);
}

function getStepperIndex(status: string): number {
  switch (status) {
    case "inquiry":
    case "vendor_countered":
    case "vendor_declined":
    case "cancelled":
      return 0;
    case "vendor_accepted":
    case "payment_pending":
      return 1;
    case "payment_held":
    case "in_progress":
      return 2;
    case "completed":
      return 3;
    case "payment_released":
      return 4;
    default:
      return 0;
  }
}

function isTerminalStatus(status: string): boolean {
  return (
    status === "vendor_declined" ||
    status === "cancelled" ||
    status === "payment_released"
  );
}

async function fetchBooking(id: string): Promise<BookingDetail> {
  const res = await apiClient.get<BookingDetailResponse>(`/v1/bookings/${id}`);
  if (res.error) throw new Error(res.error.message);
  if (!res.data?.booking) throw new Error("Booking not found");
  return res.data.booking;
}

function StatusStepper({ status }: { status: string }) {
  const currentIndex = getStepperIndex(status);
  const terminal = isTerminalStatus(status);

  if (status === "vendor_declined" || status === "cancelled") {
    return (
      <div className="rounded-lg border border-mk-border bg-[#FAF7F0] px-4 py-3">
        <p className="font-sans text-sm font-medium text-mk-ink">
          {formatStatus(status)}
        </p>
        <p className="mt-1 font-sans text-xs text-mk-muted">
          This booking is closed and will not proceed further.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      {STEPPER_STEPS.map((label, index) => {
        const isComplete = index < currentIndex || (terminal && index <= currentIndex);
        const isCurrent = index === currentIndex && !terminal;

        return (
          <li
            key={label}
            className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center"
          >
            <div className="flex items-center gap-3 sm:flex-col">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-sans text-xs font-semibold transition-colors",
                  isComplete
                    ? "border-mk-navy bg-mk-navy text-white"
                    : isCurrent
                      ? "border-mk-navy bg-white text-mk-navy"
                      : "border-mk-border bg-white text-mk-muted",
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  index + 1
                )}
              </span>
              {index < STEPPER_STEPS.length - 1 && (
                <span
                  className={cn(
                    "hidden h-0.5 flex-1 sm:block sm:h-auto sm:w-full sm:flex-none sm:self-center sm:pt-0",
                    index < currentIndex ? "bg-mk-navy" : "bg-mk-border",
                  )}
                  aria-hidden
                />
              )}
            </div>
            <div className="min-w-0 pt-0.5 sm:pt-2">
              <p
                className={cn(
                  "font-sans text-sm font-medium",
                  isCurrent || isComplete ? "text-mk-ink" : "text-mk-muted",
                )}
              >
                {label}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TimelineEvent({ event }: { event: BookingEvent }) {
  const metadata = event.metadata;
  let detail: string | null = null;

  if (metadata) {
    if (typeof metadata.decline_reason === "string" && metadata.decline_reason) {
      detail = metadata.decline_reason;
    } else if (typeof metadata.counter_amount === "number") {
      detail = `Counter: ${formatInr(metadata.counter_amount)}`;
      if (typeof metadata.counter_message === "string" && metadata.counter_message) {
        detail += ` — ${metadata.counter_message}`;
      }
    } else if (typeof metadata.reason === "string" && metadata.reason) {
      detail = metadata.reason;
    }
  }

  return (
    <li className="relative border-l-2 border-mk-border pb-6 pl-5 last:pb-0">
      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-mk-navy" />
      <p className="font-sans text-sm font-medium text-mk-ink">
        {event.from_status
          ? `${formatStatus(event.from_status)} → ${formatStatus(event.to_status)}`
          : formatStatus(event.to_status)}
      </p>
      <p className="mt-0.5 font-sans text-xs text-mk-muted">
        {formatEventTimestamp(event.created_at)} · {event.actor_role}
      </p>
      {detail && (
        <p className="mt-2 rounded-md border border-mk-border bg-[#FAF7F0] px-3 py-2 font-sans text-xs text-mk-ink">
          {detail}
        </p>
      )}
    </li>
  );
}

function DeclineModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [reason, setReason] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) setReason("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-mk-border bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sans text-mk-ink">
            Decline inquiry
          </DialogTitle>
          <DialogDescription className="font-sans text-mk-muted">
            Let the customer know why you cannot take this booking.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Reason for declining…"
          className="w-full rounded-md border border-mk-border px-3 py-2 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
        />
        {error && <p className="font-sans text-xs text-red-600">{error}</p>}
        <DialogFooter className="border-mk-border bg-[#FAF7F0]">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="inline-flex h-9 items-center rounded-md border border-mk-border bg-white px-3 font-sans text-sm font-medium text-mk-ink hover:bg-white/80"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason.trim() || isPending}
            onClick={() => onSubmit(reason.trim())}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-red-700 px-3 font-sans text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Decline inquiry
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CounterModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  error,
  originalBudgetPaisa,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amountPaisa: number, message: string | null) => void;
  isPending: boolean;
  error: string | null;
  originalBudgetPaisa: number;
}) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) {
      setAmount("");
      setMessage("");
    }
    onOpenChange(next);
  }

  const amountPaisa = parseRupeeInput(amount);
  const isValid = amountPaisa != null && amountPaisa > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-mk-border bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sans text-mk-ink">
            Send counter-offer
          </DialogTitle>
          <DialogDescription className="font-sans text-mk-muted">
            Customer quoted {formatInr(originalBudgetPaisa)}. Propose a different
            amount and optional note.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="font-sans text-xs font-medium text-mk-muted">
              Counter amount (₹)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 85000"
              className="mt-1 w-full rounded-md border border-mk-border px-3 py-2 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
            />
          </div>
          <div>
            <label className="font-sans text-xs font-medium text-mk-muted">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-mk-border px-3 py-2 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
            />
          </div>
        </div>
        {error && <p className="font-sans text-xs text-red-600">{error}</p>}
        <DialogFooter className="border-mk-border bg-[#FAF7F0]">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="inline-flex h-9 items-center rounded-md border border-mk-border bg-white px-3 font-sans text-sm font-medium text-mk-ink hover:bg-white/80"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isValid || isPending}
            onClick={() =>
              onSubmit(amountPaisa!, message.trim() ? message.trim() : null)
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-mk-navy px-3 font-sans text-sm font-medium text-white hover:bg-[#162C47] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send counter-offer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading } = useRequireAuth(["customer", "vendor"]);
  const queryClient = useQueryClient();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);
  const [declineCounterOpen, setDeclineCounterOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: booking,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => fetchBooking(id),
    enabled: !loading && !!user,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["booking", id] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`/v1/bookings/${id}/accept`);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: invalidate,
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : "Action failed"),
  });

  const declineMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiClient.patch(`/v1/bookings/${id}/decline`, {
        decline_reason: reason,
      });
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      setDeclineOpen(false);
      setActionError(null);
      invalidate();
    },
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : "Action failed"),
  });

  const counterMutation = useMutation({
    mutationFn: async ({
      counter_amount,
      counter_message,
    }: {
      counter_amount: number;
      counter_message: string | null;
    }) => {
      const res = await apiClient.patch(`/v1/bookings/${id}/counter`, {
        counter_amount,
        counter_message,
      });
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      setCounterOpen(false);
      setActionError(null);
      invalidate();
    },
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : "Action failed"),
  });

  const acceptCounterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`/v1/bookings/${id}/accept-counter`);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : "Action failed"),
  });

  const declineCounterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`/v1/bookings/${id}/cancel`, {});
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      setDeclineCounterOpen(false);
      setActionError(null);
      invalidate();
    },
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : "Action failed"),
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      await checkoutBookingPayment(id);
    },
    onSuccess: invalidate,
    onError: (err) => {
      if (err instanceof PaymentCancelledError) {
        setActionError(null);
        return;
      }
      setActionError(err instanceof Error ? err.message : "Payment failed");
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/v1/payments/release", {
        booking_id: id,
      });
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: invalidate,
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : "Release failed"),
  });

  if (loading || !user) return null;

  const isCustomerView = booking
    ? booking.customer_id === user.id
    : user.role === "customer";
  const backHref = isCustomerView ? "/dashboard" : "/vendor";
  const backLabel = isCustomerView ? "Your bookings" : "Vendor dashboard";
  const isPendingAction =
    acceptMutation.isPending ||
    declineMutation.isPending ||
    counterMutation.isPending ||
    acceptCounterMutation.isPending ||
    declineCounterMutation.isPending ||
    payMutation.isPending ||
    releaseMutation.isPending;

  const isCustomer =
    booking != null && booking.customer_id === user.id;
  const hasActionButtons =
    booking != null &&
    ((!isCustomer && booking.status === "inquiry") ||
      (isCustomer &&
        ["vendor_countered", "vendor_accepted", "payment_held"].includes(
          booking.status,
        )));
  const showWaitingMessage =
    booking != null && isCustomer && booking.status === "inquiry";
  const showNoActions =
    booking != null && !hasActionButtons && !showWaitingMessage;

  return (
    <div className="min-h-screen bg-mk-bg">
      <AppNav />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <Link
            href={backHref}
            className="font-sans text-sm text-mk-muted transition-colors hover:text-mk-ink"
          >
            ← {backLabel}
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-8 w-64 animate-pulse rounded bg-[#EDE8DE]" />
            <div className="h-24 animate-pulse rounded-lg border border-mk-border bg-[#EDE8DE]" />
          </div>
        ) : isError || !booking ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load booking"}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="font-sans text-xs font-medium uppercase tracking-wider text-mk-muted">
                Booking
              </p>
              <h1 className="font-serif text-2xl text-mk-ink sm:text-3xl">
                {formatEventType(booking.event_type)} ·{" "}
                {formatEventDate(booking.event_date)}
              </h1>
              <p className="font-sans text-sm text-mk-muted">
                {isCustomer
                  ? `With ${booking.vendor_business_name}`
                  : `From ${booking.customer_display_name}`}
              </p>
            </div>

            <section className="rounded-lg border border-mk-border bg-white p-4 sm:p-6">
              <h2 className="font-sans text-sm font-semibold text-mk-ink">
                Progress
              </h2>
              <div className="mt-4">
                <StatusStepper status={booking.status} />
              </div>
              <p className="mt-4 font-sans text-xs text-mk-muted">
                Current status:{" "}
                <span className="font-medium text-mk-ink">
                  {formatStatus(booking.status)}
                </span>
              </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <section className="rounded-lg border border-mk-border bg-white p-4 sm:p-6">
                  <h2 className="font-sans text-sm font-semibold text-mk-ink">
                    Details
                  </h2>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="font-sans text-xs text-mk-muted">Package</dt>
                      <dd className="font-sans text-sm text-mk-ink">
                        {formatPackageSummary(booking.package_details)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-sans text-xs text-mk-muted">Amount</dt>
                      <dd className="font-sans text-sm font-semibold tabular-nums text-mk-ink">
                        {formatInr(booking.total_amount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-sans text-xs text-mk-muted">Guests</dt>
                      <dd className="font-sans text-sm tabular-nums text-mk-ink">
                        {booking.guest_count ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-sans text-xs text-mk-muted">Event date</dt>
                      <dd className="font-sans text-sm tabular-nums text-mk-ink">
                        {formatEventDate(booking.event_date)}
                      </dd>
                    </div>
                  </dl>
                  {booking.notes?.trim() && (
                    <div className="mt-4 rounded-md border border-mk-border bg-[#FAF7F0] px-3 py-2">
                      <p className="font-sans text-xs font-medium text-mk-muted">
                        Customer notes
                      </p>
                      <p className="mt-1 font-sans text-sm text-mk-ink">
                        {booking.notes.trim()}
                      </p>
                    </div>
                  )}
                  {booking.decline_reason?.trim() && (
                    <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                      <p className="font-sans text-xs font-medium text-red-800">
                        Decline reason
                      </p>
                      <p className="mt-1 font-sans text-sm text-red-900">
                        {booking.decline_reason.trim()}
                      </p>
                    </div>
                  )}
                  {booking.status === "vendor_countered" &&
                    booking.counter_amount != null && (
                      <div className="mt-4 rounded-md border border-mk-border bg-[#FAF7F0] px-3 py-2">
                        <p className="font-sans text-xs font-medium text-mk-muted">
                          Counter-offer
                        </p>
                        <p className="mt-1 font-sans text-sm font-semibold tabular-nums text-mk-ink">
                          {formatInr(booking.counter_amount)}
                        </p>
                        {booking.counter_message?.trim() && (
                          <p className="mt-2 font-sans text-sm text-mk-ink">
                            {booking.counter_message.trim()}
                          </p>
                        )}
                      </div>
                    )}
                </section>

                <section className="rounded-lg border border-mk-border bg-white p-4 sm:p-6">
                  <h2 className="font-sans text-sm font-semibold text-mk-ink">
                    Timeline
                  </h2>
                  {booking.booking_events.length === 0 ? (
                    <p className="mt-3 font-sans text-sm text-mk-muted">
                      No activity yet.
                    </p>
                  ) : (
                    <ul className="mt-4">
                      {booking.booking_events.map((event) => (
                        <TimelineEvent key={event.id} event={event} />
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <aside className="space-y-4">
                <section className="rounded-lg border border-mk-border bg-white p-4">
                  <h2 className="font-sans text-sm font-semibold text-mk-ink">
                    Actions
                  </h2>

                  {actionError && (
                    <p className="mt-2 font-sans text-xs text-red-600">
                      {actionError}
                    </p>
                  )}

                  <div className="mt-4 flex flex-col gap-2">
                    {!isCustomer && booking.status === "inquiry" && (
                      <>
                        <button
                          type="button"
                          disabled={isPendingAction}
                          onClick={() => {
                            setActionError(null);
                            acceptMutation.mutate();
                          }}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-mk-navy px-3 font-sans text-sm font-medium text-white hover:bg-[#162C47] disabled:opacity-50"
                        >
                          {acceptMutation.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          Accept at quoted price
                        </button>
                        <button
                          type="button"
                          disabled={isPendingAction}
                          onClick={() => {
                            setActionError(null);
                            setCounterOpen(true);
                          }}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-mk-border bg-white px-3 font-sans text-sm font-medium text-mk-ink hover:bg-[#FAF7F0] disabled:opacity-50"
                        >
                          Send counter-offer
                        </button>
                        <button
                          type="button"
                          disabled={isPendingAction}
                          onClick={() => {
                            setActionError(null);
                            setDeclineOpen(true);
                          }}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 font-sans text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Decline inquiry
                        </button>
                      </>
                    )}

                    {isCustomer && booking.status === "vendor_countered" && (
                      <>
                        <button
                          type="button"
                          disabled={isPendingAction}
                          onClick={() => {
                            setActionError(null);
                            acceptCounterMutation.mutate();
                          }}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-mk-navy px-3 font-sans text-sm font-medium text-white hover:bg-[#162C47] disabled:opacity-50"
                        >
                          {acceptCounterMutation.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          Accept counter-offer
                        </button>
                        <button
                          type="button"
                          disabled={isPendingAction}
                          onClick={() => {
                            setActionError(null);
                            setDeclineCounterOpen(true);
                          }}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 font-sans text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Decline counter-offer
                        </button>
                      </>
                    )}

                    {isCustomer && booking.status === "vendor_accepted" && (
                      <button
                        type="button"
                        disabled={isPendingAction}
                        onClick={() => {
                          setActionError(null);
                          payMutation.mutate();
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-mk-navy px-3 font-sans text-sm font-medium text-white hover:bg-[#162C47] disabled:opacity-50"
                      >
                        {payMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Pay to Escrow
                      </button>
                    )}

                    {isCustomer && booking.status === "payment_held" && (
                      <button
                        type="button"
                        disabled={isPendingAction}
                        onClick={() => {
                          setActionError(null);
                          releaseMutation.mutate();
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-mk-navy px-3 font-sans text-sm font-medium text-white hover:bg-[#162C47] disabled:opacity-50"
                      >
                        {releaseMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Event complete — release funds
                      </button>
                    )}

                    {showWaitingMessage && (
                      <p className="font-sans text-xs text-mk-muted">
                        Waiting for the vendor to respond to your inquiry.
                      </p>
                    )}

                    {showNoActions && (
                      <p className="font-sans text-xs text-mk-muted">
                        No actions available at this stage.
                      </p>
                    )}
                  </div>
                </section>

                {booking.milestones.length > 0 && (
                  <section className="rounded-lg border border-mk-border bg-white p-4">
                    <h2 className="font-sans text-sm font-semibold text-mk-ink">
                      Payment milestones
                    </h2>
                    <ul className="mt-3 space-y-2">
                      {booking.milestones.map((milestone) => (
                        <li
                          key={milestone.id}
                          className="flex items-center justify-between gap-2 font-sans text-sm"
                        >
                          <span className="text-mk-ink">{milestone.label}</span>
                          <span className="font-medium tabular-nums text-mk-ink">
                            {formatInr(milestone.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
      </main>

      <DeclineModal
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        onSubmit={(reason) => declineMutation.mutate(reason)}
        isPending={declineMutation.isPending}
        error={
          declineMutation.isError
            ? declineMutation.error instanceof Error
              ? declineMutation.error.message
              : "Failed to decline"
            : null
        }
      />

      <CounterModal
        open={counterOpen}
        onOpenChange={setCounterOpen}
        onSubmit={(counter_amount, counter_message) =>
          counterMutation.mutate({ counter_amount, counter_message })
        }
        isPending={counterMutation.isPending}
        error={
          counterMutation.isError
            ? counterMutation.error instanceof Error
              ? counterMutation.error.message
              : "Failed to send counter-offer"
            : null
        }
        originalBudgetPaisa={booking?.total_amount ?? 0}
      />

      <Dialog open={declineCounterOpen} onOpenChange={setDeclineCounterOpen}>
        <DialogContent className="border-mk-border bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans text-base text-mk-ink">
              Decline counter-offer?
            </DialogTitle>
            <DialogDescription className="font-sans text-sm text-mk-muted">
              This will cancel the booking. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-mk-border bg-[#FAF7F0]">
            <button
              type="button"
              onClick={() => setDeclineCounterOpen(false)}
              className="inline-flex h-9 items-center rounded-md border border-mk-border bg-white px-3 font-sans text-sm font-medium text-mk-ink hover:bg-white/80"
            >
              Keep reviewing
            </button>
            <button
              type="button"
              disabled={declineCounterMutation.isPending}
              onClick={() => declineCounterMutation.mutate()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-red-700 px-3 font-sans text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {declineCounterMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Decline offer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
