"use client";

/**
 * Customer dashboard — protected for role: customer.
 * Shows bookings awaiting payment, handles the mock escrow checkout loop,
 * and lets the customer release escrowed funds to the vendor after the event.
 */

import { useRequireAuth } from "@/hooks/use-require-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { DashboardNav } from "@/components/layout/dashboard-nav";

// Shape of a single booking returned by GET /v1/bookings.
interface Booking {
  id: string;
  vendor_id: string;
  event_date: string;
  event_type: string;
  total_amount: number; // stored in paisa
  status: string;
}

/** Fetches all bookings belonging to the logged-in customer. */
async function fetchBookings(): Promise<Booking[]> {
  const res = await apiClient.get<Booking[]>("/v1/bookings");
  if (res.error) throw new Error(res.error.message);
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Simulates the checkout loop:
 *   1. Initiate a payment order for the booking.
 *   2. Simulate capture — moves funds into escrow.
 * Both calls must succeed for the checkout to be considered complete.
 */
async function checkout(bookingId: string): Promise<void> {
  const initRes = await apiClient.post("/v1/payments/initiate", {
    booking_id: bookingId,
  });
  if (initRes.error) throw new Error(initRes.error.message);

  const captureRes = await apiClient.post("/v1/payments/simulate-capture", {
    booking_id: bookingId,
  });
  if (captureRes.error) throw new Error(captureRes.error.message);
}

/** Releases escrowed funds to the vendor for a completed event. */
async function releaseFunds(bookingId: string): Promise<void> {
  const res = await apiClient.post("/v1/payments/release", {
    booking_id: bookingId,
  });
  if (res.error) throw new Error(res.error.message);
}

export default function CustomerDashboardPage() {
  const { user, loading } = useRequireAuth("customer");
  const queryClient = useQueryClient();

  const {
    data: bookings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["bookings"],
    queryFn: fetchBookings,
    // Only fetch once auth is resolved.
    enabled: !loading && !!user,
  });

  // One mutation instance per row is the ideal pattern (see future_updates.md),
  // but a single page-level mutation is sufficient for this mock checkout flow
  // since only one payment should be in-flight at a time.
  const payMutation = useMutation({
    mutationFn: checkout,
    onSuccess: () => {
      alert("Payment successful! Funds held in escrow.");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: releaseFunds,
    onSuccess: () => {
      alert("Funds released to vendor!");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  // useRequireAuth handles redirects; show nothing while resolving.
  if (loading || !user) return null;

  // Vendor accepted — customer must pay to move forward.
  const awaitingPayment =
    bookings?.filter((b) => b.status === "vendor_accepted") ?? [];

  // Paid and in escrow — customer confirms event completion to release funds.
  const readyToRelease =
    bookings?.filter((b) => b.status === "customer_confirmed") ?? [];

  // Fully settled — shown as historical receipts.
  const completed =
    bookings?.filter((b) => b.status === "completed") ?? [];

  return (
    <>
      {/* Top navigation with logout */}
      <DashboardNav user={user} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Your Event Bookings
        </h1>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading bookings…</p>
        ) : isError ? (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
            Error loading bookings:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        ) : (
          <>
            {/* ── Awaiting Payment ── */}
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-foreground">Awaiting Payment</h2>

              {awaitingPayment.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings awaiting payment.</p>
              ) : (
                <ul className="divide-y divide-border border border-border rounded bg-card p-4 space-y-3">
                  {awaitingPayment.map((booking) => (
                    <li key={booking.id} className="pt-3 first:pt-0 flex items-center justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Vendor ID: {booking.vendor_id}</p>
                        <p className="text-xs text-muted-foreground">Date: {booking.event_date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">₹{(booking.total_amount / 100).toFixed(2)}</span>
                        <button
                          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:opacity-90 disabled:opacity-50"
                          onClick={() => payMutation.mutate(booking.id)}
                          disabled={payMutation.isPending}
                        >
                          {payMutation.isPending ? "Processing…" : "Pay to Escrow"}
                        </button>
                      </div>
                      {payMutation.isError && (
                        <p className="w-full text-xs text-destructive mt-1">
                          Error: {payMutation.error instanceof Error ? payMutation.error.message : "Payment failed"}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ── Ready to Release ── */}
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-foreground">Ready to Release</h2>

              {readyToRelease.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings awaiting fund release.</p>
              ) : (
                <ul className="divide-y divide-border border border-border rounded bg-card p-4 space-y-3">
                  {readyToRelease.map((booking) => (
                    <li key={booking.id} className="pt-3 first:pt-0 flex items-center justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Vendor ID: {booking.vendor_id}</p>
                        <p className="text-xs text-muted-foreground">Date: {booking.event_date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">₹{(booking.total_amount / 100).toFixed(2)}</span>
                        <button
                          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:opacity-90 disabled:opacity-50"
                          onClick={() => releaseMutation.mutate(booking.id)}
                          disabled={releaseMutation.isPending}
                        >
                          {releaseMutation.isPending ? "Releasing…" : "Event Complete: Release Funds"}
                        </button>
                      </div>
                      {releaseMutation.isError && (
                        <p className="w-full text-xs text-destructive mt-1">
                          Error: {releaseMutation.error instanceof Error ? releaseMutation.error.message : "Release failed"}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ── Completed Bookings ── */}
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-foreground">Completed Bookings</h2>

              {completed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completed bookings yet.</p>
              ) : (
                <ul className="divide-y divide-border border border-border rounded bg-card p-4 space-y-3">
                  {completed.map((booking) => (
                    <li key={booking.id} className="pt-3 first:pt-0 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Vendor ID: {booking.vendor_id}</p>
                        <p className="text-xs text-muted-foreground">Date: {booking.event_date} | Type: {booking.event_type}</p>
                      </div>
                      <span className="text-sm font-medium">₹{(booking.total_amount / 100).toFixed(2)}</span>
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
