"use client";

import Link from "next/link";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useQuery } from "@tanstack/react-query";
import { AppNav } from "@/components/layout/app-nav";
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
    <div className="min-h-screen bg-mk-bg">
      <AppNav />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="font-sans text-xl font-semibold text-mk-ink">
            Vendor verification queue
          </h1>
          <p className="mt-1 font-sans text-sm text-mk-muted">
            Review submitted profiles before they go live on the marketplace.
          </p>
        </div>

        {isLoading ? (
          <p className="font-sans text-sm text-mk-muted">
            Loading pending vendors…
          </p>
        ) : isError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load queue"}
          </p>
        ) : vendors && vendors.length === 0 ? (
          <p className="font-sans text-sm text-mk-muted">
            No vendors pending review.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-mk-border bg-white">
            <div className="hidden gap-4 border-b border-mk-border bg-[#FDFBF7] px-4 py-3 text-xs font-medium uppercase tracking-wide text-mk-muted sm:grid sm:grid-cols-[1.4fr_0.9fr_0.5fr_0.5fr_0.8fr_0.5fr]">
              <span>Business</span>
              <span>Category</span>
              <span>Packages</span>
              <span>Portfolio</span>
              <span>Submitted</span>
              <span />
            </div>
            <ul className="divide-y divide-mk-border">
              {vendors?.map((vendor) => (
                <li
                  key={vendor.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:grid sm:grid-cols-[1.4fr_0.9fr_0.5fr_0.5fr_0.8fr_0.5fr] sm:items-center sm:gap-4"
                >
                  <div>
                    <p className="font-sans text-sm font-semibold text-mk-ink">
                      {vendor.business_name}
                    </p>
                    <p className="mt-0.5 font-sans text-xs text-mk-muted">
                      {vendor.city_id}
                    </p>
                  </div>
                  <p className="font-sans text-sm text-mk-ink">
                    {vendor.category.join(", ") || "—"}
                  </p>
                  <p className="font-sans text-sm text-mk-ink">
                    {vendor.package_count}
                  </p>
                  <p className="font-sans text-sm text-mk-ink">
                    {vendor.portfolio_media_count}
                  </p>
                  <p className="font-sans text-sm text-mk-muted">
                    {formatSubmittedAt(vendor.submitted_at)}
                  </p>
                  <div className="sm:text-right">
                    <Link
                      href={`/admin/vendors/${vendor.id}`}
                      className="inline-flex h-8 items-center rounded-md border border-mk-border bg-white px-3 font-sans text-sm font-medium text-mk-navy hover:bg-[#FDFBF7]"
                    >
                      Review
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
