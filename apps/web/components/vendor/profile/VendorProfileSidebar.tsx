import { AvailabilityWidget } from "./AvailabilityWidget";
import { MenuAndQuoteForm } from "./MenuAndQuoteForm";
import { SecureBookingInfo } from "./SecureBookingInfo";
import type { VendorPackage } from "@/lib/vendor-profile";

interface VendorProfileSidebarProps {
  vendorId?: string;
  vendorSlug?: string;
  packages?: Pick<
    VendorPackage,
    "id" | "name" | "price" | "unit" | "min_quantity"
  >[];
}

export function VendorProfileSidebar({
  vendorId,
  vendorSlug,
  packages,
}: VendorProfileSidebarProps = {}) {
  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
      <SecureBookingInfo />
      <AvailabilityWidget />
      {vendorId && vendorSlug && packages && (
        <MenuAndQuoteForm
          vendorId={vendorId}
          vendorSlug={vendorSlug}
          packages={packages}
        />
      )}
    </div>
  );
}
