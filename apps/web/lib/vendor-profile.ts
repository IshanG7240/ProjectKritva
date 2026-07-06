export interface VendorService {
  id: string;
  name: string;
  description: string | null;
  price_min: number;
  price_max: number;
  unit: string;
  is_active?: boolean;
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
  services: VendorService[];
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
