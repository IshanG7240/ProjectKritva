export interface PackageDetail {
  package_id: string;
  name: string;
  quantity: number;
  price_at_booking: number;
}

export interface BookingEvent {
  id: string;
  from_status: string;
  to_status: string;
  actor_id: string;
  actor_role: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface BookingMilestone {
  id: string;
  name: string;
  label: string;
  amount: number;
  percentage: number;
  payment_status: string;
  released_at?: string | null;
}

export interface BookingDetail {
  id: string;
  vendor_id: string;
  customer_id: string;
  event_date: string;
  event_type: string;
  guest_count: number | null;
  total_amount: number;
  notes: string | null;
  status: string;
  package_details: PackageDetail[];
  counter_amount: number | null;
  counter_message: string | null;
  decline_reason: string | null;
  commission_bps?: number | null;
  vendor_business_name: string;
  customer_display_name: string;
  customer_first_name: string;
  /** Present only after contact reveal is wired server-side. */
  vendor_phone?: string | null;
  customer_phone?: string | null;
  milestones: BookingMilestone[];
  booking_events: BookingEvent[];
  created_at: string;
  updated_at: string;
}

export interface BookingListItem {
  id: string;
  vendor_id: string;
  event_date: string;
  event_type: string;
  total_amount: number;
  status: string;
  package_details?: PackageDetail[];
  counter_amount?: number | null;
  counter_message?: string | null;
  vendor_business_name?: string;
  created_at?: string;
  updated_at?: string;
}
