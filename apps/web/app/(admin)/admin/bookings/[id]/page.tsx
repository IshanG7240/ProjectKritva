"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Page, PageHeader, Section } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type AdminBookingRow,
  bpsToPercentString,
  daysHeld,
  fetchAdminBookings,
  formatAdminDate,
  formatAdminDateTime,
  formatInrFromPaisa,
} from "@/components/admin/admin-money-api";
import { getBookingStatusLabel } from "@/lib/booking-status";

async function findAdminBooking(id: string): Promise<AdminBookingRow | null> {
  const attempts = [
    () => fetchAdminBookings({ held: true, limit: 100 }),
    () => fetchAdminBookings({ status: "disputed", limit: 100 }),
    () => fetchAdminBookings({ limit: 100 }),
  ];

  for (const attempt of attempts) {
    const result = await attempt();
    const found = result.bookings.find((row) => row.id === id);
    if (found) return found;
  }
  return null;
}

export default function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading } = useRequireAuth("admin");

  const {
    data: booking,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "bookings", id],
    queryFn: () => findAdminBooking(id),
    enabled: !loading && !!user && !!id,
  });

  if (loading || !user) return null;

  return (
    <Page width="task">
      <PageHeader
        title="Booking detail"
        back={{ href: "/admin/bookings", label: "Held funds" }}
      />

      <Section>
        {isLoading ? (
          <p className="text-meta text-mk-muted">Loading booking…</p>
        ) : isError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-meta text-red-700">
            {error instanceof Error ? error.message : "Failed to load booking"}
          </p>
        ) : !booking ? (
          <p className="text-meta text-mk-muted">
            Booking not found in the recent admin list. ID: {id}
          </p>
        ) : (
          <div className="space-y-4 rounded-lg border border-mk-border bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-money text-mk-ink tabular-nums">
                  {formatInrFromPaisa(booking.total_amount)}
                </p>
                <p className="mt-1 text-meta text-mk-muted">
                  {getBookingStatusLabel(booking.status, "customer")}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {booking.payment?.is_simulated ||
                booking.payment?.mode === "simulated" ? (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-violet-50 text-violet-800"
                  >
                    Simulated
                  </Badge>
                ) : null}
                {booking.vendor_is_demo ? (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-slate-100 text-slate-700"
                  >
                    Demo vendor
                  </Badge>
                ) : null}
                {booking.status === "disputed" ? (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-red-50 text-red-800"
                  >
                    Disputed
                  </Badge>
                ) : null}
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-label text-mk-muted">Vendor</dt>
                <dd className="text-body text-mk-ink">
                  {booking.vendor_business_name}
                </dd>
              </div>
              <div>
                <dt className="text-label text-mk-muted">Customer</dt>
                <dd className="text-body text-mk-ink">
                  {booking.customer_name || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-label text-mk-muted">Event date</dt>
                <dd className="text-body text-mk-ink">
                  {formatAdminDate(booking.event_date)}
                </dd>
              </div>
              <div>
                <dt className="text-label text-mk-muted">Days held</dt>
                <dd className="text-body text-mk-ink">
                  {daysHeld(
                    booking.payment?.captured_at ?? null,
                    booking.created_at,
                  )}
                  d
                </dd>
              </div>
              <div>
                <dt className="text-label text-mk-muted">Commission</dt>
                <dd className="text-body text-mk-ink">
                  {booking.commission_bps != null
                    ? `${bpsToPercentString(booking.commission_bps)}%`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-label text-mk-muted">Payment captured</dt>
                <dd className="text-body text-mk-ink">
                  {formatAdminDateTime(booking.payment?.captured_at)}
                </dd>
              </div>
              <div>
                <dt className="text-label text-mk-muted">Escrow</dt>
                <dd className="text-body text-mk-ink">
                  {booking.payment?.escrow_status || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-label text-mk-muted">Gateway payment</dt>
                <dd className="break-all text-body text-mk-ink">
                  {booking.payment?.gateway_payment_id || "—"}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2 border-t border-mk-border pt-4">
              <Button type="button" size="sm" disabled title="Not available yet">
                Release
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled
                title="Not available yet"
              >
                Refund
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled
                title="Not available yet"
              >
                Split
              </Button>
              <p className="w-full text-meta text-mk-muted">
                Release / Refund / Split need the admin money actions API — stubs
                for now.
              </p>
            </div>
          </div>
        )}
      </Section>
    </Page>
  );
}
