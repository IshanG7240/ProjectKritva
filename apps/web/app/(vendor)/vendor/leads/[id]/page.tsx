"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/api-client";
import { formatEventDate, formatInr, buildLoginUrl } from "@/lib/booking-form";
import { computeVendorPayout, getBookingStatusLabel } from "@/lib/booking-status";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Page, PageHeader } from "@/components/layout/page";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { CalendarVerdict } from "@/components/vendor/leads/calendar-verdict";
import { LeadActions } from "@/components/vendor/leads/lead-actions";
import { LeadDetails } from "@/components/vendor/leads/lead-details";
import {
  formatCityLabel,
  formatEventType,
  type AvailabilityDate,
  type LeadBooking,
} from "@/components/vendor/leads/lead-types";

async function fetchLead(id: string): Promise<LeadBooking> {
  const res = await apiClient.get<{ booking: LeadBooking }>(
    `/v1/bookings/${id}`,
  );
  if (res.error) throw new Error(res.error.message);
  if (!res.data?.booking) throw new Error("Booking not found.");
  return res.data.booking;
}

async function fetchAvailability(): Promise<AvailabilityDate[]> {
  const res = await apiClient.get<{ dates: AvailabilityDate[] }>(
    "/v1/vendors/me/availability",
  );
  if (res.error) throw new Error(res.error.message);
  return res.data?.dates ?? [];
}

async function fetchBankPresent(): Promise<boolean> {
  const res = await apiClient.get<{ bank_account: unknown | null }>(
    "/v1/payments/bank-accounts",
  );
  if (res.error) return false;
  return res.data?.bank_account != null;
}

async function acceptBooking(id: string): Promise<void> {
  const res = await apiClient.patch(`/v1/bookings/${id}/accept`);
  if (res.error) throw new Error(res.error.message);
}

async function declineBooking(
  id: string,
  decline_reason: string,
): Promise<void> {
  const res = await apiClient.patch(`/v1/bookings/${id}/decline`, {
    decline_reason,
  });
  if (res.error) throw new Error(res.error.message);
}

async function counterBooking(
  id: string,
  counter_amount: number,
  counter_message: string | null,
): Promise<void> {
  const res = await apiClient.patch(`/v1/bookings/${id}/counter`, {
    counter_amount,
    counter_message,
  });
  if (res.error) throw new Error(res.error.message);
}

type SessionState = "checking" | "signed_in" | "signed_out";

function SignInPrompt({ id }: { id: string }) {
  const returnTo = `/vendor/leads/${id}`;
  return (
    <Page width="task">
      <PageHeader title="This enquiry is private" back={{ href: "/vendor", label: "All enquiries" }} />
      <Card className="p-5">
        <p className="text-body text-mk-ink">
          Sign in to see the date, amount and brief for this enquiry, then
          accept, suggest a price, or decline.
        </p>
        <p className="mt-2 text-meta text-mk-muted">
          Money is only released after the job is done — we&apos;ll show
          exactly what you&apos;ll be paid before you accept.
        </p>
        <Link
          href={buildLoginUrl(returnTo)}
          className={cn(
            buttonVariants({ variant: "primary", size: "lg" }),
            "mt-4 w-full",
          )}
        >
          Sign in to see this enquiry
        </Link>
      </Card>
    </Page>
  );
}

export default function VendorLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [sessionState, setSessionState] = useState<SessionState>("checking");

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSessionState(data.session ? "signed_in" : "signed_out");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setSessionState(session ? "signed_in" : "signed_out");
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (sessionState === "checking") {
    return (
      <Page width="task">
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Page>
    );
  }

  if (sessionState === "signed_out") return <SignInPrompt id={id} />;

  return <VendorLeadAuthed id={id} />;
}

