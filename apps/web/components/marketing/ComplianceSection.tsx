/* eslint-disable */
"use client";

/**
 * ComplianceSection
 *
 * "FOR BUSINESS & B2G" — editorial text with feature bullets.
 */

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const FEATURES = [
  "Automated GST reconciliation",
  "Fire NOC and capacity certificates",
  "Multi-approver corporate workflows",
  "Timezone-aware NRI coordination",
];

export function ComplianceSection() {
  return (
    <section id="compliance" className="bg-[#F5EFE2] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="max-w-[520px]"
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

          <ul className="mt-7 flex flex-col gap-3">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-center gap-3 font-sans text-[14px] text-[#7A7060]"
              >
                <span className="text-[#B87333]">—</span>
                <span className="text-[#1D3557]">{f}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
