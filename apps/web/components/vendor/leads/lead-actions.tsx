"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatInr } from "@/lib/booking-form";
import { computeVendorPayout } from "@/lib/booking-status";
import {
  DECLINE_REASONS,
  type DeclineReasonId,
  type LeadBooking,
} from "./lead-types";

function parseRupeeInput(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const rupees = Number(normalized);
  if (!Number.isFinite(rupees) || rupees <= 0) return null;
  return Math.round(rupees * 100);
}

export function LeadActions({
  booking,
  bankMissing,
  isAccepting,
  isDeclining,
  isCountering,
  onAccept,
  onDecline,
  onCounter,
}: {
  booking: LeadBooking;
  bankMissing: boolean;
  isAccepting: boolean;
  isDeclining: boolean;
  isCountering: boolean;
  onAccept: () => void;
  onDecline: (reason: string) => void;
  onCounter: (amountPaisa: number, message: string | null) => void;
}) {
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);

  const [declineId, setDeclineId] = useState<DeclineReasonId | null>(null);
  const [declineOther, setDeclineOther] = useState("");

  const [counterAmount, setCounterAmount] = useState("");
  const [counterMessage, setCounterMessage] = useState("");

  if (booking.status !== "inquiry") return null;

  function resetDecline() {
    setDeclineId(null);
    setDeclineOther("");
  }

  function resetCounter() {
    setCounterAmount("");
    setCounterMessage("");
  }

  function resolveDeclineReason(): string | null {
    if (!declineId) return null;
    if (declineId === "other") {
      const trimmed = declineOther.trim();
      return trimmed || null;
    }
    return DECLINE_REASONS.find((r) => r.id === declineId)?.label ?? null;
  }

  const declineReason = resolveDeclineReason();
  const counterPaisa = parseRupeeInput(counterAmount);
  const counterPreview =
    counterPaisa != null
      ? computeVendorPayout(counterPaisa, booking.commission_bps)
      : null;

  const busy = isAccepting || isDeclining || isCountering;

  function handleAcceptClick() {
    if (bankMissing) {
      setAcceptOpen(true);
      return;
    }
    onAccept();
  }

  return (
    <>
      <div className="space-y-2">
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={handleAcceptClick}
          disabled={busy}
        >
          {isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Accept
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setCounterOpen(true)}
          disabled={busy}
        >
          Suggest a different price
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-mk-muted"
          onClick={() => setDeclineOpen(true)}
          disabled={busy}
        >
          Decline
        </Button>
      </div>

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="border-mk-border bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a bank account?</DialogTitle>
            <DialogDescription className="text-mk-muted">
              You can accept now. We&apos;ll need your bank details before we
              can pay you out after the job.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={isAccepting}
              onClick={() => {
                setAcceptOpen(false);
                onAccept();
              }}
            >
              {isAccepting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Accept anyway
            </Button>
            <Link
              href="/vendor/payouts"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "w-full",
              )}
            >
              Add bank account first
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={declineOpen}
        onOpenChange={(open) => {
          if (!open) resetDecline();
          setDeclineOpen(open);
        }}
      >
        <DialogContent className="border-mk-border bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Why can&apos;t you take this?</DialogTitle>
            <DialogDescription className="text-mk-muted">
              A reason is required. It helps us send better enquiries.
            </DialogDescription>
          </DialogHeader>
          <div
            role="radiogroup"
            aria-label="Decline reason"
            className="space-y-2"
          >
            {DECLINE_REASONS.map((reason) => {
              const active = declineId === reason.id;
              return (
                <button
                  key={reason.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setDeclineId(reason.id)}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-md border px-3 text-left text-body text-mk-ink transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "border-mk-navy bg-mk-surface-2"
                      : "border-mk-border bg-white hover:bg-mk-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      active
                        ? "border-mk-navy bg-mk-navy text-white"
                        : "border-mk-border bg-white",
                    )}
                    aria-hidden
                  >
                    {active ? <Check className="size-3" /> : null}
                  </span>
                  {reason.label}
                </button>
              );
            })}
          </div>
          {declineId === "other" ? (
            <div className="space-y-1.5">
              <Label htmlFor="decline-other">Tell us more</Label>
              <Textarea
                id="decline-other"
                value={declineOther}
                onChange={(e) => setDeclineOther(e.target.value)}
                rows={3}
                placeholder="Brief reason…"
              />
            </div>
          ) : null}
          <DialogFooter className="gap-2">
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
              {isDeclining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={counterOpen}
        onOpenChange={(open) => {
          if (!open) resetCounter();
          setCounterOpen(open);
        }}
      >
        <DialogContent className="border-mk-border bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suggest a different price</DialogTitle>
            <DialogDescription className="text-mk-muted">
              They offered {formatInr(booking.total_amount)}. Propose what
              works for you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="counter-amount">Your price (₹)</Label>
              <Input
                id="counter-amount"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="e.g. 50000"
              />
            </div>
            {counterPreview ? (
              <p className="rounded-md bg-mk-surface-2 px-3 py-2.5 text-body text-mk-ink">
                <span className="font-semibold tabular-nums text-mk-navy">
                  {formatInr(counterPreview.vendorPayout)} to you
                </span>
                <span className="text-mk-muted">
                  {" · Kritva fee "}
                  {formatInr(counterPreview.platformFee)}
                </span>
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="counter-message">
                Message{" "}
                <span className="font-normal text-mk-muted">(optional)</span>
              </Label>
              <Textarea
                id="counter-message"
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                rows={3}
                placeholder="Brief note for the customer…"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetCounter();
                setCounterOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={counterPaisa == null || isCountering}
              onClick={() => {
                if (counterPaisa != null) {
                  onCounter(counterPaisa, counterMessage.trim() || null);
                }
              }}
            >
              {isCountering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Send suggestion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
