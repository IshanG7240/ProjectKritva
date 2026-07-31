"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { formatInr } from "@/lib/booking-form";
import { Page, PageHeader, Section } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
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

  const isPending = vendor?.verification_status === "pending_review";

  return (
    <Page width="wide">
      <PageHeader
        title={vendor?.business_name ?? "Vendor review"}
        back={{ href: "/admin", label: "Back to queue" }}
        actions={
          isPending ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={verifyMutation.isPending}
                onClick={() =>
                  verifyMutation.mutate({
                    id: vendorId,
                    verification_status: "approved",
                  })
                }
              >
                {verifyMutation.isPending &&
                verifyMutation.variables?.verification_status === "approved" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={verifyMutation.isPending}
                onClick={() => {
                  setRejectNotes("");
                  setRejectOpen(true);
                }}
              >
                Reject
              </Button>
            </>
          ) : null
        }
      />
      {vendor ? (
        <p className="mb-6 text-meta text-mk-muted">
          /vendors/{vendor.slug} · Submitted{" "}
          {formatSubmittedAt(vendor.submitted_at)}
        </p>
      ) : null}

      {actionError ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-meta text-red-700">
          {actionError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-meta text-mk-muted">Loading vendor…</p>
      ) : isError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-meta text-red-700">
          {error instanceof Error ? error.message : "Failed to load vendor"}
        </p>
      ) : vendor ? (
        <>
          <Section title="Profile summary">
            <div className="rounded-lg border border-mk-border bg-white p-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-label text-mk-muted">Owner email</dt>
                  <dd className="text-body text-mk-ink">
                    {vendor.owner_email ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-label text-mk-muted">City</dt>
                  <dd className="text-body text-mk-ink">{vendor.city_id}</dd>
                </div>
                <div>
                  <dt className="text-label text-mk-muted">Categories</dt>
                  <dd className="text-body text-mk-ink">
                    {vendor.category.join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-label text-mk-muted">Status</dt>
                  <dd className="text-body capitalize text-mk-ink">
                    {vendor.verification_status.replace(/_/g, " ")}
                  </dd>
                </div>
              </dl>
              {vendor.description ? (
                <div className="mt-4">
                  <p className="text-label text-mk-muted">Description</p>
                  <p className="mt-1 whitespace-pre-wrap text-body leading-relaxed text-mk-ink">
                    {vendor.description}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-meta text-mk-muted">
                  No description provided.
                </p>
              )}
              {vendor.verification_notes ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-label text-amber-900">Prior admin notes</p>
                  <p className="mt-1 text-body text-amber-950">
                    {vendor.verification_notes}
                  </p>
                </div>
              ) : null}
            </div>
          </Section>

          <Section title={`Packages (${vendor.packages.length})`}>
            <div className="rounded-lg border border-mk-border bg-white p-4">
              {vendor.packages.length === 0 ? (
                <p className="text-meta text-mk-muted">No active packages.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-body">
                    <thead>
                      <tr className="border-b border-mk-border text-left text-label text-mk-muted">
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
                          <td className="py-2 pr-4 text-mk-ink">{pkg.name}</td>
                          <td className="py-2 pr-4 text-mk-ink tabular-nums">
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
            </div>
          </Section>

          <Section title={`Portfolio (${vendor.media.length})`}>
            <div className="rounded-lg border border-mk-border bg-white p-4">
              {vendor.media.length === 0 ? (
                <p className="text-meta text-mk-muted">No portfolio media.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {vendor.media.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group overflow-hidden rounded-lg border border-mk-border bg-mk-surface-2"
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
            </div>
          </Section>
        </>
      ) : null}

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
            className="w-full rounded-md border border-mk-border px-3 py-2 text-body text-mk-ink outline-none focus:border-mk-navy"
          />
          <DialogFooter>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setRejectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={!rejectNotes.trim() || verifyMutation.isPending}
              onClick={() =>
                verifyMutation.mutate({
                  id: vendorId,
                  verification_status: "rejected",
                  verification_notes: rejectNotes.trim(),
                })
              }
            >
              {verifyMutation.isPending &&
              verifyMutation.variables?.verification_status === "rejected" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Reject with feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
