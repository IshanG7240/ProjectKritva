"use client";

import { useRequireAuth } from "@/hooks/use-require-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MarketingNav } from "@/components/marketing/MarketingNav";

const VENDOR_NAV_LINKS = [
  { href: "/vendor", label: "Bookings" },
  { href: "/vendor/profile", label: "Profile" },
];

interface Booking {
  id: string;
  event_date: string;
  event_type: string;
  total_amount: number;
  status: string;
}

async function fetchBookings(): Promise<Booking[]> {
  const res = await apiClient.get<Booking[]>("/v1/bookings");
  if (res.error) throw new Error(res.error.message);
  return Array.isArray(res.data) ? res.data : [];
}

async function acceptBooking(id: string): Promise<void> {
  const res = await apiClient.patch(`/v1/bookings/${id}/accept`);
  if (res.error) throw new Error(res.error.message);
}

export default function VendorDashboardPage() {
  const { user, loading } = useRequireAuth("vendor");
  const queryClient = useQueryClient();

  const {
    data: bookings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["bookings"],
    queryFn: fetchBookings,
    enabled: !loading && !!user,
  });

  const acceptMutation = useMutation({
    mutationFn: acceptBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  if (loading || !user) return null;

  const inquiries = bookings?.filter((b) => b.status === "inquiry") ?? [];
  const confirmed = bookings?.filter((b) => b.status !== "inquiry") ?? [];

  return (
    <>
      <DashboardNav user={user} badge="Vendor Control Panel" links={VENDOR_NAV_LINKS} />
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Vendor Dashboard
          </h1>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading bookings…</p>
        ) : isError ? (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
            Error loading bookings:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-foreground">Incoming Inquiries</h2>

              {inquiries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending inquiries.</p>
              ) : (
                <ul className="divide-y divide-border border border-border rounded bg-card p-4 space-y-3">
                  {inquiries.map((booking) => (
                    <li key={booking.id} className="pt-3 first:pt-0 flex items-center justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Type: {booking.event_type}</p>
                        <p className="text-xs text-muted-foreground">Date: {booking.event_date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">₹{(booking.total_amount / 100).toFixed(2)}</span>
                        <button
                          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:opacity-90 disabled:opacity-50"
                          onClick={() => acceptMutation.mutate(booking.id)}
                          disabled={acceptMutation.isPending}
                        >
                          {acceptMutation.isPending ? "Accepting…" : "Accept Booking"}
                        </button>
                      </div>
                      {acceptMutation.isError && (
                        <p className="w-full text-xs text-destructive mt-1">
                          Error: {acceptMutation.error instanceof Error ? acceptMutation.error.message : "Failed to accept"}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-medium text-foreground">Confirmed &amp; Completed Bookings</h2>

              {confirmed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No confirmed or completed bookings yet.</p>
              ) : (
                <ul className="divide-y divide-border border border-border rounded bg-card p-4 space-y-3">
                  {confirmed.map((booking) => (
                    <li key={booking.id} className="pt-3 first:pt-0 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Type: {booking.event_type}</p>
                        <p className="text-xs text-muted-foreground">Date: {booking.event_date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">₹{(booking.total_amount / 100).toFixed(2)}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium capitalize">
                          {booking.status.replace("_", " ")}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
