import type { BookingStatus } from "@kritva/types/enums";
import { BOOKING_STATUSES } from "@kritva/types/enums";

/** Semantic tone drives banner/badge colour — held money is navy, never green. */
export type StatusTone = "info" | "attention" | "held" | "success" | "danger";

/** Which primary action a role should surface for this status, if any. */
export type ActionKind =
  | "pay"
  | "resume-pay"
  | "release"
  | "dispute"
  | "accept-counter"
  | "decline-counter"
  | "accept"
  | "decline"
  | "counter"
  | "submit-delivery";

export type ActionSpec = {
  kind: ActionKind;
  label: string;
};

export type StatusCopy = {
  label: string;
  sentence: string;
  action?: ActionSpec;
  tone: StatusTone;
  /** @deprecated use `sentence`. Kept so callers don't break. */
  description: string;
};

export type BookingStatusRole = "customer" | "vendor";

type StatusInput = Omit<StatusCopy, "description"> & { description?: string };

function copy(input: StatusInput): StatusCopy {
  return {
    ...input,
    description: input.sentence,
  };
}

/**
 * Exhaustive status → plain-language copy + primary action + tone for both roles.
 * A new BookingStatus is a type error until both roles are filled — so a
 * funded booking can never fall through to "No actions available at this stage".
 */
export const BOOKING_STATUS_COPY: Record<
  BookingStatus,
  Record<BookingStatusRole, StatusCopy>
> = {
  inquiry: {
    customer: copy({
      label: "Enquiry sent",
      sentence: "We've sent this to the photographer. They'll confirm the price.",
      tone: "info",
    }),
    vendor: copy({
      label: "New enquiry",
      sentence: "A customer wants to book you — reply when you can.",
      tone: "attention",
      action: { kind: "accept", label: "Accept" },
    }),
  },
  vendor_reviewing: {
    customer: copy({
      label: "Under review",
      sentence: "The photographer is looking at your enquiry.",
      tone: "info",
    }),
    vendor: copy({
      label: "Reviewing",
      sentence: "You're reviewing this enquiry.",
      tone: "attention",
      action: { kind: "accept", label: "Accept" },
    }),
  },
  vendor_accepted: {
    customer: copy({
      label: "Ready to pay",
      sentence: "They said yes — pay to confirm the booking.",
      tone: "attention",
      action: { kind: "pay", label: "Pay to confirm" },
    }),
    vendor: copy({
      label: "Waiting for payment",
      sentence: "You accepted. Waiting for the customer to pay.",
      tone: "info",
    }),
  },
  vendor_declined: {
    customer: copy({
      label: "Declined",
      sentence: "The photographer can't take this booking.",
      tone: "info",
    }),
    vendor: copy({
      label: "Declined",
      sentence: "You declined this enquiry.",
      tone: "info",
    }),
  },
  vendor_countered: {
    customer: copy({
      label: "New price suggested",
      sentence: "They suggested a different price — accept or decline.",
      tone: "attention",
      action: { kind: "accept-counter", label: "Accept" },
    }),
    vendor: copy({
      label: "Awaiting customer",
      sentence: "You suggested a different price. Waiting for their reply.",
      tone: "info",
    }),
  },
  customer_confirmed: {
    customer: copy({
      label: "Confirmed — pay to hold",
      sentence: "You've confirmed. Pay to hold the money safely.",
      tone: "attention",
      action: { kind: "pay", label: "Pay to confirm" },
    }),
    vendor: copy({
      label: "Confirmed",
      sentence: "The customer confirmed. Next up: payment.",
      tone: "info",
    }),
  },
  payment_pending: {
    customer: copy({
      label: "Payment in progress",
      sentence: "Finish checkout to hold the money safely.",
      tone: "attention",
      action: { kind: "resume-pay", label: "Resume payment" },
    }),
    vendor: copy({
      label: "Payment in progress",
      sentence: "The customer is completing payment.",
      tone: "info",
    }),
  },
  payment_held: {
    customer: copy({
      label: "Paid — held safely",
      sentence: "Held safely. Released when the job's done.",
      tone: "held",
    }),
    vendor: copy({
      label: "Funded — held for you",
      sentence: "Payment is funded and held for you until the job is done.",
      tone: "held",
      action: { kind: "submit-delivery", label: "Submit delivery" },
    }),
  },
  in_progress: {
    customer: copy({
      label: "In progress",
      sentence: "The event is underway. Money is held until you release it.",
      tone: "held",
    }),
    vendor: copy({
      label: "In progress",
      sentence: "You're working this booking. Submit delivery when done.",
      tone: "held",
      action: { kind: "submit-delivery", label: "Submit delivery" },
    }),
  },
  completed: {
    customer: copy({
      label: "Delivered — review and release",
      sentence:
        "Delivery is in. Release when you're happy — or say something's wrong.",
      tone: "attention",
      action: { kind: "release", label: "Release payment" },
    }),
    vendor: copy({
      label: "Delivered — waiting for approval",
      sentence:
        "You've marked it done. Waiting for the customer to release payment.",
      tone: "info",
    }),
  },
  payment_released: {
    customer: copy({
      label: "Payment released",
      sentence: "Payment has been released to the photographer.",
      tone: "success",
    }),
    vendor: copy({
      label: "Paid out",
      sentence: "Payment has been released to your account.",
      tone: "success",
    }),
  },
  disputed: {
    customer: copy({
      label: "On hold — we're looking into it",
      sentence: "This booking is on hold while we look into it. Nothing moves until then.",
      tone: "danger",
    }),
    vendor: copy({
      label: "On hold — we're looking into it",
      sentence: "This booking is on hold while we look into it. Nothing moves until then.",
      tone: "danger",
    }),
  },
  cancelled: {
    customer: copy({
      label: "Cancelled",
      sentence: "This booking was cancelled.",
      tone: "info",
    }),
    vendor: copy({
      label: "Cancelled",
      sentence: "This booking was cancelled.",
      tone: "info",
    }),
  },
  refunded: {
    customer: copy({
      label: "Refunded",
      sentence: "Your payment has been refunded.",
      tone: "info",
    }),
    vendor: copy({
      label: "Refunded",
      sentence: "This booking was refunded to the customer.",
      tone: "info",
    }),
  },
};

