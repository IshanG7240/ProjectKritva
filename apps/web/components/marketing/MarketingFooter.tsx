/* eslint-disable */
"use client";

/**
 * MarketingFooter
 *
 * Cream-background footer matching the reference screenshot.
 * Left: wordmark + tagline. Centre/right: Platform + Company columns.
 * Bottom row: Legal links + copyright + city markers.
 */

import Link from "next/link";

const PLATFORM_LINKS = [
  { label: "Vendors", href: "/vendors" },
  { label: "Escrow", href: "#escrow" },
  { label: "Compliance", href: "#compliance" },
  { label: "For business", href: "#business" },
];

const COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "Vendor standards", href: "/vendor-standards" },
  { label: "Careers", href: "/careers" },
  { label: "Press", href: "/press" },
];

const LEGAL_LINKS = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Escrow policy", href: "/escrow-policy" },
  { label: "Grievance", href: "/grievance" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#DDD5C4] bg-[#F5EFE2] py-16">
      <div className="mx-auto max-w-6xl px-6">
        {/* Top grid: brand + link columns */}
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-3 md:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-3 md:col-span-2">
            <span className="font-sans text-lg font-semibold text-[#1C1A16]">
              Kritva.
            </span>
            <p className="max-w-[220px] font-sans text-sm leading-relaxed text-[#7A7060]">
              The operating system for{" "}
              <span className="text-[#B87333]">India's</span> premium events.
              Verified, escrowed,{" "}
              <span className="text-[#1D3557]">compliant</span>.
            </p>
          </div>

          {/* Platform */}
          <div className="flex flex-col gap-4">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[#7A7060]">
              Platform
            </p>
            <ul className="flex flex-col gap-2.5">
              {PLATFORM_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="font-sans text-sm text-[#1C1A16] transition-colors hover:text-[#1D3557]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-4">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[#7A7060]">
              Company
            </p>
            <ul className="flex flex-col gap-2.5">
              {COMPANY_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="font-sans text-sm text-[#1C1A16] transition-colors hover:text-[#1D3557]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal row */}
        <div className="mt-12 border-t border-[#DDD5C4] pt-8">
          <div className="mb-3">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[#7A7060]">
              Legal
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="font-sans text-sm text-[#1D3557] transition-colors hover:text-[#1C1A16]"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-2 border-t border-[#DDD5C4] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-[11px] uppercase tracking-wider text-[#7A7060]">
            © 2026 Kritva Technologies Pvt. Ltd.
          </p>
          <p className="font-sans text-[11px] uppercase tracking-wider text-[#7A7060]">
            Escrow Regulated ·{" "}
            <span className="text-[#1D3557]">Bengaluru</span> ·{" "}
            <span className="text-[#1D3557]">Mumbai</span> ·{" "}
            <span className="text-[#1D3557]">Delhi</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
