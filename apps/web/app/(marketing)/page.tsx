/**
 * Marketing homepage — thin orchestrator.
 * All section logic lives in components/marketing/.
 */

import { HeroSection } from "@/components/marketing/HeroSection";
import { PhotographersSection } from "@/components/marketing/PhotographersSection";
import { EscrowSection } from "@/components/marketing/EscrowSection";
import { VendorRegisterSection } from "@/components/marketing/VendorRegisterSection";

export default function MarketingHomePage() {
  return (
    <main>
      <HeroSection />
      <PhotographersSection />
      <EscrowSection />
      <VendorRegisterSection />
    </main>
  );
}