export function getBookingStatusCopy(
  status: BookingStatus,
  role: BookingStatusRole,
): StatusCopy {
  return BOOKING_STATUS_COPY[status][role];
}

export function getBookingStatusLabel(
  status: string,
  role: BookingStatusRole,
): string {
  const copy = BOOKING_STATUS_COPY[status as BookingStatus];
  if (!copy) return status.replace(/_/g, " ");
  return copy[role].label;
}

export function getBookingStatusSentence(
  status: string,
  role: BookingStatusRole,
): string {
  const copy = BOOKING_STATUS_COPY[status as BookingStatus];
  if (!copy) return "We'll update you when something changes.";
  return copy[role].sentence;
}

/** @deprecated use `getBookingStatusSentence`. */
export const getBookingStatusDescription = getBookingStatusSentence;

export function getBookingStatusAction(
  status: string,
  role: BookingStatusRole,
): ActionSpec | undefined {
  const c = BOOKING_STATUS_COPY[status as BookingStatus];
  return c ? c[role].action : undefined;
}

export function getBookingStatusTone(
  status: string,
  role: BookingStatusRole,
): StatusTone {
  const c = BOOKING_STATUS_COPY[status as BookingStatus];
  return c ? c[role].tone : "info";
}

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value);
}

/** Customer dashboard: needs a pending action from the organiser. */
export const CUSTOMER_ATTENTION_STATUSES: readonly BookingStatus[] = [
  "vendor_accepted",
  "vendor_countered",
  "customer_confirmed",
  "payment_pending",
  "completed",
] as const;

/** Customer dashboard: waiting on the photographer. */
export const CUSTOMER_WAITING_STATUSES: readonly BookingStatus[] = [
  "inquiry",
  "vendor_reviewing",
] as const;

/** Customer dashboard: funded / in flight. */
export const CUSTOMER_CONFIRMED_STATUSES: readonly BookingStatus[] = [
  "payment_held",
  "in_progress",
] as const;

/** Customer dashboard: collapsed done section. */
export const CUSTOMER_DONE_STATUSES: readonly BookingStatus[] = [
  "payment_released",
  "cancelled",
  "vendor_declined",
  "refunded",
  "disputed",
] as const;

/** Statuses where contact details may be shown (after funds are held). */
export const CONTACT_REVEAL_STATUSES: readonly BookingStatus[] = [
  "payment_held",
  "in_progress",
  "completed",
  "payment_released",
  "disputed",
  "refunded",
] as const;

export function canRevealContact(status: string): boolean {
  return (CONTACT_REVEAL_STATUSES as readonly string[]).includes(status);
}

/**
 * Auto-release window after delivery (`completed`). Open product question (P5);
 * UI uses this client-side until the API returns a deadline.
 */
export const AUTO_RELEASE_DAYS = 7;

export function getAutoReleaseDeadline(completedAtIso: string): Date {
  const d = new Date(completedAtIso);
  d.setDate(d.getDate() + AUTO_RELEASE_DAYS);
  return d;
}

/** Plain countdown for completed bookings; null if not applicable. */
export function formatAutoReleaseCountdown(
  status: string,
  completedAtIso: string | null | undefined,
  nowMs: number = Date.now(),
): string | null {
  if (status !== "completed" || !completedAtIso) return null;
  const deadline = getAutoReleaseDeadline(completedAtIso);
  const ms = deadline.getTime() - nowMs;
  if (ms <= 0) return "Auto-release due — release or raise a problem now";
  const hours = Math.ceil(ms / (1000 * 60 * 60));
  if (hours < 48) return `Releases automatically in ${hours}h`;
  const days = Math.ceil(hours / 24);
  return `Releases automatically in ${days}d`;
}

export function formatRelativeAge(
  iso: string,
  nowMs: number = Date.now(),
): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.floor((nowMs - then) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  reception: "Reception",
  corporate: "Corporate",
  college_fest: "College fest",
  hackathon: "Hackathon",
  birthday: "Birthday",
  social: "Social",
  other: "Other",
};

export function formatEventTypeLabel(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

/** Default marketplace fee when booking has no snapshotted commission_bps yet. */
export const DEFAULT_COMMISSION_BPS = 200;

export type VendorPayoutPreview = {
  commissionBps: number;
  platformFee: number;
  vendorPayout: number;
};

/**
 * Vendor take-home after platform fee.
 * commission = floor(total * bps / 10000); payout = total - commission (paisa).
 */
export function computeVendorPayout(
  totalPaisa: number,
  commissionBps?: number | null,
): VendorPayoutPreview {
  const bps =
    typeof commissionBps === "number" &&
    Number.isInteger(commissionBps) &&
    commissionBps >= 0
      ? commissionBps
      : DEFAULT_COMMISSION_BPS;
  const platformFee = Math.floor((totalPaisa * bps) / 10_000);
  return {
    commissionBps: bps,
    platformFee,
    vendorPayout: totalPaisa - platformFee,
  };
}
