"use client";

/**
 * HeroSection — first viewport: headline, subhead, CTAs, tight feature strip.
 */

import Link from "next/link";
import { motion } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import { Media } from "@/components/ui/media";
import { shellWide } from "@/lib/shell";

const EASE = [0.16, 1, 0.3, 1] as const;

const FEATURES = [
  "Money held until the job is done",
  "Photographers you can actually book",
  "Release when you're happy",
];

export function HeroSection() {
  return (
    <section id="hero" className="bg-mk-bg">
      <div className={`${shellWide} px-6 pt-12 pb-12`}>
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-12">
          <div className="flex flex-1 flex-col gap-5">
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="text-display tracking-tight text-mk-ink"
            >
              Every event,
              <br />
              held in{" "}
              <span className="font-serif italic text-mk-copper">
                certainty.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.07 }}
              className="max-w-[46ch] text-body text-mk-muted"
            >
              Find a photographer in Delhi NCR, agree a price, pay into
              escrow, and release the money when the work is done — no{" "}
              <span className="text-mk-copper">cash advances</span>, no{" "}
              <span className="text-mk-navy">guessing</span> where your
              money went.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.12 }}
              className="flex flex-wrap items-center gap-3"
            >
              <Link
                href="/vendors"
                className={buttonVariants({ variant: "primary", size: "lg" })}
              >
                Find photographers →
              </Link>
              <Link
                href="/login"
                className={buttonVariants({ variant: "ghost", size: "lg" })}
              >
                List as a photographer
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            className="relative w-full md:w-[45%] md:flex-shrink-0"
          >
            <Media
              ratio="portrait"
              src="/assets/hero-bg.jpg"
              alt="Elegant event table with florals and candles"
              sizes="(min-width: 768px) 45vw, 100vw"
              priority
              className="md:aspect-[3/2]"
            />
          </motion.div>
        </div>
      </div>

      <div className="border-t border-mk-border bg-mk-line px-6 py-4">
        <div className={`${shellWide} flex flex-wrap items-center gap-x-8 gap-y-2`}>
          {FEATURES.map((f, i) => (
            <span
              key={f}
              className="text-meta font-medium uppercase tracking-widest text-mk-muted"
            >
              <span className="mr-2 text-mk-border">0{i + 1}</span>
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