function VendorLeadAuthed({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading } = useRequireAuth("vendor");

  const leadQuery = useQuery({
    queryKey: ["booking", id],
    queryFn: () => fetchLead(id),
    enabled: !loading && !!user,
  });

  const availabilityQuery = useQuery({
    queryKey: ["vendor-availability"],
    queryFn: fetchAvailability,
    enabled: !loading && !!user,
  });

  const bankQuery = useQuery({
    queryKey: ["vendor-bank-account"],
    queryFn: fetchBankPresent,
    enabled: !loading && !!user,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["booking", id] });
    queryClient.invalidateQueries({ queryKey: ["bookings", "vendor"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-availability"] });
  };

  const acceptMutation = useMutation({
    mutationFn: () => acceptBooking(id),
    onSuccess: () => {
      toast.add({
        title: "Accepted",
        description: "Waiting for the customer to pay.",
        type: "success",
      });
      invalidate();
      router.replace("/vendor");
    },
    onError: (err) =>
      toast.add({
        title: "Couldn't accept",
        description: err instanceof Error ? err.message : "Please try again.",
        type: "error",
      }),
  });

  const declineMutation = useMutation({
    mutationFn: (reason: string) => declineBooking(id, reason),
    onSuccess: () => {
      toast.add({ title: "Declined", type: "info" });
      invalidate();
      router.replace("/vendor");
    },
    onError: (err) =>
      toast.add({
        title: "Couldn't decline",
        description: err instanceof Error ? err.message : "Please try again.",
        type: "error",
      }),
  });

  const counterMutation = useMutation({
    mutationFn: ({
      amount,
      message,
    }: {
      amount: number;
      message: string | null;
    }) => counterBooking(id, amount, message),
    onSuccess: () => {
      toast.add({
        title: "Suggestion sent",
        description: "Waiting for the customer to reply.",
        type: "success",
      });
      invalidate();
      router.replace("/vendor");
    },
    onError: (err) =>
      toast.add({
        title: "Couldn't send suggestion",
        description:
          err instanceof Error ? err.message : "Please try again.",
        type: "error",
      }),
  });

  if (loading || !user) return null;

  const booking = leadQuery.data;
  const payout = booking
    ? computeVendorPayout(booking.total_amount, booking.commission_bps)
    : null;

  return (
    <Page width="task">
      <PageHeader
        title="Enquiry"
        back={{ href: "/vendor", label: "All enquiries" }}
      />

      {leadQuery.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : leadQuery.isError || !booking || !payout ? (
        <Card className="p-5">
          <p className="text-body text-mk-ink">
            {leadQuery.error instanceof Error
              ? leadQuery.error.message
              : "Couldn't load this enquiry."}
          </p>
          <Link
            href="/vendor"
            className={cn(buttonVariants({ variant: "secondary" }), "mt-3")}
          >
            Back to dashboard
          </Link>
        </Card>
      ) : (
        <div className="space-y-5">
          <p className="text-meta text-mk-muted">
            <span className="tabular-nums">
              {formatEventDate(booking.event_date)}
            </span>
            <span className="mx-1.5 text-mk-border">·</span>
            {formatCityLabel(booking.city_id)}
            <span className="mx-1.5 text-mk-border">·</span>
            {formatEventType(booking.event_type)}
          </p>

          <div>
            <p className="text-money-lg tabular-nums text-mk-ink">
              <span className="text-mk-muted">
                {formatInr(booking.total_amount)}
              </span>
              <span className="mx-1 text-mk-muted">→</span>
              <span className="font-semibold text-mk-navy">
                {formatInr(payout.vendorPayout)}
              </span>
              <span className="ml-2 align-middle text-body font-medium text-mk-muted">
                to you
              </span>
            </p>
            <p className="mt-1 text-meta text-mk-muted">
              Kritva fee {formatInr(payout.platformFee)}
            </p>
          </div>

          <CalendarVerdict
            eventDate={booking.event_date}
            dates={availabilityQuery.data}
            isLoading={availabilityQuery.isLoading}
          />

          {booking.status === "inquiry" ? (
            <LeadActions
              booking={booking}
              bankMissing={bankQuery.data === false}
              isAccepting={acceptMutation.isPending}
              isDeclining={declineMutation.isPending}
              isCountering={counterMutation.isPending}
              onAccept={() => acceptMutation.mutate()}
              onDecline={(reason) => declineMutation.mutate(reason)}
              onCounter={(amount, message) =>
                counterMutation.mutate({ amount, message })
              }
            />
          ) : (
            <Card className="p-4">
              <p className="text-body font-medium text-mk-ink">
                {getBookingStatusLabel(booking.status, "vendor")}
              </p>
              <Link
                href={`/bookings/${booking.id}`}
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "mt-3",
                )}
              >
                Open booking
              </Link>
            </Card>
          )}

          <LeadDetails booking={booking} />
        </div>
      )}
    </Page>
  );
}
