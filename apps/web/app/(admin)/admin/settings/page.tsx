"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Page, PageHeader, Section } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AdminCategorySetting,
  EXAMPLE_BOOKING_PAISA,
  bpsToPercentString,
  categoryLabel,
  computeCommissionSplit,
  contractTypeLabel,
  fetchAdminSettings,
  formatAdminDateTime,
  formatInrFromPaisa,
  percentStringToBps,
  updateCategoryCommission,
} from "@/components/admin/admin-money-api";

function CommissionWorkedExample({ bps }: { bps: number }) {
  const { platformFee, vendorKeep } = computeCommissionSplit(
    EXAMPLE_BOOKING_PAISA,
    bps,
  );
  return (
    <p className="font-sans text-label text-mk-muted">
      On a {formatInrFromPaisa(EXAMPLE_BOOKING_PAISA)} booking: Kritva{" "}
      {formatInrFromPaisa(platformFee)}, vendor keeps{" "}
      {formatInrFromPaisa(vendorKeep)}
    </p>
  );
}

function CategoryCommissionRow({
  category,
  canEdit,
}: {
  category: AdminCategorySetting;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const [percent, setPercent] = useState(bpsToPercentString(category.commission_bps));
  const [confirmPercent, setConfirmPercent] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setPercent(bpsToPercentString(category.commission_bps));
    setConfirmPercent("");
    setLocalError(null);
  }, [category.commission_bps, category.id]);

  const draftBps = percentStringToBps(percent);
  const dirty =
    draftBps != null && draftBps !== category.commission_bps;
  const needsConfirm = draftBps != null && draftBps > 500;

  const mutation = useMutation({
    mutationFn: async () => {
      if (draftBps == null) {
        throw new Error("Enter a rate between 0% and 30% (two decimals).");
      }
      const confirmBps =
        needsConfirm ? percentStringToBps(confirmPercent) : undefined;
      if (needsConfirm && confirmBps !== draftBps) {
        throw new Error("Re-enter the same rate to confirm anything above 5%.");
      }
      return updateCategoryCommission({
        id: category.id,
        commission_bps: draftBps,
        confirm_commission_bps: needsConfirm ? draftBps : undefined,
      });
    },
    onSuccess: async (result) => {
      if (!result.ok) {
        if (result.status === "forbidden") {
          toast.add({
            title: "Superadmin only",
            description: result.message,
            type: "error",
          });
          setLocalError(result.message);
          return;
        }
        toast.add({
          title: "Couldn't save",
          description: result.message,
          type: "error",
        });
        setLocalError(result.message);
        return;
      }
      setLocalError(null);
      setConfirmPercent("");
      toast.add({
        title: "Commission updated",
        description: `${categoryLabel(category.id)} is now ${bpsToPercentString(result.category.commission_bps)}%.`,
        type: "success",
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Couldn't save commission.";
      setLocalError(message);
      toast.add({ title: "Couldn't save", description: message, type: "error" });
    },
  });

  return (
    <TableRow>
      <TableCell className="px-3 py-3 whitespace-normal">
        <p className="font-sans text-meta font-medium text-mk-ink">
          {categoryLabel(category.id)}
        </p>
        <p className="mt-0.5 font-sans text-label capitalize text-mk-muted">
          {contractTypeLabel(category.contract_type)}
        </p>
      </TableCell>
      <TableCell className="px-3 py-3">
        <div className="flex flex-col gap-2 sm:max-w-[14rem]">
          <div className="flex items-center gap-2">
            <Input
              value={percent}
              onChange={(e) => {
                setPercent(e.target.value);
                setLocalError(null);
              }}
              disabled={!canEdit || mutation.isPending}
              inputMode="decimal"
              aria-label={`${categoryLabel(category.id)} commission percent`}
              className="h-9 w-24 bg-white text-body md:text-meta"
            />
            <span className="font-sans text-meta text-mk-muted">%</span>
            {canEdit ? (
              <Button
                type="button"
                size="sm"
                disabled={!dirty || draftBps == null || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            ) : null}
          </div>
          {needsConfirm && canEdit ? (
            <Input
              value={confirmPercent}
              onChange={(e) => setConfirmPercent(e.target.value)}
              placeholder="Re-enter to confirm"
              disabled={mutation.isPending}
              inputMode="decimal"
              aria-label="Confirm commission percent"
              className="h-9 bg-white text-body md:text-meta"
            />
          ) : null}
          {draftBps != null ? (
            <CommissionWorkedExample bps={draftBps} />
          ) : (
            <p className="font-sans text-label text-red-700">
              Use a number like 2.00 (0–30%).
            </p>
          )}
          {localError ? (
            <p className="font-sans text-label text-red-700">{localError}</p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="px-3 py-3 font-sans text-label text-mk-muted">
        {formatAdminDateTime(category.updated_at)}
      </TableCell>
    </TableRow>
  );
}

function auditBps(value: unknown): number | null {
  if (
    value &&
    typeof value === "object" &&
    "commission_bps" in value &&
    typeof (value as { commission_bps: unknown }).commission_bps === "number"
  ) {
    return (value as { commission_bps: number }).commission_bps;
  }
  return null;
}

export default function AdminSettingsPage() {
  const { user, loading } = useRequireAuth("admin");
  const canEdit = user?.role === "superadmin";

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: fetchAdminSettings,
    enabled: !loading && !!user,
  });

  if (loading || !user) return null;

  const categories = data?.categories ?? [];
  const audits = data?.audit_history ?? [];

  return (
    <Page width="wide">
      <PageHeader title="Platform settings" />
      <p className="mb-6 text-meta text-mk-muted">
        Commission rates that govern payouts. Changes apply only to bookings
        accepted from now on.
      </p>

      {!canEdit ? (
        <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-meta text-amber-900">
          You can view rates. Only a superadmin can change them.
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-meta text-mk-muted">Loading settings…</p>
      ) : isError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-meta text-red-700">
          {error instanceof Error ? error.message : "Failed to load settings"}
        </p>
      ) : (
        <>
          <Section
            title="Commission by category"
            action={
              data ? (
                <p className="text-meta text-mk-muted">
                  Default fallback:{" "}
                  {bpsToPercentString(data.default_commission_bps)}%
                </p>
              ) : null
            }
          >
            {categories.length === 0 ? (
              <p className="text-meta text-mk-muted">
                No categories configured yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-mk-border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-mk-surface-2 hover:bg-mk-surface-2">
                      <TableHead className="px-3 text-label text-mk-muted">
                        Category
                      </TableHead>
                      <TableHead className="px-3 text-label text-mk-muted">
                        Commission
                      </TableHead>
                      <TableHead className="px-3 text-label text-mk-muted">
                        Updated
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => (
                      <CategoryCommissionRow
                        key={cat.id}
                        category={cat}
                        canEdit={canEdit}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-body text-mk-ink">
              Changing a rate affects only bookings accepted from now on.
              Bookings already accepted keep the rate they were accepted under.
            </p>
          </Section>

          <Section title="Change history">
            {audits.length === 0 ? (
              <p className="text-meta text-mk-muted">
                No commission changes logged yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-mk-border bg-white">
                <ul className="divide-y divide-mk-border">
                  {audits.map((row) => {
                    const from = auditBps(row.old_value);
                    const to = auditBps(row.new_value);
                    return (
                      <li
                        key={row.id}
                        className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-body text-mk-ink">
                            {categoryLabel(row.resource_id)}
                            {from != null && to != null
                              ? `: ${bpsToPercentString(from)}% → ${bpsToPercentString(to)}%`
                              : ""}
                          </p>
                          <p className="mt-0.5 text-meta text-mk-muted">
                            {formatAdminDateTime(row.created_at)}
                          </p>
                        </div>
                        <Badge variant="outline" className="w-fit capitalize">
                          {row.actor_role}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Section>
        </>
      )}
    </Page>
  );
}
