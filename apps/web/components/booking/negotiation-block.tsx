"use client";

import { Loader2 } from "lucide-react";
import { formatInr } from "@/lib/booking-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BookingDetail } from "./types";

export function NegotiationBlock({
  booking,
  isCustomer,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
}: {
  booking: BookingDetail;
  isCustomer: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
}) {
  if (booking.status !== "vendor_countered" || booking.counter_amount == null) {
    return null;
  }

  const counter = booking.counter_amount;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div>
          <h2 className="text-heading text-mk-ink">Suggested price</h2>
          <p className="mt-2 text-money tabular-nums text-mk-navy">
            {formatInr(counter)}
          </p>
          <p className="mt-1 text-meta text-mk-muted">
            Was {formatInr(booking.total_amount)}
          </p>
        </div>

        {booking.counter_message?.trim() ? (
          <p className="text-body text-mk-ink">
            {booking.counter_message.trim()}
          </p>
        ) : null}

        {isCustomer && onAccept && onDecline ? (
          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="button"
              size="lg"
              variant="primary"
              className="w-full"
              disabled={isAccepting || isDeclining}
              onClick={onAccept}
            >
              {isAccepting ? <Loader2 className="size-4 animate-spin" /> : null}
              Accept suggested price
            </Button>
            <Button
              type="button"
              size="md"
              variant="ghost"
              className="w-full text-mk-muted"
              disabled={isAccepting || isDeclining}
              onClick={onDecline}
            >
              Decline
            </Button>
          </div>
        ) : null}

        {!isCustomer ? (
          <p className="text-meta text-mk-muted">
            Waiting for the customer to accept or decline.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
