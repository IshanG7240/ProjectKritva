/* eslint-disable */
"use client";

/**
 * EscrowSection
 *
 * "ESCROW, IN THREE PARTS" — editorial left/right split layout.
 * Left: headline + supporting text.
 * Right: numbered step list with thin separators.
 */

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  {
    num: "01",
    title: "Funds enter\nescrow",
    desc: (
      <>
        Deposits sit in a regulated account,{" "}
        <span className="text-[#1D3557]">visible</span> to both parties,{" "}
        <span className="text-[#1D3557]">untouchable</span> by either.
      </>
    ),
  },
  {
    num: "02",
    title: "Vendor performs\nthe work",
    desc: (
      <>
        Milestones and{" "}
        <span className="text-[#1D3557]">deliverables</span> logged in-app.{" "}
        No chasing, <span className="text-[#B87333]">no ambiguity</span>, no
        cash on the day.
      </>
    ),
  },
  {
    num: "03",
    title: "You confirm,\npayment moves",
    desc: (
      <>
        One tap releases funds. Disputes are mediated by{" "}
        <span className="text-[#1D3557]">Kritva</span>, not by phone calls{" "}
        <span className="text-[#1D3557]">at midnight</span>.
      </>
    ),
  },
];

export function EscrowSection() {
  return (
    <section id="escrow" className="bg-[#F5EFE2] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:gap-20">
          {/* Left: heading block */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex-1 md:max-w-[360px]"
          >
            <p className="mb-4 font-sans text-xs font-medium uppercase tracking-widest text-[#7A7060]">
              Escrow, in three parts
            </p>
            <h2 className="font-sans text-[clamp(1.8rem,4vw,3rem)] font-semibold leading-[1.1] tracking-tight text-[#1C1A16]">
              Money moves only when the moment does.
            </h2>
            <p className="mt-6 font-sans text-[15px] leading-relaxed text-[#7A7060]">
              The industry runs on advances handed over in{" "}
              <span className="text-[#1D3557]">envelopes</span>. Kritva runs
              on a written promise, kept by a{" "}
              <span className="text-[#1D3557]">ledger</span>.
            </p>
          </motion.div>

          {/* Right: step list */}
          <div className="flex-1">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.45, ease: EASE }}
                className={`flex gap-6 py-7 ${
                  i < STEPS.length - 1 ? "border-b border-[#DDD5C4]" : ""
                }`}
              >
                {/* Step number */}
                <span className="w-8 flex-shrink-0 font-sans text-sm tabular-nums text-[#7A7060]">
                  {step.num}
                </span>

                {/* Step body */}
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
                  <h3 className="whitespace-pre-line font-sans text-[1.1rem] font-semibold leading-snug text-[#1C1A16]">
                    {step.title}
                  </h3>
                  <p className="max-w-xs font-sans text-[14px] leading-relaxed text-[#7A7060]">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
