import type { PackageUnit } from "@kritva/types/enums";
export interface VendorPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: PackageUnit;
  min_quantity: number | null;
  inclusions: string[];
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface VendorMedia {
  id: string;
  url: string;
  thumbnail_url: string | null;
  detail_url: string | null;
  type: string;
  section: string;
  position: number;
  alt_text: string | null;
}

export interface VendorProfile {
  id: string;
  business_name: string;
  slug: string;
  category: string[];
  city_id: string;
  description: string | null;
  years_in_business: number | null;
  profile_photo_url: string | null;
  avg_rating: number | null;
  rating_count: number;
  booking_count: number;
  response_time_hours: number | null;
  verification_status: string;
  verification_notes?: string | null;
  packages: VendorPackage[];
  media: VendorMedia[];
}

export function rupeesToPaisa(rupees: string): number | null {
  const trimmed = rupees.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function paisaToRupees(paisa: number): string {
  return (paisa / 100).toString();
}

export function formatUnit(unit: string): string {
  return unit.replace(/_/g, " ");
}

/** Directory / card price label from aggregated package fields. */
export function formatPackagePriceLabel(opts: {
  price_min: number | null;
  price_max: number | null;
  unit: string | null;
  units_mixed?: boolean;
}): string | null {
  const { price_min, price_max, unit, units_mixed } = opts;
  if (price_min == null) return null;

  const unitSuffix = unit ? ` / ${formatUnit(unit)}` : "";
  const formatPaisa = (paisa: number) =>
    Math.round(paisa / 100).toLocaleString("en-IN");

  if (units_mixed) {
    return `Starting at ₹${formatPaisa(price_min)}${unitSuffix}`;
  }

  if (price_max != null && price_max !== price_min) {
    return `₹${formatPaisa(price_min)} – ₹${formatPaisa(price_max)}${unitSuffix}`;
  }

  return `₹${formatPaisa(price_min)}${unitSuffix}`;
}
