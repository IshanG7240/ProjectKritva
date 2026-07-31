"use client";

import {
  formatAutoReleaseCountdown,
  getBookingStatusCopy,
  isBookingStatus,
  type BookingStatusRole,
  type StatusTone,
} from "@/lib/booking-status";
import type { BookingStatus } from "@kritva/types/enums";
import { cn } from "@/lib/utils";

const toneClasses: Record<StatusTone, string> = {
  info: "text-mk-ink",
  attention: "text-mk-ink",
  held: "text-mk-navy",
  success: "text-mk-ink",
  danger: "text-danger",
};

/** One plain sentence from the status map. */
export function StatusBanner({
  status,
  role,
  updatedAt,
}: {
  status: string;
  role: BookingStatusRole;
  updatedAt?: string | null;
}) {
  const resolved: BookingStatus = isBookingStatus(status) ? status : "inquiry";
  const copyRow = getBookingStatusCopy(resolved, role);
  const countdown = formatAutoReleaseCountdown(status, updatedAt);

  return (
    <section aria-live="polite">
      <p
        className={cn(
          "text-heading font-semibold",
          toneClasses[copyRow.tone],
        )}
      >
        {copyRow.label}
      </p>
      <p className="mt-1 text-body text-mk-muted">{copyRow.sentence}</p>
      {countdown ? (
        <p className="mt-2 text-meta font-medium text-mk-navy">{countdown}</p>
      ) : null}
    </section>
  );
}
