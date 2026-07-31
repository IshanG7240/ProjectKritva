"use client";

import { formatInr } from "@/lib/booking-form";
import type { BookingEvent } from "./types";

function formatEventTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

/** One human sentence per event — e.g. "Ravi suggested ₹45,000 · 3 Aug". */
function eventSentence(event: BookingEvent): string {
  const meta = event.metadata ?? {};
  const to = event.to_status;
  const actor = event.actor_role === "vendor" ? "Photographer" : "You";

  if (to === "vendor_accepted") return `${actor} accepted the enquiry`;
  if (to === "vendor_declined") {
    const reason =
      typeof meta.decline_reason === "string" ? meta.decline_reason : null;
    return reason
      ? `${actor} declined — ${reason}`
      : `${actor} declined the enquiry`;
  }
  if (to === "vendor_countered") {
    const amt =
      typeof meta.counter_amount === "number"
        ? formatInr(meta.counter_amount)
        : null;
    return amt
      ? `${actor} suggested ${amt}`
      : `${actor} suggested a different price`;
  }
  if (to === "vendor_reviewing") return `${actor} started reviewing`;
  if (to === "customer_confirmed") return "You confirmed the booking";
  if (to === "payment_pending") return "Payment started";
  if (to === "payment_held") return "Payment held safely";
  if (to === "in_progress") return "Job started";
  if (to === "completed") return "Delivery submitted";
  if (to === "payment_released") return "Payment released";
  if (to === "disputed") return "Booking put on hold";
  if (to === "cancelled") return "Booking cancelled";
  if (to === "refunded") return "Payment refunded";
  if (to === "inquiry") return "Enquiry created";
  return to.replace(/_/g, " ");
}

export function BookingTimeline({ events }: { events: BookingEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section className="border-t border-mk-border pt-5">
      <h2 className="text-subhead text-mk-ink">Activity</h2>
      <ul className="mt-2">
        {events.map((event) => (
          <li key={event.id} className="flex gap-3 py-2">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mk-navy"
              aria-hidden
            />
            <p className="text-body text-mk-ink">
              {eventSentence(event)}{" "}
              <span className="text-meta text-mk-muted">
                · {formatEventTimestamp(event.created_at)}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
