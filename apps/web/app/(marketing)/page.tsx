/* eslint-disable */
"use client";

/**
 * Marketing homepage — thin orchestrator.
 * All section logic lives in components/marketing/.
 */

import { HeroSection } from "@/components/marketing/HeroSection";
import { VendorRegisterSection } from "@/components/marketing/VendorRegisterSection";
import { EscrowSection } from "@/components/marketing/EscrowSection";
import { ComplianceSection } from "@/components/marketing/ComplianceSection";

export default function MarketingHomePage() {
  return (
    <main>
      <HeroSection />
      <VendorRegisterSection />
      <EscrowSection />
      <ComplianceSection />
    </main>
  );
}
