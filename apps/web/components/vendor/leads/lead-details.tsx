"use client";

import { formatEventDate, formatInr, formatPackageSummary } from "@/lib/booking-form";
import {
  formatCityLabel,
  formatEventType,
  type LeadBooking,
} from "./lead-types";

/** Venue area is stored in notes as `Area: …` from Ask to book. */
function parseBriefNotes(notes: string | null): {
  venueArea: string | null;
  rest: string | null;
} {
  if (!notes?.trim()) return { venueArea: null, rest: null };
  const lines = notes.split("\n");
  let venueArea: string | null = null;
  const restLines: string[] = [];
  for (const line of lines) {
    const match = /^Area:\s*(.+)$/i.exec(line.trim());
    if (match && !venueArea) {
      venueArea = match[1]!.trim() || null;
      continue;
    }
    restLines.push(line);
  }
  const rest = restLines.join("\n").trim() || null;
  return { venueArea, rest };
}

export function LeadDetails({ booking }: { booking: LeadBooking }) {
  const customer =
    booking.customer_first_name ??
    booking.customer_display_name?.trim().split(/\s+/)[0] ??
    "Customer";
  const packageSummary = formatPackageSummary(booking.package_details);
  const { venueArea, rest } = parseBriefNotes(booking.notes);
  const areaLabel = venueArea || formatCityLabel(booking.city_id);

  return (
    <section className="space-y-4 border-t border-mk-border pt-6">
      <h2 className="font-sans text-meta font-semibold text-mk-ink">Brief</h2>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 font-sans text-meta">
        <div>
          <dt className="text-mk-muted">Customer</dt>
          <dd className="mt-0.5 text-mk-ink">{customer}</dd>
        </div>
        <div>
          <dt className="text-mk-muted">Event</dt>
          <dd className="mt-0.5 text-mk-ink">
            {formatEventType(booking.event_type)}
          </dd>
        </div>
        <div>
          <dt className="text-mk-muted">Date</dt>
          <dd className="mt-0.5 tabular-nums text-mk-ink">
            {formatEventDate(booking.event_date)}
          </dd>
        </div>
        <div>
          <dt className="text-mk-muted">Area</dt>
          <dd className="mt-0.5 text-mk-ink">{areaLabel}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-mk-muted">Package</dt>
          <dd className="mt-0.5 text-mk-ink">{packageSummary}</dd>
        </div>
      </dl>

      {rest ? (
        <div>
          <p className="font-sans text-meta text-mk-muted">What they need</p>
          <p className="mt-1 whitespace-pre-wrap font-sans text-meta text-mk-ink">
            {rest}
          </p>
        </div>
      ) : null}

      {booking.status === "vendor_countered" &&
      booking.counter_amount != null ? (
        <div className="rounded-lg bg-mk-app px-3 py-3">
          <p className="font-sans text-meta font-medium text-mk-ink">
            You suggested {formatInr(booking.counter_amount)}
          </p>
          {booking.counter_message ? (
            <p className="mt-1 font-sans text-meta text-mk-muted">
              {booking.counter_message}
            </p>
          ) : null}
        </div>
      ) : null}

      {booking.status === "vendor_declined" && booking.decline_reason ? (
        <p className="font-sans text-meta text-mk-muted">
          Declined: {booking.decline_reason}
        </p>
      ) : null}
    </section>
  );
}
