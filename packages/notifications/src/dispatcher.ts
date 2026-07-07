export type BookingVendorAcceptedPayload = {
  kind: "booking_vendor_accepted";
  booking_id: string;
  customer_id: string;
  vendor_id: string;
  total_amount: number;
};

export async function dispatch(
  _payload: BookingVendorAcceptedPayload,
): Promise<void> {
  // In-app channel first; SMS/email adapters wired in T-027.
}
