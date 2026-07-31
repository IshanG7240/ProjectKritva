"use client";

import Link from "next/link";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useQuery } from "@tanstack/react-query";
import { Page, PageHeader, Section } from "@/components/layout/page";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPendingVendors,
  formatSubmittedAt,
} from "@/lib/admin-vendors";

export default function AdminPage() {
  const { user, loading } = useRequireAuth("admin");

  const {
    data: vendors,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "vendors", "pending"],
    queryFn: fetchPendingVendors,
    enabled: !loading && !!user,
  });

  if (loading || !user) return null;

  return (
    <Page width="wide">
      <PageHeader title="Vendor verification queue" />
      <p className="mb-6 text-meta text-mk-muted">
        Review submitted profiles before they go live on the marketplace.
      </p>

      <Section>
        {isLoading ? (
          <p className="text-meta text-mk-muted">Loading pending vendors…</p>
        ) : isError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-meta text-red-700">
            {error instanceof Error ? error.message : "Failed to load queue"}
          </p>
        ) : vendors && vendors.length === 0 ? (
          <p className="text-meta text-mk-muted">
            No vendors pending review.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-mk-border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-mk-surface-2 hover:bg-mk-surface-2">
                  <TableHead className="px-3 text-label text-mk-muted">
                    Business
                  </TableHead>
                  <TableHead className="px-3 text-label text-mk-muted">
                    Category
                  </TableHead>
                  <TableHead className="px-3 text-label text-mk-muted">
                    Packages
                  </TableHead>
                  <TableHead className="px-3 text-label text-mk-muted">
                    Portfolio
                  </TableHead>
                  <TableHead className="px-3 text-label text-mk-muted">
                    Submitted
                  </TableHead>
                  <TableHead className="px-3 text-right text-label text-mk-muted">
                    {" "}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors?.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="px-3 py-3 whitespace-normal">
                      <p className="text-body font-semibold text-mk-ink">
                        {vendor.business_name}
                      </p>
                      <p className="mt-0.5 text-meta text-mk-muted">
                        {vendor.city_id}
                      </p>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-body text-mk-ink">
                      {vendor.category.join(", ") || "—"}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-body text-mk-ink">
                      {vendor.package_count}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-body text-mk-ink">
                      {vendor.portfolio_media_count}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-meta text-mk-muted">
                      {formatSubmittedAt(vendor.submitted_at)}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <Link
                        href={`/admin/vendors/${vendor.id}`}
                        className={buttonVariants({
                          size: "sm",
                          variant: "secondary",
                        })}
                      >
                        Review
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </Page>
  );
}
