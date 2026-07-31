import { apiClient } from "@/lib/api-client";

/** Example amount for commission worked examples (₹45,000). */
export const EXAMPLE_BOOKING_PAISA = 4_500_000;

export type AdminPaymentMode = "simulated" | "live";

export interface AdminBookingPayment {
  id: string;
  mode: AdminPaymentMode | string | null;
  status: string | null;
  escrow_status: string | null;
  platform_fee: number | null;
  gateway_payment_id: string | null;
  captured_at: string | null;
  is_simulated: boolean;
}

export interface AdminBookingRow {
  id: string;
  status: string;
  event_date: string;
  total_amount: number;
  commission_bps: number | null;
  customer_id: string;
  customer_name: string | null;
  vendor_id: string;
  vendor_business_name: string;
  vendor_is_demo: boolean;
  payment: AdminBookingPayment | null;
  created_at: string;
}

export interface FetchAdminBookingsParams {
  held?: boolean;
  status?: "payment_held" | "completed" | "disputed" | "payment_released";
  mode?: AdminPaymentMode;
  limit?: number;
  offset?: number;
}

export interface FetchAdminBookingsResult {
  bookings: AdminBookingRow[];
  pagination?: {
    totalCount: number;
    limit: number;
    offset?: number;
    hasNextPage: boolean;
  };
}

export async function fetchAdminBookings(
  params: FetchAdminBookingsParams = {},
): Promise<FetchAdminBookingsResult> {
  const search = new URLSearchParams();
  if (params.held) search.set("held", "true");
  if (params.status) search.set("status", params.status);
  if (params.mode) search.set("mode", params.mode);
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));

  const qs = search.toString();
  const path = qs ? `/v1/admin/bookings?${qs}` : "/v1/admin/bookings";

  const res = await apiClient.get<{ bookings: AdminBookingRow[] }>(path);
  if (res.error) throw new Error(res.error.message);

  return {
    bookings: res.data?.bookings ?? [],
    pagination: res.meta?.pagination,
  };
}

export interface AdminCategorySetting {
  id: string;
  contract_type: string;
  commission_bps: number;
  updated_at: string;
}

export interface AdminSettingsAuditRow {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
}

export interface AdminSettingsData {
  default_commission_bps: number;
  categories: AdminCategorySetting[];
  audit_history: AdminSettingsAuditRow[];
}

export async function fetchAdminSettings(): Promise<AdminSettingsData> {
  const res = await apiClient.get<AdminSettingsData>("/v1/admin/settings");
  if (res.error) throw new Error(res.error.message);
  if (!res.data) throw new Error("Settings response was empty.");
  return res.data;
}

export type UpdateCategoryCommissionResult =
  | {
      ok: true;
      category: { id: string; commission_bps: number; updated_at: string };
    }
  | { ok: false; status: "forbidden" | "error"; message: string };

export async function updateCategoryCommission(input: {
  id: string;
  commission_bps: number;
  confirm_commission_bps?: number;
}): Promise<UpdateCategoryCommissionResult> {
  const body: {
    commission_bps: number;
    confirm_commission_bps?: number;
  } = { commission_bps: input.commission_bps };

  if (input.confirm_commission_bps != null) {
    body.confirm_commission_bps = input.confirm_commission_bps;
  }

  const res = await apiClient.patch<{
    category: { id: string; commission_bps: number; updated_at: string };
  }>(`/v1/admin/settings/categories/${input.id}`, body);

  if (res.error) {
    const forbidden =
      res.error.code === "FORBIDDEN" ||
      /superadmin/i.test(res.error.message);
    if (forbidden) {
      return { ok: false, status: "forbidden", message: res.error.message };
    }
    return { ok: false, status: "error", message: res.error.message };
  }

  if (!res.data?.category) {
    return { ok: false, status: "error", message: "Update response was empty." };
  }

  return { ok: true, category: res.data.category };
}

/** Integer bps math — never floats for money. */
export function computeCommissionSplit(
  amountPaisa: number,
  commissionBps: number,
): { platformFee: number; vendorKeep: number } {
  const platformFee = Math.floor((amountPaisa * commissionBps) / 10_000);
  return { platformFee, vendorKeep: amountPaisa - platformFee };
}

/** "2.00" → 200. Rejects anything that isn't two-decimal percent. */
export function percentStringToBps(raw: string): number | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const whole = Number(match[1]);
  const frac = (match[2] ?? "").padEnd(2, "0");
  const bps = whole * 100 + Number(frac);
  if (bps > 3000) return null;
  return bps;
}

export function bpsToPercentString(bps: number): string {
  const whole = Math.floor(bps / 100);
  const frac = bps % 100;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

export function formatInrFromPaisa(paisa: number): string {
  return `₹${Math.round(paisa / 100).toLocaleString("en-IN")}`;
}

export function daysHeld(capturedAt: string | null, createdAt: string): number {
  const start = capturedAt ? new Date(capturedAt) : new Date(createdAt);
  if (Number.isNaN(start.getTime())) return 0;
  const ms = Date.now() - start.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function formatAdminDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatAdminDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function categoryLabel(id: string): string {
  if (id === "photography") return "Photography";
  if (id === "catering") return "Catering";
  if (id === "venue") return "Venue";
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function contractTypeLabel(value: string): string {
  if (value === "direct") return "Direct";
  if (value === "quote") return "Quote";
  return value;
}
