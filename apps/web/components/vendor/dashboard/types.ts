export interface VendorBookingPackage {
  package_id: string;
  name: string;
  quantity: number;
  price_at_booking: number;
}

export interface VendorBooking {
  id: string;
  event_date: string;
  event_type: string;
  guest_count: number | null;
  total_amount: number;
  notes: string | null;
  status: string;
  package_details: VendorBookingPackage[];
  city_id?: string;
  commission_bps?: number | null;
  customer_first_name?: string;
  counter_amount?: number | null;
  counter_message?: string | null;
  created_at?: string;
}

export const HELD_STATUSES = new Set([
  "payment_held",
  "in_progress",
  "completed",
]);

export const NEXT_JOB_STATUSES = new Set([
  "vendor_accepted",
  "customer_confirmed",
  "payment_pending",
  "payment_held",
  "in_progress",
]);
