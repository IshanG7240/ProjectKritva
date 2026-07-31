import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatEventDate } from "@/lib/booking-form";
import { getBookingStatusLabel } from "@/lib/booking-status";
import { formatEventType } from "./format";
import type { VendorBooking } from "./types";

export function NextJobsSection({ jobs }: { jobs: VendorBooking[] }) {
  if (jobs.length === 0) {
    return (
      <p className="text-body text-mk-muted">Nothing booked this week.</p>
    );
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-mk-border bg-white">
      {jobs.map((booking) => {
        const customer = booking.customer_first_name ?? "Customer";
        return (
          <li key={booking.id}>
            <Link
              href={`/bookings/${booking.id}`}
              className="flex min-h-14 items-center gap-3 border-b border-mk-line px-3 py-2.5 transition-colors last:border-b-0 hover:bg-mk-surface-2 active:bg-mk-surface-2 sm:px-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-mk-ink">
                  <span className="tabular-nums">
                    {formatEventDate(booking.event_date)}
                  </span>
                  <span className="font-normal text-mk-muted">
                    {" · "}
                    {formatEventType(booking.event_type)}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-meta text-mk-muted">
                  {customer} · {getBookingStatusLabel(booking.status, "vendor")}
                </p>
              </div>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-mk-muted"
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
