import { AvailabilityWidget } from "./AvailabilityWidget";
import { SecureBookingInfo } from "./SecureBookingInfo";

export function VendorProfileSidebar() {
  return (
    <div className="flex flex-col gap-3">
      <SecureBookingInfo />
      <AvailabilityWidget />
    </div>
  );
}
