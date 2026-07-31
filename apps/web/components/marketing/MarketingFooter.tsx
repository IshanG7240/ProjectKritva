/* eslint-disable */
"use client";

/**
 * MarketingFooter — honest links and copy for the photography MVP.
 */

import Link from "next/link";

const PLATFORM_LINKS = [
  { label: "Photographers", href: "/vendors" },
  { label: "How money works", href: "/#escrow" },
  { label: "List your business", href: "/login" },
];

const COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "Vendor standards", href: "/vendor-standards" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Escrow policy", href: "/escrow-policy" },
  { label: "Grievance", href: "/grievance" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-mk-border bg-mk-bg py-12">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-3 md:grid-cols-4">
          <div className="flex flex-col gap-3 md:col-span-2">
            <span className="font-sans text-heading font-semibold text-mk-ink">
              Kritva.
            </span>
            <p className="max-w-[280px] font-sans text-meta leading-relaxed text-mk-muted">
              Book event vendors with money held until the work is done.
              Starting with photography in{" "}
              <span className="text-mk-navy">Delhi NCR</span>.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <p className="font-sans text-label font-semibold uppercase tracking-widest text-mk-muted">
              Platform
            </p>
            <ul className="flex flex-col gap-2.5">
              {PLATFORM_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="font-sans text-meta text-mk-ink transition-colors hover:text-mk-navy"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <p className="font-sans text-label font-semibold uppercase tracking-widest text-mk-muted">
              Company
            </p>
            <ul className="flex flex-col gap-2.5">
              {COMPANY_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="font-sans text-meta text-mk-ink transition-colors hover:text-mk-navy"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-mk-border pt-8">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="font-sans text-meta text-mk-navy transition-colors hover:text-mk-ink"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-sans text-label uppercase tracking-wider text-mk-muted">
              © 2026 Kritva Technologies Pvt. Ltd.
            </p>
            <p className="font-sans text-label uppercase tracking-wider text-mk-muted">
              Delhi NCR · Photography first
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
