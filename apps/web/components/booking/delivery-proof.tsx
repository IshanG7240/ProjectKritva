"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { BookingDetail } from "./types";

function latestDelivery(booking: BookingDetail): {
  galleryUrl: string | null;
  note: string | null;
} {
  let best: {
    at: string;
    galleryUrl: string;
    note: string | null;
  } | null = null;

  for (const event of booking.booking_events ?? []) {
    const meta = event.metadata;
    if (!meta || typeof meta !== "object") continue;
    const url = meta.gallery_url;
    if (typeof url !== "string" || !url.trim()) continue;
    const note = meta.note;
    const candidate = {
      at: event.created_at,
      galleryUrl: url.trim(),
      note: typeof note === "string" && note.trim() ? note.trim() : null,
    };
    if (!best || candidate.at > best.at) best = candidate;
  }

  return best
    ? { galleryUrl: best.galleryUrl, note: best.note }
    : { galleryUrl: null, note: null };
}

/**
 * Vendor marks delivery with a gallery link + note.
 * Customer sees the link before releasing payment.
 */
export function DeliveryProof({
  booking,
  isVendor,
  onDelivered,
}: {
  booking: BookingDetail;
  isVendor: boolean;
  onDelivered?: () => void;
}) {
  const [galleryUrl, setGalleryUrl] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  const canUpload =
    isVendor &&
    (booking.status === "payment_held" || booking.status === "in_progress");

  const delivery = latestDelivery(booking);

  const showCustomerView =
    !isVendor &&
    (booking.status === "completed" ||
      booking.status === "payment_held" ||
      booking.status === "in_progress");

  if (!canUpload && !showCustomerView) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = galleryUrl.trim();
    if (!url) {
      toast.add({
        title: "Gallery link needed",
        description: "Paste a link to the delivery gallery or drive folder.",
        type: "warning",
      });
      return;
    }

    setPending(true);
    try {
      const res = await apiClient.post(`/v1/bookings/${booking.id}/deliver`, {
        gallery_url: url,
        note: note.trim() || null,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      toast.add({
        title: "Delivery submitted",
        description: "Waiting for the customer to review and release payment.",
        type: "success",
      });
      onDelivered?.();
    } catch (err) {
      toast.add({
        title: "Couldn't submit delivery",
        description:
          err instanceof Error ? err.message : "Please try again.",
        type: "error",
      });
    } finally {
      setPending(false);
    }
  }

  if (canUpload) {
    return (
      <div className="space-y-3">
        <div>
          <p className="font-sans text-body font-semibold text-mk-ink">
            Submit delivery
          </p>
          <p className="mt-1 font-sans text-meta text-mk-muted">
            Share a gallery link. The customer reviews this before releasing
            payment.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="gallery-url">Gallery link</Label>
            <Input
              id="gallery-url"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={galleryUrl}
              onChange={(e) => setGalleryUrl(e.target.value)}
              className="mt-1 h-12 text-body"
            />
          </div>
          <div>
            <Label htmlFor="delivery-note">
              Note <span className="font-normal text-mk-muted">(optional)</span>
            </Label>
            <Textarea
              id="delivery-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 text-body"
              placeholder="What's included, how to download…"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="w-full"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit delivery
          </Button>
        </form>
      </div>
    );
  }

  if (delivery.galleryUrl) {
    return (
      <div className="space-y-2 rounded-lg border border-mk-border bg-white px-4 py-4">
        <p className="font-sans text-meta font-semibold text-mk-ink">Delivery</p>
        <a
          href={delivery.galleryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-mk-navy px-4 font-sans text-body font-semibold text-mk-navy hover:bg-mk-app"
        >
          Open gallery
        </a>
        {delivery.note ? (
          <p className="whitespace-pre-wrap font-sans text-meta text-mk-muted">
            {delivery.note}
          </p>
        ) : null}
        {booking.status === "completed" ? (
          <p className="font-sans text-meta text-mk-muted">
            Happy with it? Release payment below.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="font-sans text-meta font-semibold text-mk-ink">Delivery</p>
      <p className="mt-1 font-sans text-meta text-mk-muted">
        {booking.status === "completed"
          ? "The photographer marked this delivered. Review the work, then release payment — or say something's wrong."
          : "Delivery will show here once the photographer submits a gallery link."}
      </p>
    </div>
  );
}
