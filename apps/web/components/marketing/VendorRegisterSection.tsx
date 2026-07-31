/* eslint-disable */
"use client";

/**
 * VendorRegisterSection
 *
 * Photography is live; later categories are shown as coming, not sellable.
 */

import { motion } from "framer-motion";
import Link from "next/link";

const EASE = [0.16, 1, 0.3, 1] as const;

const CATEGORIES = [
  {
    name: "Photography",
    status: "Live",
    note: "Delhi NCR — packages you can compare, book, and pay for today",
    href: "/vendors" as string | null,
  },
  {
    name: "Catering",
    status: "Next",
    note: "Quote, compare, then book — after photography pays out",
    href: null,
  },
  {
    name: "Venues",
    status: "Later",
    note: "Direct booking, same hold-until-done money — after catering",
    href: null,
  },
];

export function VendorRegisterSection() {
  return (
    <section id="vendors" className="bg-mk-bg py-16">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-8 flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex-1"
          >
            <p className="mb-4 font-sans text-label font-medium uppercase tracking-widest text-mk-muted">
              Categories
            </p>
            <h2 className="font-sans text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-tight text-mk-ink">
              Photography first.
              <br />
              The rest follows.
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.08 }}
            className="max-w-sm self-end font-sans text-body leading-relaxed text-mk-muted"
          >
            One category, end to end — until a real photographer&apos;s bank
            account receives real money. Then catering, then venues.
          </motion.p>
        </div>

        <div className="border-b border-t border-mk-border">
          {CATEGORIES.map((cat, i) => {
            const body = (
              <div
                className={`flex flex-col gap-2 py-7 sm:flex-row sm:items-baseline sm:justify-between sm:gap-10 ${
                  cat.href ? "group" : ""
                }`}
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-sans text-[clamp(1.1rem,2.5vw,1.5rem)] font-medium text-mk-ink">
                    {cat.name}
                  </span>
                  <span className="font-sans text-label font-medium uppercase tracking-widest text-mk-muted">
                    {cat.status}
                  </span>
                  {cat.href ? (
                    <span className="font-sans text-label font-medium uppercase tracking-widest text-mk-muted opacity-0 transition-opacity group-hover:opacity-100">
                      →
                    </span>
                  ) : null}
                </div>
                <p className="max-w-md font-sans text-meta leading-relaxed text-mk-muted">
                  {cat.note}
                </p>
              </div>
            );

            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.07, duration: 0.45, ease: EASE }}
                className={
                  i < CATEGORIES.length - 1 ? "border-b border-mk-border" : ""
                }
              >
                {cat.href ? (
                  <Link
                    href={cat.href}
                    className="block transition-opacity hover:opacity-80"
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
