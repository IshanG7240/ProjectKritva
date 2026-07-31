"use client";

import { canRevealContact } from "@/lib/booking-status";
import type { BookingDetail } from "./types";

/** Contact only at payment_held or later — never before, here and nowhere else. */
export function ContactBlock({
  booking,
  isCustomer,
}: {
  booking: BookingDetail;
  isCustomer: boolean;
}) {
  if (!canRevealContact(booking.status)) return null;

  const otherName = isCustomer
    ? booking.vendor_business_name
    : booking.customer_display_name;
  const phone = isCustomer ? booking.vendor_phone : booking.customer_phone;

  return (
    <section className="border-t border-mk-border pt-5">
      <h2 className="text-subhead text-mk-ink">Contact</h2>
      <p className="mt-2 text-body text-mk-ink">{otherName}</p>
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="mt-1 inline-block text-body font-medium text-mk-navy hover:underline"
        >
          {phone}
        </a>
      ) : (
        <p className="mt-1 text-meta text-mk-muted">
          Number will appear here once shared.
        </p>
      )}
    </section>
  );
}
