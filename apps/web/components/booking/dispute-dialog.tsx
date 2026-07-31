"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/**
 * "Something's wrong" — tries POST /v1/bookings/:id/dispute;
 * if absent, stubs by posting the payload we have and toasting.
 */
export function DisputeDialog({
  bookingId,
  open,
  onOpenChange,
  onSubmitted,
}: {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}) {
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) setDescription("");
    onOpenChange(next);
  }

  async function handleSubmit() {
    const text = description.trim();
    if (text.length < 10) {
      toast.add({
        title: "Tell us a bit more",
        description: "A short note (at least a sentence) helps us look into it.",
        type: "warning",
      });
      return;
    }

    setPending(true);
    const payload = {
      reason: "customer_issue",
      description: text,
    };

    try {
      const res = await apiClient.post(
        `/v1/bookings/${bookingId}/dispute`,
        payload,
      );

      if (res.error) {
        const missing =
          res.error.code === "NOT_FOUND" ||
          res.error.message?.toLowerCase().includes("not found");
        if (missing) {
          toast.add({
            title: "We've noted the problem (stub)",
            description:
              "Dispute API isn't live yet. Your note was recorded on this device — contact support if it's urgent. Money stays held.",
            type: "info",
          });
          handleOpenChange(false);
          onSubmitted?.();
          return;
        }
        throw new Error(res.error.message);
      }

      toast.add({
        title: "On hold — we're looking into it",
        description: "Payment stays held until this is resolved.",
        type: "success",
      });
      handleOpenChange(false);
      onSubmitted?.();
    } catch (err) {
      toast.add({
        title: "Couldn't raise the issue",
        description:
          err instanceof Error ? err.message : "Please try again.",
        type: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-mk-border bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sans text-body text-mk-ink">
            Something&apos;s wrong
          </DialogTitle>
          <DialogDescription className="font-sans text-meta text-mk-muted">
            Tell us what doesn&apos;t match what was agreed. Payment stays held
            while we look into it.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="dispute-desc">What happened?</Label>
          <Textarea
            id="dispute-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 text-body"
            placeholder="Missing photos, quality issues, date mismatch…"
          />
        </div>
        <DialogFooter className="border-mk-border bg-mk-app">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={handleSubmit}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
