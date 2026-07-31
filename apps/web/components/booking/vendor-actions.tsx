"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { formatInr } from "@/lib/booking-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DECLINE_REASONS,
  type DeclineReasonId,
} from "@/components/vendor/leads/lead-types";
import { DeliveryProof } from "./delivery-proof";
import type { BookingDetail } from "./types";

function parseRupeeInput(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const rupees = Number(normalized);
  if (!Number.isFinite(rupees) || rupees <= 0) return null;
  return Math.round(rupees * 100);
}

/**
 * One primary path per status. Funded bookings always surface delivery —
 * never an empty fallthrough.
 */
export function VendorActions({
  booking,
  onAccept,
  onDecline,
  onCounter,
  onDelivered,
  isAccepting,
  isDeclining,
  isCountering,
}: {
  booking: BookingDetail;
  onAccept: () => void;
  onDecline: (reason: string) => void;
  onCounter: (amountPaisa: number, message: string | null) => void;
  onDelivered?: () => void;
  isAccepting: boolean;
  isDeclining: boolean;
  isCountering: boolean;
}) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);
  const [declineId, setDeclineId] = useState<DeclineReasonId | "">("");
  const [declineOther, setDeclineOther] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  function resetDecline() {
    setDeclineId("");
    setDeclineOther("");
  }

  const declineReason =
    declineId === "other"
      ? declineOther.trim()
      : declineId
        ? (DECLINE_REASONS.find((r) => r.id === declineId)?.label ?? "")
        : "";

  const status = booking.status;
  const busy = isAccepting || isDeclining || isCountering;
  const canReply = status === "inquiry" || status === "vendor_reviewing";

  let body: ReactNode;

  if (canReply) {
    body = (
      <div className="space-y-2">
        <Button
          type="button"
          size="lg"
          variant="primary"
          className="w-full"
          disabled={busy}
          onClick={onAccept}
        >
          {isAccepting ? <Loader2 className="size-4 animate-spin" /> : null}
          Accept
        </Button>
        <Button
          type="button"
          size="md"
          variant="secondary"
          className="w-full"
          disabled={busy}
          onClick={() => setCounterOpen(true)}
        >
          Suggest a different price
        </Button>
        <Button
          type="button"
          size="md"
          variant="ghost"
          className="w-full text-mk-muted"
          disabled={busy}
          onClick={() => setDeclineOpen(true)}
        >
          Decline
        </Button>
      </div>
    );
  } else if (status === "payment_held" || status === "in_progress") {
    body = <DeliveryProof booking={booking} isVendor onDelivered={onDelivered} />;
  } else if (
    status === "vendor_accepted" ||
    status === "customer_confirmed" ||
    status === "payment_pending"
  ) {
    body = (
      <p className="text-body text-mk-muted">
        Waiting for the customer to pay. You&apos;ll see funds held once they do.
      </p>
    );
  } else if (status === "vendor_countered") {
    body = (
      <p className="text-body text-mk-muted">
        Your suggested price is with the customer.
      </p>
    );
  } else if (status === "completed") {
    body = (
      <p className="text-body text-mk-muted">
        Waiting for the customer to release payment — or raise a problem.
      </p>
    );
  } else if (status === "payment_released") {
    body = (
      <p className="text-body text-mk-muted">Released to your account.</p>
    );
  } else if (status === "disputed") {
    body = (
      <p className="text-body text-mk-muted">
        On hold while we look into it. Respond if support contacts you.
      </p>
    );
  } else {
    body = <p className="text-body text-mk-muted">This booking is closed.</p>;
  }

  return (
    <>
      {body}

      <Dialog
        open={declineOpen}
        onOpenChange={(open) => {
          if (!open) resetDecline();
          setDeclineOpen(open);
        }}
      >
        <DialogContent className="border-mk-border bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-mk-ink">
              Why can&apos;t you take this?
            </DialogTitle>
            <DialogDescription className="text-mk-muted">
              A reason is required. It helps us send better enquiries.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-2">
            <legend className="sr-only">Decline reason</legend>
            {DECLINE_REASONS.map((reason) => (
              <label
                key={reason.id}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-mk-border px-3 has-[:checked]:border-mk-navy has-[:checked]:bg-mk-surface-2"
              >
                <input
                  type="radio"
                  name="decline-reason"
                  value={reason.id}
                  checked={declineId === reason.id}
                  onChange={() => setDeclineId(reason.id)}
                  className="size-4 accent-mk-navy"
                />
                <span className="text-body text-mk-ink">{reason.label}</span>
              </label>
            ))}
          </fieldset>
          {declineId === "other" ? (
            <div className="space-y-1.5">
              <Label htmlFor="booking-decline-other" className="text-meta">
                Tell us more
              </Label>
              <Textarea
                id="booking-decline-other"
                value={declineOther}
                onChange={(e) => setDeclineOther(e.target.value)}
                rows={3}
                placeholder="Brief reason…"
              />
            </div>
          ) : null}
          <DialogFooter className="border-mk-border bg-mk-app">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetDecline();
                setDeclineOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={!declineReason || isDeclining}
              onClick={() => {
                if (declineReason) onDecline(declineReason);
              }}
            >
              {isDeclining ? <Loader2 className="size-4 animate-spin" /> : null}
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={counterOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAmount("");
            setMessage("");
          }
          setCounterOpen(open);
        }}
      >
        <DialogContent className="border-mk-border bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-mk-ink">
              Suggest a different price
            </DialogTitle>
            <DialogDescription className="text-mk-muted">
              Customer quoted {formatInr(booking.total_amount)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="counter-amt">Amount (₹)</Label>
              <Input
                id="counter-amt"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 45000"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="counter-msg">
                Message{" "}
                <span className="font-normal text-mk-muted">(optional)</span>
              </Label>
              <Textarea
                id="counter-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="border-mk-border bg-mk-app">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCounterOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={parseRupeeInput(amount) == null || isCountering}
              onClick={() => {
                const paisa = parseRupeeInput(amount);
                if (paisa == null) return;
                onCounter(paisa, message.trim() || null);
              }}
            >
              {isCountering ? <Loader2 className="size-4 animate-spin" /> : null}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
