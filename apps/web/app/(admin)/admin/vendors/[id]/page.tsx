"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { AppNav } from "@/components/layout/app-nav";
import { formatInr } from "@/lib/booking-form";
import {
  fetchAdminVendorDetail,
  formatSubmittedAt,
  verifyVendor,
} from "@/lib/admin-vendors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatUnit(unit: string): string {
  return unit.replace(/_/g, " ");
}

export default function AdminVendorReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading } = useRequireAuth("admin");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  const { id: vendorId } = use(params);

  const {
    data: vendor,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "vendors", vendorId],
    queryFn: () => fetchAdminVendorDetail(vendorId),
    enabled: !loading && !!user && !!vendorId,
  });

  const verifyMutation = useMutation({
    mutationFn: verifyVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors", "pending"] });
      queryClient.removeQueries({ queryKey: ["admin", "vendors", vendorId] });
      router.push("/admin");
    },
  });

  if (loading || !user) return null;

  const actionError =
    verifyMutation.isError && verifyMutation.error instanceof Error
      ? verifyMutation.error.message
      : null;

  return (
    <div className="min-h-screen bg-mk-bg">
      <AppNav />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/admin"
              className="font-sans text-sm text-mk-muted hover:text-mk-navy"
            >
              ← Back to queue
            </Link>
            <h1 className="mt-2 font-sans text-xl font-semibold text-mk-ink">
              {vendor?.business_name ?? "Vendor review"}
            </h1>
            {vendor ? (
              <p className="mt-1 font-sans text-sm text-mk-muted">
                /vendors/{vendor.slug} · Submitted{" "}
                {formatSubmittedAt(vendor.submitted_at)}
              </p>
            ) : null}
          </div>

          {vendor?.verification_status === "pending_review" ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={verifyMutation.isPending}
                onClick={() =>
                  verifyMutation.mutate({
                    id: vendorId,
                    verification_status: "approved",
                  })
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-mk-navy px-4 font-sans text-sm font-medium text-white hover:bg-[#162C47] disabled:opacity-50"
              >
                {verifyMutation.isPending &&
                verifyMutation.variables?.verification_status === "approved" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Approve
              </button>
              <button
                type="button"
                disabled={verifyMutation.isPending}
                onClick={() => {
                  setRejectNotes("");
                  setRejectOpen(true);
                }}
                className="inline-flex h-9 items-center rounded-md border border-red-200 bg-red-50 px-4 font-sans text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          ) : null}
        </div>

        {actionError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
            {actionError}
          </p>
        ) : null}

        {isLoading ? (
          <p className="font-sans text-sm text-mk-muted">Loading vendor…</p>
        ) : isError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load vendor"}
          </p>
        ) : vendor ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-mk-border bg-white p-4">
              <h2 className="font-sans text-sm font-semibold text-mk-ink">
                Profile summary
              </h2>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="font-sans text-xs text-mk-muted">Owner email</dt>
                  <dd className="font-sans text-sm text-mk-ink">
                    {vendor.owner_email ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-sans text-xs text-mk-muted">City</dt>
                  <dd className="font-sans text-sm text-mk-ink">
                    {vendor.city_id}
                  </dd>
                </div>
                <div>
                  <dt className="font-sans text-xs text-mk-muted">Categories</dt>
                  <dd className="font-sans text-sm text-mk-ink">
                    {vendor.category.join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-sans text-xs text-mk-muted">Status</dt>
                  <dd className="font-sans text-sm capitalize text-mk-ink">
                    {vendor.verification_status.replace(/_/g, " ")}
                  </dd>
                </div>
              </dl>
              {vendor.description ? (
                <div className="mt-4">
                  <p className="font-sans text-xs text-mk-muted">Description</p>
                  <p className="mt-1 whitespace-pre-wrap font-sans text-sm leading-relaxed text-mk-ink">
                    {vendor.description}
                  </p>
                </div>
              ) : (
                <p className="mt-4 font-sans text-sm text-mk-muted">
                  No description provided.
                </p>
              )}
              {vendor.verification_notes ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="font-sans text-xs font-medium text-amber-900">
                    Prior admin notes
                  </p>
                  <p className="mt-1 font-sans text-sm text-amber-950">
                    {vendor.verification_notes}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-mk-border bg-white p-4">
              <h2 className="font-sans text-sm font-semibold text-mk-ink">
                Packages ({vendor.packages.length})
              </h2>
              {vendor.packages.length === 0 ? (
                <p className="mt-2 font-sans text-sm text-mk-muted">
                  No active packages.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full font-sans text-sm">
                    <thead>
                      <tr className="border-b border-mk-border text-left text-xs text-mk-muted">
                        <th className="pb-2 pr-4 font-medium">Name</th>
                        <th className="pb-2 pr-4 font-medium">Price</th>
                        <th className="pb-2 font-medium">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendor.packages.map((pkg) => (
                        <tr
                          key={pkg.id}
                          className="border-b border-mk-border/60 last:border-0"
                        >
                          <td className="py-2 pr-4 text-mk-ink">
                            {pkg.name}
                          </td>
                          <td className="py-2 pr-4 text-mk-ink">
                            {formatInr(pkg.price)}
                          </td>
                          <td className="py-2 capitalize text-mk-muted">
                            {formatUnit(pkg.unit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-mk-border bg-white p-4">
              <h2 className="font-sans text-sm font-semibold text-mk-ink">
                Portfolio ({vendor.media.length})
              </h2>
              {vendor.media.length === 0 ? (
                <p className="mt-2 font-sans text-sm text-mk-muted">
                  No portfolio media.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {vendor.media.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group overflow-hidden rounded-lg border border-mk-border bg-[#FDFBF7]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnail_url ?? item.url}
                        alt=""
                        className="aspect-[4/3] w-full object-cover transition group-hover:opacity-90"
                      />
                    </a>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject vendor</DialogTitle>
            <DialogDescription>
              Explain what the vendor needs to fix before they can re-submit.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={4}
            placeholder="Required feedback for the vendor…"
            className="w-full rounded-md border border-mk-border px-3 py-2 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="inline-flex h-9 items-center rounded-md border border-mk-border px-3 font-sans text-sm text-mk-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                !rejectNotes.trim() ||
                verifyMutation.isPending
              }
              onClick={() =>
                verifyMutation.mutate({
                  id: vendorId,
                  verification_status: "rejected",
                  verification_notes: rejectNotes.trim(),
                })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-red-600 px-3 font-sans text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {verifyMutation.isPending &&
              verifyMutation.variables?.verification_status === "rejected" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Reject with feedback
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
