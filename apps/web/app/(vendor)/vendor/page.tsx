"use client";

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

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  corporate: "Corporate",
  birthday: "Birthday",
  social: "Social",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  vendor_countered: "Awaiting customer",
  vendor_accepted: "Ready for payment",
  payment_pending: "Payment in progress",
  payment_held: "Funds in escrow",
  in_progress: "In progress",
  completed: "Completed",
  payment_released: "Payment released",
  vendor_declined: "Declined",
  cancelled: "Cancelled",
  customer_confirmed: "Confirmed",
};

interface ServiceDetail {
  service_id: string;
  name: string;
  quantity: number;
  price_at_booking: number;
}

interface Booking {
  id: string;
  event_date: string;
  event_type: string;
  guest_count: number | null;
  total_amount: number;
  notes: string | null;
  status: string;
  service_details: ServiceDetail[];
  customer_first_name?: string;
  counter_amount?: number | null;
  counter_message?: string | null;
}

const ACTIVE_STATUSES = new Set([
  "payment_pending",
  "payment_held",
  "in_progress",
  "completed",
  "payment_released",
  "customer_confirmed",
  "vendor_declined",
  "cancelled",
]);

async function fetchBookings(): Promise<Booking[]> {
  const res = await apiClient.get<Booking[]>("/v1/bookings?role=vendor");
  if (res.error) throw new Error(res.error.message);
  return Array.isArray(res.data) ? res.data : [];
}

async function acceptBooking(id: string): Promise<void> {
  const res = await apiClient.patch(`/v1/bookings/${id}/accept`);
  if (res.error) throw new Error(res.error.message);
}

async function declineBooking(id: string, decline_reason: string): Promise<void> {
  const res = await apiClient.patch(`/v1/bookings/${id}/decline`, {
    decline_reason,
  });
  if (res.error) throw new Error(res.error.message);
}

async function counterBooking(
  id: string,
  counter_amount: number,
  counter_message: string | null,
): Promise<void> {
  const res = await apiClient.patch(`/v1/bookings/${id}/counter`, {
    counter_amount,
    counter_message,
  });
  if (res.error) throw new Error(res.error.message);
}

function formatEventType(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

function parseRupeeInput(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const rupees = Number(normalized);
  if (!Number.isFinite(rupees) || rupees <= 0) return null;
  return Math.round(rupees * 100);
}

const thClassName =
  "font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted";
const tdClassName = "font-sans text-sm text-mk-ink";
const mobileLabelClassName =
  "font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted sm:hidden";

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full bg-[#FAF7F0] px-2 py-0.5 font-sans text-xs font-medium text-mk-ink">
      {formatStatus(status)}
    </span>
  );
}

function BookingCell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className={mobileLabelClassName}>{label}</p>
      {children}
    </div>
  );
}

