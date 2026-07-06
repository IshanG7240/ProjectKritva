/* eslint-disable */
"use client";

/**
 * ComplianceSection
 *
 * "FOR BUSINESS & B2G" — left editorial text with feature bullets,
 * right side shows a mock compliance clearance card.
 */

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const FEATURES = [
  "Automated GST reconciliation",
  "Fire NOC and capacity certificates",
  "Multi-approver corporate workflows",
  "Timezone-aware NRI coordination",
];

// Mock compliance card field
function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-[#7A7060]">
        {label}
      </span>
      <span
        className={`font-sans text-sm ${
          accent ? "text-[#1D3557]" : "text-[#1C1A16]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ComplianceCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
      className="rounded-[4px] border border-[#DDD5C4] bg-white p-6 shadow-sm"
    >
      {/* Card header */}
      <div className="mb-5 flex items-center justify-between">
        <span className="font-sans text-[11px] font-medium uppercase tracking-widest text-[#7A7060]">
          Event Compliance — #A-40219
        </span>
        <span className="rounded-[4px] bg-[#1C1A16] px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-wider text-white">
          Cleared
        </span>
      </div>

      {/* Field grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        <Field label="Venue" value="The Leela · Palace Grounds" />
        <Field label="Capacity" value="620 guests · within limit" accent />
        <Field label="Fire NOC" value="Issued · 12 Oct 2026" />
        <Field label="Municipal Permit" value="Approved · valid to 14 Oct" accent />
        <Field label="GST Invoicing" value="Enabled · CGST + SGST" />
        <Field label="Escrow Balance" value="₹ 18,45,000" />
      </div>

      {/* Audit trail */}
      <div className="mt-5 border-t border-[#DDD5C4] pt-4">
        <button className="font-sans text-[11px] font-medium uppercase tracking-widest text-[#7A7060] transition-colors hover:text-[#1C1A16]">
          Audit Trail Available · Download PDF
        </button>
      </div>
    </motion.div>
  );
}

export function ComplianceSection() {
  return (
    <section id="compliance" className="bg-[#F5EFE2] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:gap-16">
          {/* Left: editorial text */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex-1 md:max-w-[380px]"
          >
            <p className="mb-4 font-sans text-xs font-medium uppercase tracking-widest text-[#7A7060]">
              For Business & B2G
            </p>
            <h2 className="font-sans text-[clamp(1.8rem,4vw,3rem)] font-semibold leading-[1.1] tracking-tight text-[#1C1A16]">
              Compliance, kept quiet in the background.
            </h2>
            <p className="mt-5 font-sans text-[15px] leading-relaxed text-[#7A7060]">
              <span className="text-[#B87333]">Fire clearances</span>,{" "}
              <span className="text-[#1D3557]">municipal permits</span>, venue
              capacities,{" "}
              <span className="text-[#B87333]">GST-compliant invoicing</span>,
              multi-approver workflows — the paperwork that used to take weeks
              moves through Kritva in hours.
            </p>

            {/* Feature list */}
            <ul className="mt-7 flex flex-col gap-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 font-sans text-[14px] text-[#7A7060]">
                  {/* Small em-dash bullet matching the screenshot */}
                  <span className="text-[#B87333]">—</span>
                  <span className="text-[#1D3557]">{f}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right: mock card */}
          <div className="flex-1">
            <ComplianceCard />
          </div>
        </div>
      </div>
    </section>
  );
}
