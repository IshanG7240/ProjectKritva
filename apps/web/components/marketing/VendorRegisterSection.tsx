/* eslint-disable */
"use client";

/**
 * VendorRegisterSection
 *
 * "THE REGISTER" — editorial section listing vendor categories.
 * Large headline left, description right, then a category grid.
 */

import { motion } from "framer-motion";
import Link from "next/link";

const EASE = [0.16, 1, 0.3, 1] as const;

const CATEGORIES = [
  "Photography",
  "Catering",
  "Decor & florals",
  "Venues",
  "Music & sound",
  "Mehendi & beauty",
];

function CategoryRow({
  items,
  index,
}: {
  items: string[];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: EASE }}
      className="grid grid-cols-1 gap-0 border-t border-[#DDD5C4] sm:grid-cols-3"
    >
      {items.map((name) => (
        <Link
          key={name}
          href="/vendors"
          className="group flex items-baseline justify-between py-5 pr-6 transition-colors hover:text-[#1C1A16] sm:border-r sm:border-[#DDD5C4] last:border-r-0"
        >
          <span className="font-sans text-[clamp(1.1rem,2.5vw,1.5rem)] font-medium text-[#1C1A16]">
            {name}
          </span>
          <span className="ml-4 font-sans text-xs font-medium uppercase tracking-widest text-[#7A7060] opacity-0 transition-opacity group-hover:opacity-100">
            →
          </span>
        </Link>
      ))}
    </motion.div>
  );
}

export function VendorRegisterSection() {
  const rows = [];
  for (let i = 0; i < CATEGORIES.length; i += 3) {
    rows.push(CATEGORIES.slice(i, i + 3));
  }

  return (
    <section id="vendors" className="bg-[#F5EFE2] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex-1"
          >
            <p className="mb-4 font-sans text-xs font-medium uppercase tracking-widest text-[#7A7060]">
              The Register
            </p>
            <h2 className="font-sans text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-tight text-[#1C1A16]">
              A short list,
              <br />
              not a long one.
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.08 }}
            className="max-w-sm self-end font-sans text-[15px] leading-relaxed text-[#7A7060] md:pt-16"
          >
            Every listing carries a paper trail —{" "}
            <span className="text-[#B87333]">GST</span>,{" "}
            <span className="text-[#1D3557]">references</span>, past events,{" "}
            <span className="text-[#1D3557]">insurance</span>.
          </motion.p>
        </div>

        <div className="border-b border-[#DDD5C4]">
          {rows.map((row, i) => (
            <CategoryRow key={i} items={row} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
