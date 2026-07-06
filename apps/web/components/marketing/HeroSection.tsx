/* eslint-disable */
"use client";

/**
 * HeroSection
 *
 * Light cream hero matching the reference screenshot:
 * - Left: large display serif headline with italic amber "certainty",
 *   subtext, two CTAs, and a stat row.
 * - Right: hero image with a floating escrow mini-card overlay.
 * - Bottom strip: numbered feature tags on a slightly tinted band.
 */

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const STATS = [
  { value: "1,200+", label: "Verified vendors" },
  { value: "₹94 Cr", label: "Held in escrow" },
  { value: "23", label: "City jurisdictions" },
];

const FEATURES = [
  "SEBI-Regulated Escrow",
  "Portfolio Audited Vendors",
  "GST-Ready Invoicing",
  "Municipal & Fire Clearance",
  "Multi-Currency NRI Settlement",
];

export function HeroSection() {
  return (
    <section id="hero" className="bg-[#F5EFE2]">
      {/* ── Main split: left copy / right image ───────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-0 md:pt-16">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-12">

          {/* ── Left: copy ─────────────────────────────────────────────── */}
          <div className="flex flex-1 flex-col gap-7 md:pt-4">
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="font-sans text-[clamp(2.6rem,6vw,4.4rem)] font-semibold leading-[1.06] tracking-tight text-[#1C1A16]"
            >
              Every event,
              <br />
              held in{" "}
              {/* "certainty" — italic serif, warm amber */}
              <span className="font-serif italic text-[#B87333]">
                certainty.
              </span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.07 }}
              className="max-w-[360px] font-sans text-[15px] leading-relaxed text-[#7A7060]"
            >
              Kritva replaces{" "}
              <span className="text-[#B87333]">cash advances</span>,{" "}
              <span className="text-[#1D3557]">WhatsApp coordination</span>, and
              clearance runarounds with one platform — verified vendors,
              escrowed payments, and{" "}
              <span className="text-[#1D3557]">municipal compliance</span> built
              in.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.12 }}
              className="flex flex-wrap items-center gap-3"
            >
              <Link
                href="/vendors"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1C1A16] px-6 font-sans text-sm font-medium text-white transition-opacity hover:opacity-80"
              >
                Find verified vendors →
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center px-5 font-sans text-sm font-medium text-[#1C1A16] transition-colors hover:text-[#7A7060]"
              >
                List your business
              </Link>
            </motion.div>

            {/* Stat row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
              className="flex flex-wrap gap-8 border-t border-[#DDD5C4] pt-6"
            >
              {STATS.map((s, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span className="font-sans text-2xl font-semibold text-[#1C1A16]">
                    {s.value}
                  </span>
                  <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-[#7A7060]">
                    {s.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Right: image + floating escrow card ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            className="relative w-full md:w-[45%] md:flex-shrink-0"
          >
            {/* Hero image */}
            <div className="relative h-[320px] overflow-hidden rounded-[4px] md:h-[420px]">
              <Image
                src="/assets/hero-bg.jpg"
                alt="Elegant event table with florals and candles"
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Floating escrow card — bottom-left of image */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.45 }}
              className="absolute bottom-4 left-4 w-[200px] rounded-[4px] border border-[#DDD5C4] bg-white/95 p-4 shadow-md backdrop-blur-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-sans text-[9px] font-medium uppercase tracking-widest text-[#7A7060]">
                  Escrow · Booking #4402
                </span>
                {/* Live dot */}
                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
              </div>
              <p className="font-sans text-xl font-semibold text-[#1C1A16]">
                ₹ 2,40,000
              </p>
              <p className="mt-0.5 font-sans text-[11px] text-[#7A7060]">
                Held until event delivery
              </p>
              {/* Progress bars */}
              <div className="mt-3 flex gap-1.5">
                <div className="h-1 flex-1 rounded-full bg-[#1C1A16]" />
                <div className="h-1 flex-1 rounded-full bg-[#DDD5C4]" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Feature strip ─────────────────────────────────────────────────── */}
      <div className="mt-10 border-t border-[#DDD5C4] bg-[#EDE8DE] px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2">
          {FEATURES.map((f, i) => (
            <span
              key={f}
              className="font-sans text-[10px] font-medium uppercase tracking-widest text-[#7A7060]"
            >
              <span className="mr-2 text-[#DDD5C4]">0{i + 1}</span>
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
