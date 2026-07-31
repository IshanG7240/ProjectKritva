"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingDetail } from "./types";

/**
 * One primary action for the customer's current status.
 * Exhaustive by construction — never falls through to "No actions available".
 */
export function CustomerActions({
  booking,
  onPay,
  onRelease,
  onDispute,
  isPaying,
  isReleasing,
}: {
  booking: BookingDetail;
  onPay: () => void;
  onRelease: () => void;
  onDispute: () => void;
  isPaying: boolean;
  isReleasing: boolean;
}) {
  const status = booking.status;
  const busy = isPaying || isReleasing;

  if (
    status === "vendor_accepted" ||
    status === "customer_confirmed" ||
    status === "payment_pending"
  ) {
    return (
      <Button
        type="button"
        size="lg"
        variant="primary"
        className="w-full"
        disabled={busy}
        onClick={onPay}
      >
        {isPaying ? <Loader2 className="size-4 animate-spin" /> : null}
        {status === "payment_pending" ? "Resume payment" : "Pay to confirm"}
      </Button>
    );
  }

  if (status === "completed") {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          size="lg"
          variant="primary"
          className="w-full"
          disabled={busy}
          onClick={onRelease}
        >
          {isReleasing ? <Loader2 className="size-4 animate-spin" /> : null}
          Looks good — release payment
        </Button>
        <Button
          type="button"
          size="md"
          variant="ghost"
          className="w-full text-mk-muted"
          disabled={busy}
          onClick={onDispute}
        >
          Something&apos;s wrong
        </Button>
      </div>
    );
  }

  if (status === "payment_held") {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="w-full"
          disabled={busy}
          onClick={onRelease}
        >
          {isReleasing ? <Loader2 className="size-4 animate-spin" /> : null}
          Release early
        </Button>
        <Button
          type="button"
          size="md"
          variant="ghost"
          className="w-full text-mk-muted"
          disabled={busy}
          onClick={onDispute}
        >
          Something&apos;s wrong
        </Button>
      </div>
    );
  }

  if (status === "vendor_countered") {
    return (
      <p className="text-body text-mk-muted">
        Accept or decline the suggested price below.
      </p>
    );
  }

  if (status === "inquiry" || status === "vendor_reviewing") {
    return (
      <p className="text-body text-mk-muted">
        Nothing for you to do — we&apos;ll let you know when they reply.
      </p>
    );
  }

  if (status === "in_progress") {
    return (
      <p className="text-body text-mk-muted">
        The photographer is working on this. You&apos;ll be able to release
        payment once delivery is in.
      </p>
    );
  }

  if (status === "payment_released") {
    return (
      <p className="text-body text-mk-muted">
        All done. Payment has been released.
      </p>
    );
  }

  if (status === "disputed") {
    return (
      <p className="text-body text-mk-muted">
        We&apos;re reviewing both sides. Money stays held until then.
      </p>
    );
  }

  return <p className="text-body text-mk-muted">This booking is closed.</p>;
}
