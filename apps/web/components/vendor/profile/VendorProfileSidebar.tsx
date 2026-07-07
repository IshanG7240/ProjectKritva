import { AvailabilityWidget } from "./AvailabilityWidget";
import { MenuAndQuoteForm } from "./MenuAndQuoteForm";
import { SecureBookingInfo } from "./SecureBookingInfo";
import type { VendorService } from "@/lib/vendor-profile";

interface VendorProfileSidebarProps {
  vendorId?: string;
  vendorSlug?: string;
  services?: Pick<VendorService, "id" | "name">[];
}

export function VendorProfileSidebar({
  vendorId,
  vendorSlug,
  services,
}: VendorProfileSidebarProps = {}) {
  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
      <SecureBookingInfo />
      <AvailabilityWidget />
      {vendorId && vendorSlug && services && (
        <MenuAndQuoteForm
          vendorId={vendorId}
          vendorSlug={vendorSlug}
          services={services}
        />
      )}
    </div>
  );
}
