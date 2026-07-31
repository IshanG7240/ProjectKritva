"use client";

import { use, useState } from "react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  checkoutBookingPayment,
  PaymentCancelledError,
  SimulatedCheckoutRedirectError,
} from "@/lib/razorpay-checkout";
import {
  formatEventDate,
  formatPackageSummary,
} from "@/lib/booking-form";
import { formatEventTypeLabel } from "@/lib/booking-status";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Page, PageHeader } from "@/components/layout/page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBanner } from "@/components/booking/status-banner";
import { MoneyCard } from "@/components/booking/money-card";
import { NegotiationBlock } from "@/components/booking/negotiation-block";
import { ContactBlock } from "@/components/booking/contact-block";
import { DeliveryProof } from "@/components/booking/delivery-proof";
import { DisputeDialog } from "@/components/booking/dispute-dialog";
import { CustomerActions } from "@/components/booking/customer-actions";
import { VendorActions } from "@/components/booking/vendor-actions";
import { BookingTimeline } from "@/components/booking/timeline";
import type { BookingDetail } from "@/components/booking/types";

interface BookingDetailResponse {
  booking: BookingDetail;
}

async function fetchBooking(id: string): Promise<BookingDetail> {
  const res = await apiClient.get<BookingDetailResponse>(`/v1/bookings/${id}`);
  if (res.error) throw new Error(res.error.message);
  if (!res.data?.booking) throw new Error("Booking not found");
  return res.data.booking;
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading } = useRequireAuth(["customer", "vendor"]);
  const queryClient = useQueryClient();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [declineCounterOpen, setDeclineCounterOpen] = useState(false);

  const {
    data: booking,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => fetchBooking(id),
    enabled: !loading && !!user,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["booking", id] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`/v1/bookings/${id}/accept`);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      toast.add({
        title: "Enquiry accepted",
        description: "Waiting for the customer to pay.",
        type: "success",
      });
      invalidate();
    },
    onError: (err) =>
      toast.add({
        title: "Couldn't accept",
        description: err instanceof Error ? err.message : "Action failed",
        type: "error",
      }),
  });

  const declineMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiClient.patch(`/v1/bookings/${id}/decline`, {
        decline_reason: reason,
      });
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      toast.add({ title: "Enquiry declined", type: "info" });
      invalidate();
    },
    onError: (err) =>
      toast.add({
        title: "Couldn't decline",
        description: err instanceof Error ? err.message : "Action failed",
        type: "error",
      }),
  });

  const counterMutation = useMutation({
    mutationFn: async ({
      counter_amount,
      counter_message,
    }: {
      counter_amount: number;
      counter_message: string | null;
    }) => {
      const res = await apiClient.patch(`/v1/bookings/${id}/counter`, {
        counter_amount,
        counter_message,
      });
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      toast.add({
        title: "Suggested price sent",
        description: "Waiting for the customer to reply.",
        type: "success",
      });
      invalidate();
    },
    onError: (err) =>
      toast.add({
        title: "Couldn't send suggestion",
        description: err instanceof Error ? err.message : "Action failed",
        type: "error",
      }),
  });

  const acceptCounterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`/v1/bookings/${id}/accept-counter`);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      toast.add({
        title: "Price accepted",
        description: "Pay to confirm the booking.",
        type: "success",
      });
      invalidate();
    },
    onError: (err) =>
      toast.add({
        title: "Couldn't accept",
        description: err instanceof Error ? err.message : "Action failed",
        type: "error",
      }),
  });

  const declineCounterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`/v1/bookings/${id}/cancel`, {});
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      setDeclineCounterOpen(false);
      toast.add({
        title: "Suggested price declined",
        description: "This booking was cancelled.",
        type: "info",
      });
      invalidate();
    },
    onError: (err) =>
      toast.add({
        title: "Couldn't decline",
        description: err instanceof Error ? err.message : "Action failed",
        type: "error",
      }),
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      await checkoutBookingPayment(id);
    },
    onSuccess: () => {
      toast.add({
        title: "Payment successful",
        description: "Funds are held safely until the job is done.",
        type: "success",
      });
      invalidate();
    },
    onError: (err) => {
      if (
        err instanceof PaymentCancelledError ||
        err instanceof SimulatedCheckoutRedirectError
      ) {
        return;
      }
      toast.add({
        title: "Payment failed",
        description:
          err instanceof Error ? err.message : "Could not complete payment",
        type: "error",
      });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/v1/payments/release", {
        booking_id: id,
      });
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      toast.add({
        title: "Payment released",
        description: "Funds have been released to the photographer.",
        type: "success",
      });
      invalidate();
    },
    onError: (err) =>
      toast.add({
        title: "Couldn't release",
        description: err instanceof Error ? err.message : "Release failed",
        type: "error",
      }),
  });

  if (loading || !user) return null;

  const isCustomer = booking
    ? booking.customer_id === user.id
    : user.role === "customer";
  const role = isCustomer ? "customer" : "vendor";
  const backHref = isCustomer ? "/dashboard" : "/vendor";
  const backLabel = isCustomer ? "Your bookings" : "Your work";

  if (isLoading) {
    return (
      <Page width="task">
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Page>
    );
  }

  if (isError || !booking) {
    return (
      <Page width="task">
        <PageHeader
          title="Booking"
          back={{ href: backHref, label: backLabel }}
        />
        <p className="text-body text-mk-ink">
          {error instanceof Error ? error.message : "Failed to load booking"}
        </p>
      </Page>
    );
  }

  return (
    <Page width="task">
      <PageHeader
        title={`${formatEventTypeLabel(booking.event_type)} · ${formatEventDate(booking.event_date)}`}
        back={{ href: backHref, label: backLabel }}
      />
      <p className="-mt-4 mb-6 text-meta text-mk-muted">
        {isCustomer
          ? `With ${booking.vendor_business_name}`
          : `From ${booking.customer_display_name}`}
      </p>

      <div className="space-y-6">
        {/* 1. Status */}
        <StatusBanner
          status={booking.status}
          role={role}
          updatedAt={booking.updated_at}
        />

        {/* 2. Money */}
        <MoneyCard booking={booking} role={role} />

        {/* 3. Primary action — above the fold */}
        <div>
          {isCustomer ? (
            <CustomerActions
              booking={booking}
              onPay={() => payMutation.mutate()}
              onRelease={() => releaseMutation.mutate()}
              onDispute={() => setDisputeOpen(true)}
              isPaying={payMutation.isPending}
              isReleasing={releaseMutation.isPending}
            />
          ) : (
            <VendorActions
              booking={booking}
              onAccept={() => acceptMutation.mutate()}
              onDecline={(reason) => declineMutation.mutate(reason)}
              onCounter={(counter_amount, counter_message) =>
                counterMutation.mutate({ counter_amount, counter_message })
              }
              onDelivered={invalidate}
              isAccepting={acceptMutation.isPending}
              isDeclining={declineMutation.isPending}
              isCountering={counterMutation.isPending}
            />
          )}
        </div>

        <NegotiationBlock
          booking={booking}
          isCustomer={isCustomer}
          onAccept={() => acceptCounterMutation.mutate()}
          onDecline={() => setDeclineCounterOpen(true)}
          isAccepting={acceptCounterMutation.isPending}
          isDeclining={declineCounterMutation.isPending}
        />

        {/* 4. Contact — only at payment_held or later */}
        <ContactBlock booking={booking} isCustomer={isCustomer} />

        {/* 5. Delivery proof — customer view (vendor's is inside VendorActions) */}
        {isCustomer ? (
          <DeliveryProof booking={booking} isVendor={false} />
        ) : null}

        {/* 6. Details */}
        <section className="border-t border-mk-border pt-5">
          <h2 className="text-subhead text-mk-ink">Details</h2>
          <p className="mt-2 text-body text-mk-ink">
            {formatPackageSummary(booking.package_details)}
          </p>
          {booking.notes?.trim() ? (
            <p className="mt-3 whitespace-pre-wrap text-body text-mk-ink">
              {booking.notes.trim()}
            </p>
          ) : null}
          {booking.decline_reason?.trim() ? (
            <p className="mt-2 text-body text-mk-muted">
              Declined: {booking.decline_reason.trim()}
            </p>
          ) : null}
        </section>

        {/* 7. Timeline */}
        <BookingTimeline events={booking.booking_events} />
      </div>

      {isCustomer ? (
        <DisputeDialog
          bookingId={booking.id}
          open={disputeOpen}
          onOpenChange={setDisputeOpen}
          onSubmitted={invalidate}
        />
      ) : null}

      <Dialog open={declineCounterOpen} onOpenChange={setDeclineCounterOpen}>
        <DialogContent className="border-mk-border bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-mk-ink">
              Decline suggested price?
            </DialogTitle>
            <DialogDescription className="text-mk-muted">
              This will cancel the booking. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-mk-border bg-mk-app">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeclineCounterOpen(false)}
            >
              Keep reviewing
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={declineCounterMutation.isPending}
              onClick={() => declineCounterMutation.mutate()}
            >
              {declineCounterMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Decline offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
