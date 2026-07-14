"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { AppNav } from "@/components/layout/app-nav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type AdminUserListItem,
  type AdminUserRole,
  type AdminUserStatus,
  fetchUsers,
  formatUserDate,
  updateUserStatus,
} from "@/lib/admin-users";

const PAGE_SIZE = 20;

const ROLE_OPTIONS: Array<{ value: "" | AdminUserRole; label: string }> = [
  { value: "", label: "All roles" },
  { value: "customer", label: "Customer" },
  { value: "vendor", label: "Vendor" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Superadmin" },
];

const STATUS_OPTIONS: Array<{ value: "" | AdminUserStatus; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "banned", label: "Banned" },
];

type StatusAction = "suspended" | "banned" | "active";

function statusBadgeClass(status: AdminUserStatus): string {
  if (status === "active") return "bg-emerald-50 text-emerald-800";
  if (status === "suspended") return "bg-amber-50 text-amber-800";
  return "bg-red-50 text-red-800";
}

function actionLabel(action: StatusAction): string {
  if (action === "suspended") return "Suspend";
  if (action === "banned") return "Ban";
  return "Reinstate";
}

function canModerate(user: AdminUserListItem, actorId: string): boolean {
  if (user.id === actorId) return false;
  if (user.role === "admin" || user.role === "superadmin") return false;
  return true;
}

