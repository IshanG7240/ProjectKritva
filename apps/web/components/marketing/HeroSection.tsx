/* eslint-disable */
"use client";

/**
 * HeroSection
 *
 * Light cream hero:
 * - Left: display headline with italic amber "certainty", subtext, CTAs.
 * - Right: hero image.
 * - Bottom strip: numbered feature tags on a slightly tinted band.
 */

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

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
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-0 md:pt-16">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-12">
          <div className="flex flex-1 flex-col gap-7 md:pt-4">
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="font-sans text-[clamp(2.6rem,6vw,4.4rem)] font-semibold leading-[1.06] tracking-tight text-[#1C1A16]"
            >
              Every event,
              <br />
              held in{" "}
              <span className="font-serif italic text-[#B87333]">
                certainty.
              </span>
            </motion.h1>

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
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            className="relative w-full md:w-[45%] md:flex-shrink-0"
          >
            <div className="relative h-[320px] overflow-hidden rounded-[4px] md:h-[420px]">
              <Image
                src="/assets/hero-bg.jpg"
                alt="Elegant event table with florals and candles"
                fill
                sizes="(min-width: 768px) 45vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
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
