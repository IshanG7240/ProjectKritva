"use client";

import Link from "next/link";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { VendorReadinessResponse } from "@kritva/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Page, PageHeader, Section } from "@/components/layout/page";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/vendor/dashboard/dashboard-skeleton";
import { LeadCard } from "@/components/vendor/dashboard/lead-card";
import { MoneySection } from "@/components/vendor/dashboard/money-section";
import { NextJobsSection } from "@/components/vendor/dashboard/next-jobs-section";
import { ReadinessNudge } from "@/components/vendor/dashboard/readiness-nudge";
import { addDays, localDateString } from "@/components/vendor/dashboard/format";
import {
  HELD_STATUSES,
  NEXT_JOB_STATUSES,
  type VendorBooking,
} from "@/components/vendor/dashboard/types";

async function fetchBookings(): Promise<VendorBooking[]> {
  const res = await apiClient.get<VendorBooking[]>("/v1/bookings?role=vendor");
  if (res.error) throw new Error(res.error.message);
  return Array.isArray(res.data) ? res.data : [];
}

async function fetchReadiness(): Promise<VendorReadinessResponse | null> {
  const res = await apiClient.get<VendorReadinessResponse>(
    "/v1/vendors/me/readiness",
  );
  if (res.error) return null;
  return res.data ?? null;
}

function sumAmount(
  bookings: VendorBooking[],
  predicate: (b: VendorBooking) => boolean,
): number {
  return bookings.reduce(
    (sum, b) => (predicate(b) ? sum + b.total_amount : sum),
    0,
  );
}

function pickNextJobs(bookings: VendorBooking[]): VendorBooking[] {
  const today = localDateString(new Date());
  const end = localDateString(addDays(new Date(), 7));

  return bookings
    .filter(
      (b) =>
        NEXT_JOB_STATUSES.has(b.status) &&
        b.event_date >= today &&
        b.event_date <= end,
    )
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
}

export default function VendorDashboardPage() {
  const { user, loading } = useRequireAuth("vendor");

  const {
    data: bookings,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["bookings", "vendor"],
    queryFn: fetchBookings,
    enabled: !loading && !!user,
  });

  const { data: readiness } = useQuery({
    queryKey: ["vendor-readiness"],
    queryFn: fetchReadiness,
    enabled: !loading && !!user,
    retry: false,
  });

  if (loading || !user) return null;

  const list = bookings ?? [];
  const newEnquiries = list.filter((b) => b.status === "inquiry");
  const heldPaisa = sumAmount(list, (b) => HELD_STATUSES.has(b.status));
  const releasedPaisa = sumAmount(list, (b) => b.status === "payment_released");
  const awaitingPaisa = sumAmount(list, (b) => b.status === "inquiry");
  const nextJobs = pickNextJobs(list);
  const showReadiness = readiness != null && readiness.complete === false;

  return (
    <Page width="wide">
      <PageHeader
        title="Your work"
        actions={
          <>
            <Link
              href="/vendor/payouts"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              Payouts
            </Link>
            <Link
              href="/vendor/calendar"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              Calendar
            </Link>
          </>
        }
      />

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <Card className="border-danger/30 bg-danger-bg p-5">
          <p className="text-subhead text-danger-fg">
            Couldn&apos;t load your bookings
          </p>
          <p className="mt-1 text-body text-danger-fg/80">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button
            type="button"
            variant="primary"
            className="mt-3"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          <MoneySection
            heldPaisa={heldPaisa}
            releasedPaisa={releasedPaisa}
            awaitingPaisa={awaitingPaisa}
          />

          <Section
            title={
              <>
                New enquiries
                {newEnquiries.length > 0 ? (
                  <span className="ml-1.5 text-meta font-medium text-mk-muted">
                    ({newEnquiries.length})
                  </span>
                ) : null}
              </>
            }
          >
            {newEnquiries.length === 0 ? (
              <>
                <p className="text-body text-mk-muted">No new enquiries.</p>
                {showReadiness && readiness ? (
                  <ReadinessNudge readiness={readiness} />
                ) : null}
              </>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-mk-border bg-white">
                {newEnquiries.map((booking) => (
                  <LeadCard key={booking.id} booking={booking} />
                ))}
              </ul>
            )}
          </Section>

          <Section title="Next 7 days">
            <NextJobsSection jobs={nextJobs} />
          </Section>

          {showReadiness && readiness && newEnquiries.length > 0 ? (
            <ReadinessNudge readiness={readiness} />
          ) : null}
        </div>
      )}
    </Page>
  );
}
