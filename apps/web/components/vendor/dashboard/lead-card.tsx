import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatEventDate, formatInr } from "@/lib/booking-form";
import { computeVendorPayout } from "@/lib/booking-status";
import { formatCityLabel } from "@/components/vendor/leads/lead-types";
import { formatEventType } from "./format";
import type { VendorBooking } from "./types";

export function LeadCard({ booking }: { booking: VendorBooking }) {
  const payout = computeVendorPayout(
    booking.total_amount,
    booking.commission_bps ?? null,
  );
  const area = booking.city_id
    ? formatCityLabel(booking.city_id)
    : formatEventType(booking.event_type);

  return (
    <li>
      <Link
        href={`/vendor/leads/${booking.id}`}
        className="flex min-h-14 items-center gap-2 border-b border-mk-line px-3 py-2.5 transition-colors last:border-b-0 hover:bg-mk-surface-2 active:bg-mk-surface-2 sm:gap-3 sm:px-4"
      >
        <div className="min-w-0 flex-1 truncate text-body text-mk-ink">
          <span className="font-semibold tabular-nums">
            {formatEventDate(booking.event_date)}
          </span>
          <span className="text-mk-muted"> · {area} · </span>
          <span className="font-semibold tabular-nums text-mk-navy">
            {formatInr(payout.vendorPayout)}
          </span>
          <span className="text-mk-muted"> to you</span>
        </div>
        <span className="hidden shrink-0 text-meta font-medium text-mk-navy sm:inline">
          Open
        </span>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-mk-muted"
          aria-hidden
        />
      </Link>
    </li>
  );
}
