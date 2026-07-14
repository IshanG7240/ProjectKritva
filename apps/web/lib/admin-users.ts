import { apiClient } from "@/lib/api-client";

export type AdminUserRole = "customer" | "vendor" | "admin" | "superadmin";
export type AdminUserStatus = "active" | "suspended" | "banned";

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  suspended_until: string | null;
  created_at: string;
}

export interface FetchUsersParams {
  q?: string;
  role?: AdminUserRole | "";
  status?: AdminUserStatus | "";
  limit?: number;
  offset?: number;
}

export interface FetchUsersResult {
  users: AdminUserListItem[];
  pagination?: {
    totalCount: number;
    limit: number;
    offset?: number;
    hasNextPage: boolean;
  };
}

export async function fetchUsers(
  params: FetchUsersParams = {},
): Promise<FetchUsersResult> {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.role) search.set("role", params.role);
  if (params.status) search.set("status", params.status);
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));

  const qs = search.toString();
  const path = qs ? `/v1/admin/users?${qs}` : "/v1/admin/users";

  const res = await apiClient.get<{ users: AdminUserListItem[] }>(path);
  if (res.error) throw new Error(res.error.message);

  return {
    users: res.data?.users ?? [],
    pagination: res.meta?.pagination,
  };
}

export async function updateUserStatus(input: {
  id: string;
  status: AdminUserStatus;
  suspended_until?: string | null;
  reason: string;
}): Promise<void> {
  const res = await apiClient.patch(`/v1/admin/users/${input.id}/status`, {
    status: input.status,
    suspended_until: input.suspended_until,
    reason: input.reason,
  });
  if (res.error) throw new Error(res.error.message);
}

export function formatUserDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
