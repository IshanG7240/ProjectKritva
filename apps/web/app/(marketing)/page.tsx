/* eslint-disable */
"use client";

/**
 * Marketing homepage — thin orchestrator.
 * All section logic lives in components/marketing/.
 */

import { LenisProvider } from "@/lib/lenis-provider";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { HeroSection } from "@/components/marketing/HeroSection";
import { VendorRegisterSection } from "@/components/marketing/VendorRegisterSection";
import { EscrowSection } from "@/components/marketing/EscrowSection";
import { ComplianceSection } from "@/components/marketing/ComplianceSection";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function MarketingHomePage() {
  return (
    <LenisProvider>
      <MarketingNav />
      <main>
        <HeroSection />
        <VendorRegisterSection />
        <EscrowSection />
        <ComplianceSection />
      </main>

      <MarketingFooter />
    </LenisProvider>
  );
}
