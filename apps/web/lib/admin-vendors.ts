import { apiClient } from "@/lib/api-client";

export interface PendingVendor {
  id: string;
  user_id: string;
  business_name: string;
  slug: string;
  category: string[];
  city_id: string;
  description: string | null;
  verification_status: string;
  verification_notes: string | null;
  submitted_at: string | null;
  package_count: number;
  portfolio_media_count: number;
  created_at: string;
}

export interface AdminVendorPackage {
  id: string;
  name: string;
  price: number;
  unit: string;
  min_quantity: number | null;
  inclusions: string[];
}

export interface AdminVendorMedia {
  id: string;
  url: string;
  thumbnail_url: string | null;
  section: string;
  position: number;
}

export interface AdminVendorDetail {
  id: string;
  user_id: string;
  business_name: string;
  slug: string;
  category: string[];
  city_id: string;
  description: string | null;
  years_in_business: number | null;
  profile_photo_url: string | null;
  verification_status: string;
  verification_notes: string | null;
  submitted_at: string | null;
  created_at: string;
  owner_email: string | null;
  packages: AdminVendorPackage[];
  media: AdminVendorMedia[];
}

export async function fetchPendingVendors(): Promise<PendingVendor[]> {
  const res = await apiClient.get<{ vendors: PendingVendor[] }>(
    "/v1/admin/vendors/pending",
  );
  if (res.error) throw new Error(res.error.message);
  return res.data?.vendors ?? [];
}

export async function fetchAdminVendorDetail(
  id: string,
): Promise<AdminVendorDetail> {
  const res = await apiClient.get<{ vendor: AdminVendorDetail }>(
    `/v1/admin/vendors/${id}`,
  );
  if (res.error) throw new Error(res.error.message);
  return res.data!.vendor;
}

export async function verifyVendor(input: {
  id: string;
  verification_status: "approved" | "rejected";
  verification_notes?: string;
}): Promise<void> {
  const res = await apiClient.patch(`/v1/admin/vendors/${input.id}/verify`, {
    verification_status: input.verification_status,
    verification_notes: input.verification_notes,
  });
  if (res.error) throw new Error(res.error.message);
}

export function formatSubmittedAt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
