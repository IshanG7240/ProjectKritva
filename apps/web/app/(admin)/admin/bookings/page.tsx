"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Page, PageHeader, Section } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AdminBookingRow,
  daysHeld,
  fetchAdminBookings,
  formatAdminDate,
  formatInrFromPaisa,
} from "@/components/admin/admin-money-api";
import { getBookingStatusLabel } from "@/lib/booking-status";

const PAGE_SIZE = 50;

type FilterMode = "held" | "all" | "disputed";

function statusBadgeClass(status: string): string {
  if (status === "payment_held") return "border-transparent bg-mk-navy/10 text-mk-navy";
  if (status === "disputed") return "border-transparent bg-red-50 text-red-800";
  if (status === "completed") return "border-transparent bg-amber-50 text-amber-900";
  if (status === "payment_released")
    return "border-transparent bg-emerald-50 text-emerald-800";
  return "border-mk-border bg-white text-mk-ink";
}

function fundsLabel(row: AdminBookingRow): string {
  if (row.status === "disputed") return "Disputed";
  if (row.status === "payment_held") return "Held";
  if (row.status === "completed") return "Awaiting release";
  if (row.payment?.escrow_status === "held") return "Held";
  return getBookingStatusLabel(row.status, "customer");
}

export default function AdminBookingsPage() {
  const { user, loading } = useRequireAuth("admin");
  const [filter, setFilter] = useState<FilterMode>("held");
  const [offset, setOffset] = useState(0);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "bookings", { filter, offset }],
    queryFn: () => {
      if (filter === "held") {
        return fetchAdminBookings({ held: true, limit: PAGE_SIZE, offset });
      }
      if (filter === "disputed") {
        return fetchAdminBookings({
          status: "disputed",
          limit: PAGE_SIZE,
          offset,
        });
      }
      return fetchAdminBookings({ limit: PAGE_SIZE, offset });
    },
    enabled: !loading && !!user,
  });

  if (loading || !user) return null;

  const bookings = data?.bookings ?? [];
  const pagination = data?.pagination;
  const totalCount = pagination?.totalCount ?? bookings.length;
  const hasPrev = offset > 0;
  const hasNext =
    pagination?.hasNextPage ?? offset + bookings.length < totalCount;

  return (
    <Page width="wide">
      <PageHeader title="Held funds" />
      <p className="mb-6 text-meta text-mk-muted">
        Every booking where Kritva is holding money — or needs a decision.
      </p>

      <Section>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "held", label: "Held funds" },
              { id: "disputed", label: "Disputed" },
              { id: "all", label: "All bookings" },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.id}
              type="button"
              size="sm"
              variant={filter === opt.id ? "primary" : "secondary"}
              onClick={() => {
                setOffset(0);
                setFilter(opt.id);
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-meta text-mk-muted">Loading bookings…</p>
        ) : isError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-meta text-red-700">
            {error instanceof Error ? error.message : "Failed to load bookings"}
          </p>
        ) : bookings.length === 0 ? (
          <p className="text-meta text-mk-muted">
            {filter === "held"
              ? "No held funds right now."
              : filter === "disputed"
                ? "No disputed bookings."
                : "No bookings found."}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-mk-border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-mk-surface-2 hover:bg-mk-surface-2">
                  <TableHead className="px-3 text-label text-mk-muted">
                    Parties
                  </TableHead>
                  <TableHead className="px-3 text-label text-mk-muted">
                    Amount
                  </TableHead>
                  <TableHead className="px-3 text-label text-mk-muted">
                    Status
                  </TableHead>
                  <TableHead className="px-3 text-label text-mk-muted">
                    Event
                  </TableHead>
                  <TableHead className="px-3 text-label text-mk-muted">
                    Days held
                  </TableHead>
                  <TableHead className="px-3 text-label text-mk-muted">
                    Flags
                  </TableHead>
                  <TableHead className="px-3 text-right text-label text-mk-muted">
                    {" "}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((row) => {
                  const heldDays = daysHeld(
                    row.payment?.captured_at ?? null,
                    row.created_at,
                  );
                  const showDays =
                    row.status === "payment_held" ||
                    row.status === "completed" ||
                    row.status === "disputed";

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="px-3 py-3 whitespace-normal">
                        <p className="text-body font-medium text-mk-ink">
                          {row.vendor_business_name}
                        </p>
                        <p className="mt-0.5 text-meta text-mk-muted">
                          {row.customer_name || "Customer"}
                        </p>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-body font-medium text-mk-navy tabular-nums">
                        {formatInrFromPaisa(row.total_amount)}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className={statusBadgeClass(row.status)}
                        >
                          {fundsLabel(row)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-body text-mk-ink">
                        {formatAdminDate(row.event_date)}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-body text-mk-muted">
                        {showDays ? `${heldDays}d` : "—"}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.payment?.is_simulated ||
                          row.payment?.mode === "simulated" ? (
                            <Badge
                              variant="outline"
                              className="border-transparent bg-violet-50 text-violet-800"
                            >
                              Simulated
                            </Badge>
                          ) : null}
                          {row.vendor_is_demo ? (
                            <Badge
                              variant="outline"
                              className="border-transparent bg-slate-100 text-slate-700"
                            >
                              Demo vendor
                            </Badge>
                          ) : null}
                          {row.status === "disputed" ? (
                            <Badge
                              variant="outline"
                              className="border-transparent bg-red-50 text-red-800"
                            >
                              Needs decision
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right">
                        <Link
                          href={`/admin/bookings/${row.id}`}
                          className={buttonVariants({
                            size: "sm",
                            variant: "secondary",
                          })}
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && !isError && bookings.length > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-meta text-mk-muted">
              Showing {offset + 1}–{offset + bookings.length}
              {pagination?.totalCount != null
                ? ` of ${pagination.totalCount}`
                : ""}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!hasPrev}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!hasNext}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Section>
    </Page>
  );
}
