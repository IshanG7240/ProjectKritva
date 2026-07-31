export interface LeadPackageDetail {
  package_id: string;
  name: string;
  quantity: number;
  unit?: string;
  price_at_booking: number;
}

export interface LeadBooking {
  id: string;
  event_date: string;
  event_type: string;
  guest_count: number | null;
  total_amount: number;
  notes: string | null;
  city_id: string;
  status: string;
  package_details: LeadPackageDetail[];
  counter_amount: number | null;
  counter_message: string | null;
  decline_reason: string | null;
  customer_first_name?: string;
  customer_display_name?: string;
  /** Snapshotted at accept; absent on open inquiries — use DEFAULT_COMMISSION_BPS. */
  commission_bps?: number | null;
  created_at?: string;
}

export interface AvailabilityDate {
  date: string;
  is_available: boolean;
  booking_id: string | null;
}

/** Compulsory decline reasons — market research for Kritva. */
export const DECLINE_REASONS = [
  { id: "date", label: "Wrong date" },
  { id: "price", label: "Too cheap" },
  { id: "area", label: "Too far" },
  { id: "style", label: "Not my kind of work" },
  { id: "other", label: "Other" },
] as const;

export type DeclineReasonId = (typeof DECLINE_REASONS)[number]["id"];

export const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  reception: "Reception",
  corporate: "Corporate",
  college_fest: "College fest",
  hackathon: "Hackathon",
  birthday: "Birthday",
  social: "Social",
  other: "Other",
};

export function formatEventType(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function formatCityLabel(cityId: string): string {
  if (cityId === "delhi-ncr") return "Delhi NCR";
  return cityId
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