function NewInquiryRow({
  booking,
  onAccept,
  onCounter,
  onDecline,
  isAccepting,
  acceptError,
}: {
  booking: Booking;
  onAccept: () => void;
  onCounter: () => void;
  onDecline: () => void;
  isAccepting: boolean;
  acceptError: string | null;
}) {
  const customer = booking.customer_first_name ?? "Customer";
  const service = formatServiceSummary(booking.service_details);

  return (
    <li className="border-b border-mk-border last:border-b-0">
      <div className="grid gap-2 px-3 py-3 sm:grid-cols-[0.7fr_1fr_0.85fr_0.65fr_0.45fr_0.65fr_1.1fr] sm:items-start sm:gap-3 sm:px-4">
        <BookingCell label="Customer">
          <p className={`${tdClassName} font-medium`}>{customer}</p>
        </BookingCell>
        <BookingCell label="Service">
          <p className={`${tdClassName} line-clamp-2`} title={service}>
            {service}
          </p>
        </BookingCell>
        <BookingCell label="Event Date">
          <p className={`${tdClassName} tabular-nums`}>
            {formatEventDate(booking.event_date)}
          </p>
        </BookingCell>
        <BookingCell label="Event Type">
          <p className={`${tdClassName}`}>{formatEventType(booking.event_type)}</p>
        </BookingCell>
        <BookingCell label="Guests">
          <p className={`${tdClassName} tabular-nums`}>
            {booking.guest_count ?? "—"}
          </p>
        </BookingCell>
        <BookingCell label="Budget">
          <p className={`${tdClassName} font-semibold tabular-nums`}>
            {formatInr(booking.total_amount)}
          </p>
        </BookingCell>
        <div className="flex flex-col gap-1.5 sm:items-end">
          <p className={mobileLabelClassName}>Actions</p>
          <div className="flex flex-wrap gap-1.5 sm:justify-end">
            <button
              type="button"
              onClick={onAccept}
              disabled={isAccepting}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-mk-navy px-2.5 font-sans text-xs font-medium text-white transition-colors hover:bg-[#162C47] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  …
                </>
              ) : (
                "Accept"
              )}
            </button>
            <button
              type="button"
              onClick={onCounter}
              className="inline-flex h-8 items-center justify-center rounded-md border border-mk-border bg-white px-2.5 font-sans text-xs font-medium text-mk-ink transition-colors hover:bg-[#FAF7F0]"
            >
              Counter
            </button>
            <button
              type="button"
              onClick={onDecline}
              className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-white px-2.5 font-sans text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
            >
              Decline
            </button>
          </div>
          <Link
            href={`/bookings/${booking.id}`}
            className="font-sans text-[10px] text-mk-navy hover:underline"
          >
            View details
          </Link>
          {acceptError && (
            <p className="font-sans text-[10px] leading-tight text-red-600">
              {acceptError}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function ViewOnlyRow({
  booking,
  amountLabel,
  amountPaisa,
  extra,
}: {
  booking: Booking;
  amountLabel: string;
  amountPaisa: number;
  extra?: ReactNode;
}) {
  const customer = booking.customer_first_name ?? "Customer";
  const service = formatServiceSummary(booking.service_details);

  return (
    <li className="border-b border-mk-border last:border-b-0">
      <div className="grid gap-2 px-3 py-3 sm:grid-cols-[0.7fr_1fr_0.85fr_0.65fr_0.75fr] sm:items-center sm:gap-3 sm:px-4">
        <BookingCell label="Customer">
          <p className={`${tdClassName} font-medium`}>{customer}</p>
        </BookingCell>
        <BookingCell label="Service">
          <p className={`${tdClassName} line-clamp-2`} title={service}>
            {service}
          </p>
        </BookingCell>
        <BookingCell label="Event Date">
          <p className={`${tdClassName} tabular-nums`}>
            {formatEventDate(booking.event_date)}
          </p>
        </BookingCell>
        <BookingCell label={amountLabel}>
          <p className={`${tdClassName} font-semibold tabular-nums`}>
            {formatInr(amountPaisa)}
          </p>
        </BookingCell>
        <BookingCell label="Status">
          <StatusBadge status={booking.status} />
          {extra}
          <Link
            href={`/bookings/${booking.id}`}
            className="mt-1 inline-block font-sans text-[10px] text-mk-navy hover:underline"
          >
            View details
          </Link>
        </BookingCell>
      </div>
    </li>
  );
}

function ActiveRow({ booking }: { booking: Booking }) {
  const customer = booking.customer_first_name ?? "Customer";
  const service = formatServiceSummary(booking.service_details);

  return (
    <li className="border-b border-mk-border last:border-b-0">
      <div className="grid gap-2 px-3 py-3 sm:grid-cols-[0.7fr_1fr_0.85fr_0.65fr_0.75fr] sm:items-center sm:gap-3 sm:px-4">
        <BookingCell label="Customer">
          <p className={`${tdClassName} font-medium`}>{customer}</p>
        </BookingCell>
        <BookingCell label="Service">
          <p className={`${tdClassName} line-clamp-2`} title={service}>
            {service}
          </p>
        </BookingCell>
        <BookingCell label="Event Date">
          <p className={`${tdClassName} tabular-nums`}>
            {formatEventDate(booking.event_date)}
          </p>
        </BookingCell>
        <BookingCell label="Amount">
          <p className={`${tdClassName} font-semibold tabular-nums`}>
            {formatInr(booking.total_amount)}
          </p>
        </BookingCell>
        <BookingCell label="Status">
          <StatusBadge status={booking.status} />
          <Link
            href={`/bookings/${booking.id}`}
            className="mt-1 inline-block font-sans text-[10px] text-mk-navy hover:underline"
          >
            View details
          </Link>
        </BookingCell>
      </div>
    </li>
  );
}

function BookingTable({
  title,
  emptyMessage,
  children,
  columns,
  gridTemplate,
}: {
  title: string;
  emptyMessage: string;
  children: ReactNode;
  columns: string[];
  gridTemplate: string;
}) {
  const hasRows = Array.isArray(children)
    ? children.length > 0
    : !!children;

  return (
    <section>
      <h2 className="font-sans text-base font-semibold text-mk-ink">{title}</h2>
      {!hasRows ? (
        <p className="mt-2 font-sans text-sm text-mk-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-mk-border bg-white">
          <div
            className="hidden min-w-[720px] border-b border-mk-border bg-[#FAF7F0] px-4 py-2 sm:grid sm:gap-3"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {columns.map((col) => (
              <span key={col} className={thClassName}>
                {col}
              </span>
            ))}
          </div>
          <ul className="min-w-[720px] divide-y divide-mk-border sm:divide-y-0">
            {children}
          </ul>
        </div>
      )}
    </section>
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
            Let the customer know why you cannot take this booking. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Reason for declining…"
          className="w-full rounded-md border border-mk-border px-3 py-2 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
        />
        {error && (
          <p className="font-sans text-xs text-red-600">{error}</p>
        )}
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
            <label className="mb-1 block font-sans text-xs font-medium text-mk-muted">
              Counter amount (₹)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full rounded-md border border-mk-border px-3 py-2 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
            />
          </div>
          <div>
            <label className="mb-1 block font-sans text-xs font-medium text-mk-muted">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Explain your counter-offer…"
              className="w-full rounded-md border border-mk-border px-3 py-2 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
            />
          </div>
        </div>
        {error && (
          <p className="font-sans text-xs text-red-600">{error}</p>
        )}
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
              onSubmit(amountPaisa!, message.trim() || null)
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-mk-navy px-3 font-sans text-sm font-medium text-white hover:bg-[#162C47] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send counter
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VendorDashboardPage() {
  const { user, loading } = useRequireAuth("vendor");
  const queryClient = useQueryClient();

  const [declineTarget, setDeclineTarget] = useState<Booking | null>(null);
  const [counterTarget, setCounterTarget] = useState<Booking | null>(null);

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

  const acceptMutation = useMutation({
    mutationFn: acceptBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      declineBooking(id, reason),
    onSuccess: () => {
      setDeclineTarget(null);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const counterMutation = useMutation({
    mutationFn: ({
      id,
      counter_amount,
      counter_message,
    }: {
      id: string;
      counter_amount: number;
      counter_message: string | null;
    }) => counterBooking(id, counter_amount, counter_message),
    onSuccess: () => {
      setCounterTarget(null);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  if (loading || !user) return null;

  const newInquiries = bookings?.filter((b) => b.status === "inquiry") ?? [];
  const awaitingCustomer =
    bookings?.filter((b) => b.status === "vendor_countered") ?? [];
  const readyForPayment =
    bookings?.filter((b) => b.status === "vendor_accepted") ?? [];
  const activeCompleted =
    bookings?.filter((b) => ACTIVE_STATUSES.has(b.status)) ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-mk-bg">
      <AppNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 pt-8 sm:px-6">
        <h1 className="font-sans text-xl font-semibold text-mk-ink">
          Vendor Dashboard
        </h1>
        <p className="mt-1 font-sans text-sm text-mk-muted">
          Manage inquiries, counter-offers, and active bookings.
        </p>

        {isLoading ? (
          <p className="mt-4 font-sans text-sm text-mk-muted">
            Loading your pipeline…
          </p>
        ) : isError ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
            Error loading bookings:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        ) : (
          <div className="mt-5 space-y-6">
            <BookingTable
              title="New inquiries"
              emptyMessage="No new inquiries at this time."
              columns={[
                "Customer",
                "Service",
                "Event Date",
                "Type",
                "Guests",
                "Budget",
                "Actions",
              ]}
              gridTemplate="0.7fr 1fr 0.85fr 0.65fr 0.45fr 0.65fr 1.1fr"
            >
              {newInquiries.map((booking) => (
                <NewInquiryRow
                  key={booking.id}
                  booking={booking}
                  onAccept={() => acceptMutation.mutate(booking.id)}
                  onCounter={() => setCounterTarget(booking)}
                  onDecline={() => setDeclineTarget(booking)}
                  isAccepting={
                    acceptMutation.isPending &&
                    acceptMutation.variables === booking.id
                  }
                  acceptError={
                    acceptMutation.isError &&
                    acceptMutation.variables === booking.id
                      ? acceptMutation.error instanceof Error
                        ? acceptMutation.error.message
                        : "Failed"
                      : null
                  }
                />
              ))}
            </BookingTable>

            <BookingTable
              title="Awaiting customer"
              emptyMessage="No counter-offers waiting on the customer."
              columns={[
                "Customer",
                "Service",
                "Event Date",
                "Counter amount",
                "Status",
              ]}
              gridTemplate="0.7fr 1fr 0.85fr 0.65fr 0.75fr"
            >
              {awaitingCustomer.map((booking) => (
                <ViewOnlyRow
                  key={booking.id}
                  booking={booking}
                  amountLabel="Counter amount"
                  amountPaisa={booking.counter_amount ?? booking.total_amount}
                  extra={
                    booking.counter_message ? (
                      <p
                        className="mt-1 line-clamp-2 font-sans text-[11px] text-mk-muted"
                        title={booking.counter_message}
                      >
                        {booking.counter_message}
                      </p>
                    ) : null
                  }
                />
              ))}
            </BookingTable>

            <BookingTable
              title="Ready for payment"
              emptyMessage="No bookings awaiting customer payment."
              columns={[
                "Customer",
                "Service",
                "Event Date",
                "Amount",
                "Status",
              ]}
              gridTemplate="0.7fr 1fr 0.85fr 0.65fr 0.75fr"
            >
              {readyForPayment.map((booking) => (
                <ViewOnlyRow
                  key={booking.id}
                  booking={booking}
                  amountLabel="Amount"
                  amountPaisa={booking.total_amount}
                />
              ))}
            </BookingTable>

            <BookingTable
              title="Active & completed"
              emptyMessage="No active or completed bookings yet."
              columns={[
                "Customer",
                "Service",
                "Event Date",
                "Amount",
                "Status",
              ]}
              gridTemplate="0.7fr 1fr 0.85fr 0.65fr 0.75fr"
            >
              {activeCompleted.map((booking) => (
                <ActiveRow key={booking.id} booking={booking} />
              ))}
            </BookingTable>
          </div>
        )}
      </main>

      <DeclineModal
        open={!!declineTarget}
        onOpenChange={(open) => !open && setDeclineTarget(null)}
        isPending={
          declineMutation.isPending &&
          declineMutation.variables?.id === declineTarget?.id
        }
        error={
          declineMutation.isError &&
          declineMutation.variables?.id === declineTarget?.id
            ? declineMutation.error instanceof Error
              ? declineMutation.error.message
              : "Failed to decline"
            : null
        }
        onSubmit={(reason) => {
          if (declineTarget) {
            declineMutation.mutate({ id: declineTarget.id, reason });
          }
        }}
      />

      <CounterModal
        open={!!counterTarget}
        onOpenChange={(open) => !open && setCounterTarget(null)}
        originalBudgetPaisa={counterTarget?.total_amount ?? 0}
        isPending={
          counterMutation.isPending &&
          counterMutation.variables?.id === counterTarget?.id
        }
        error={
          counterMutation.isError &&
          counterMutation.variables?.id === counterTarget?.id
            ? counterMutation.error instanceof Error
              ? counterMutation.error.message
              : "Failed to send counter"
            : null
        }
        onSubmit={(counter_amount, counter_message) => {
          if (counterTarget) {
            counterMutation.mutate({
              id: counterTarget.id,
              counter_amount,
              counter_message,
            });
          }
        }}
      />
    </div>
  );
}
