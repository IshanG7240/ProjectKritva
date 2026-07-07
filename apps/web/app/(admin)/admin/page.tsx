"use client";

/**
 * Admin Panel — protected route for role: admin | superadmin.
 * Displays vendors pending verification with Approve / Reject actions.
 */

import { useRequireAuth } from "@/hooks/use-require-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { AppNav } from "@/components/layout/app-nav";

// Shape of a vendor returned by GET /v1/admin/vendors/pending
interface PendingVendor {
  id: string;
  user_id: string;
  business_name: string;
  slug: string;
  category: string[];
  city_id: string;
  description: string | null;
  verification_status: string;
  verification_notes: string | null;
  created_at: string;
}

/** Fetches all vendors in pending_review state. */
async function fetchPendingVendors(): Promise<PendingVendor[]> {
  const res = await apiClient.get<{ vendors: PendingVendor[] }>(
    "/v1/admin/vendors/pending",
  );
  if (res.error) throw new Error(res.error.message);
  return res.data?.vendors ?? [];
}

/** Payload sent to PATCH /v1/admin/vendors/:id/verify. */
interface VerifyPayload {
  id: string;
  verification_status: "approved" | "rejected";
  verification_notes?: string;
}

/** Submits a verification decision for a single vendor. */
async function verifyVendor({
  id,
  verification_status,
  verification_notes,
}: VerifyPayload): Promise<void> {
  const res = await apiClient.patch(`/v1/admin/vendors/${id}/verify`, {
    verification_status,
    verification_notes,
  });
  if (res.error) throw new Error(res.error.message);
}

export default function AdminPage() {
  // Permit only admin — redirect everyone else.
  const { user, loading } = useRequireAuth("admin");
  const queryClient = useQueryClient();

  const {
    data: vendors,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "vendors", "pending"],
    queryFn: fetchPendingVendors,
    // Only run once auth resolves.
    enabled: !loading && !!user,
  });

  // Single mutation handles both approve and reject; caller supplies the status.
  const verifyMutation = useMutation({
    mutationFn: verifyVendor,
    onSuccess: () => {
      // Refresh the queue so acted-on vendors disappear.
      queryClient.invalidateQueries({ queryKey: ["admin", "vendors", "pending"] });
    },
  });

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-mk-bg">
      <AppNav />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Admin — Vendor Verification Queue
        </h1>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading pending vendors…</p>
        ) : isError ? (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
            Error: {error instanceof Error ? error.message : "Unknown error"}
          </p>
        ) : (
          <>
            {vendors && vendors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vendors pending review.</p>
            ) : (
              <ul className="divide-y divide-border border border-border rounded bg-card p-4 space-y-3">
                {vendors?.map((vendor) => (
                  <li key={vendor.id} className="pt-3 first:pt-0 flex items-center justify-between flex-wrap gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{vendor.business_name}</p>
                      <p className="text-xs text-muted-foreground">
                        City: {vendor.city_id} | Categories: {vendor.category.join(", ") || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(vendor.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:opacity-90 disabled:opacity-50"
                        onClick={() =>
                          verifyMutation.mutate({
                            id: vendor.id,
                            verification_status: "approved",
                          })
                        }
                        disabled={verifyMutation.isPending}
                      >
                        Approve Vendor
                      </button>
                      <button
                        className="px-3 py-1.5 bg-destructive text-destructive-foreground text-xs rounded hover:opacity-90 disabled:opacity-50"
                        onClick={() =>
                          verifyMutation.mutate({
                            id: vendor.id,
                            verification_status: "rejected",
                          })
                        }
                        disabled={verifyMutation.isPending}
                      >
                        Reject Vendor
                      </button>
                    </div>
                    {verifyMutation.isError && (
                      <p className="w-full text-xs text-destructive mt-1">
                        Error: {verifyMutation.error instanceof Error ? verifyMutation.error.message : "Action failed"}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
