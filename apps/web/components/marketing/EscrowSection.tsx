"use client";

/**
 * EscrowSection — bank-locker metaphor in three plain-register steps.
 */

import { motion } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";
import { shellWide } from "@/lib/shell";

const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  {
    num: "01",
    title: "Money in the locker",
    body: "You pay the full amount once. It sits with our licensed payment partner — the photographer can see it, but no one can touch it.",
  },
  {
    num: "02",
    title: "They do the job",
    body: "The photographer shoots the event and delivers the photos. Packages spell out hours, shooters, and deliverables up front — no chasing a balance.",
  },
  {
    num: "03",
    title: "You turn the key",
    body: "Release the money when you're happy — or we release after a quiet window. If there's a dispute, nobody turns the key until it's sorted.",
  },
];

export function EscrowSection() {
  return (
    <section id="escrow" className="bg-mk-bg py-16">
      <div className={`${shellWide} px-6`}>
        <div className="mb-8 flex max-w-2xl flex-col gap-4">
          <p className="text-meta font-medium uppercase tracking-widest text-mk-muted">
            How money works
          </p>
          <h2 className="text-display tracking-tight text-mk-ink">
            Held safely until the job is done.
          </h2>
          <p className="text-body text-mk-muted">
            Think of it as a locker at a bank. You put the money in, the
            photographer sees it&apos;s there, and it only moves when the work is done.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08, duration: 0.45, ease: EASE }}
            >
              <Card className="h-full">
                <CardContent className="flex flex-col gap-3">
                  <span className="text-meta tabular-nums text-mk-muted">
                    {step.num}
                  </span>
                  <h3 className="text-heading text-mk-ink">{step.title}</h3>
                  <p className="text-body text-mk-muted">{step.body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