export default function AdminUsersPage() {
  const { user, loading } = useRequireAuth("admin");
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"" | AdminUserRole>("");
  const [status, setStatus] = useState<"" | AdminUserStatus>("");
  const [offset, setOffset] = useState(0);

  const [dialogUser, setDialogUser] = useState<AdminUserListItem | null>(null);
  const [dialogAction, setDialogAction] = useState<StatusAction | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "users", { search, role, status, offset }],
    queryFn: () =>
      fetchUsers({
        q: search || undefined,
        role: role || undefined,
        status: status || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
    enabled: !loading && !!user,
  });

  const statusMutation = useMutation({
    mutationFn: updateUserStatus,
    onSuccess: async () => {
      setDialogUser(null);
      setDialogAction(null);
      setReason("");
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : "Update failed");
    },
  });

  function openAction(target: AdminUserListItem, action: StatusAction) {
    setDialogUser(target);
    setDialogAction(action);
    setReason("");
    setActionError(null);
  }

  function closeDialog() {
    if (statusMutation.isPending) return;
    setDialogUser(null);
    setDialogAction(null);
    setReason("");
    setActionError(null);
  }

  function submitAction() {
    if (!dialogUser || !dialogAction || !reason.trim()) return;
    statusMutation.mutate({
      id: dialogUser.id,
      status: dialogAction,
      suspended_until: null,
      reason: reason.trim(),
    });
  }

  if (loading || !user) return null;

  const users = data?.users ?? [];
  const pagination = data?.pagination;
  const totalCount = pagination?.totalCount ?? users.length;
  const hasPrev = offset > 0;
  const hasNext =
    pagination?.hasNextPage ?? offset + users.length < totalCount;

  return (
    <div className="min-h-screen bg-mk-bg">
      <AppNav />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="font-sans text-xl font-semibold text-mk-ink">
            User management
          </h1>
          <p className="mt-1 font-sans text-sm text-mk-muted">
            Search accounts and suspend, ban, or reinstate customers and vendors.
          </p>
        </div>

        <form
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setOffset(0);
            setSearch(q.trim());
          }}
        >
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
            <span className="font-sans text-xs font-medium text-mk-muted">
              Search
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, or phone"
              className="h-9 rounded-md border border-mk-border bg-white px-3 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
            />
          </label>
          <label className="flex w-full flex-col gap-1 sm:w-40">
            <span className="font-sans text-xs font-medium text-mk-muted">
              Role
            </span>
            <select
              value={role}
              onChange={(e) => {
                setOffset(0);
                setRole(e.target.value as "" | AdminUserRole);
              }}
              className="h-9 rounded-md border border-mk-border bg-white px-3 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value || "all-roles"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-full flex-col gap-1 sm:w-40">
            <span className="font-sans text-xs font-medium text-mk-muted">
              Status
            </span>
            <select
              value={status}
              onChange={(e) => {
                setOffset(0);
                setStatus(e.target.value as "" | AdminUserStatus);
              }}
              className="h-9 rounded-md border border-mk-border bg-white px-3 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all-statuses"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md bg-mk-navy px-4 font-sans text-sm font-medium text-white hover:opacity-90"
          >
            Search
          </button>
        </form>

        {isLoading ? (
          <p className="font-sans text-sm text-mk-muted">Loading users…</p>
        ) : isError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load users"}
          </p>
        ) : users.length === 0 ? (
          <p className="font-sans text-sm text-mk-muted">No users found.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-mk-border bg-white">
            <div className="hidden gap-4 border-b border-mk-border bg-[#FDFBF7] px-4 py-3 text-xs font-medium uppercase tracking-wide text-mk-muted lg:grid lg:grid-cols-[1.4fr_1.2fr_0.6fr_0.7fr_0.9fr_1fr]">
              <span>Name</span>
              <span>Contact</span>
              <span>Role</span>
              <span>Status</span>
              <span>Joined</span>
              <span />
            </div>
            <ul className="divide-y divide-mk-border">
              {users.map((row) => {
                const moderate = canModerate(row, user.id);
                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-3 px-4 py-4 lg:grid lg:grid-cols-[1.4fr_1.2fr_0.6fr_0.7fr_0.9fr_1fr] lg:items-center lg:gap-4"
                  >
                    <div>
                      <p className="font-sans text-sm font-semibold text-mk-ink">
                        {row.name || "—"}
                      </p>
                      {row.suspended_until && row.status === "suspended" ? (
                        <p className="mt-0.5 font-sans text-xs text-mk-muted">
                          Until {formatUserDate(row.suspended_until)}
                        </p>
                      ) : null}
                    </div>
                    <div className="font-sans text-sm text-mk-ink">
                      <p>{row.email || "—"}</p>
                      {row.phone ? (
                        <p className="mt-0.5 text-xs text-mk-muted">{row.phone}</p>
                      ) : null}
                    </div>
                    <p className="font-sans text-sm capitalize text-mk-ink">
                      {row.role}
                    </p>
                    <span
                      className={`inline-flex w-fit rounded-md px-2 py-0.5 font-sans text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                    <p className="font-sans text-sm text-mk-muted">
                      {formatUserDate(row.created_at)}
                    </p>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {moderate && row.status === "active" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openAction(row, "suspended")}
                            className="inline-flex h-8 items-center rounded-md border border-mk-border bg-white px-3 font-sans text-sm font-medium text-mk-ink hover:bg-[#FDFBF7]"
                          >
                            Suspend
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction(row, "banned")}
                            className="inline-flex h-8 items-center rounded-md border border-red-200 bg-white px-3 font-sans text-sm font-medium text-red-700 hover:bg-red-50"
                          >
                            Ban
                          </button>
                        </>
                      ) : null}
                      {moderate && row.status !== "active" ? (
                        <button
                          type="button"
                          onClick={() => openAction(row, "active")}
                          className="inline-flex h-8 items-center rounded-md border border-mk-border bg-white px-3 font-sans text-sm font-medium text-mk-navy hover:bg-[#FDFBF7]"
                        >
                          Reinstate
                        </button>
                      ) : null}
                      {!moderate ? (
                        <span className="font-sans text-xs text-mk-muted">
                          Protected
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {!isLoading && !isError && users.length > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <p className="font-sans text-xs text-mk-muted">
              Showing {offset + 1}–{offset + users.length}
              {pagination?.totalCount != null
                ? ` of ${pagination.totalCount}`
                : ""}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                className="inline-flex h-8 items-center rounded-md border border-mk-border bg-white px-3 font-sans text-sm text-mk-ink disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                className="inline-flex h-8 items-center rounded-md border border-mk-border bg-white px-3 font-sans text-sm text-mk-ink disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </main>

      <Dialog
        open={!!dialogUser && !!dialogAction}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction ? actionLabel(dialogAction) : "Update"} user
            </DialogTitle>
            <DialogDescription>
              {dialogAction === "active"
                ? `Reinstate ${dialogUser?.name ?? "this user"} and restore access.`
                : dialogAction === "suspended"
                  ? `Suspend ${dialogUser?.name ?? "this user"}. They will be locked out on next sync.`
                  : `Ban ${dialogUser?.name ?? "this user"}. This permanently blocks access until reinstated.`}
            </DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-1">
            <span className="font-sans text-xs font-medium text-mk-muted">
              Reason (required)
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Document why this action is being taken…"
              className="w-full rounded-md border border-mk-border px-3 py-2 font-sans text-sm text-mk-ink outline-none focus:border-mk-navy"
            />
          </label>
          {actionError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-sans text-sm text-red-700">
              {actionError}
            </p>
          ) : null}
          <DialogFooter>
            <button
              type="button"
              onClick={closeDialog}
              disabled={statusMutation.isPending}
              className="inline-flex h-9 items-center rounded-md border border-mk-border px-3 font-sans text-sm text-mk-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!reason.trim() || statusMutation.isPending}
              onClick={submitAction}
              className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 font-sans text-sm font-medium text-white disabled:opacity-50 ${
                dialogAction === "banned"
                  ? "bg-red-600 hover:bg-red-700"
                  : dialogAction === "suspended"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-mk-navy hover:opacity-90"
              }`}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {dialogAction ? actionLabel(dialogAction) : "Confirm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
