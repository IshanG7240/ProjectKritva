"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

interface StickyActionBarProps {
  priceLabel?: string | null;
  ctaLabel?: string;
  ctaHref?: string;
}

export function StickyActionBar({
  priceLabel,
  ctaLabel = "Ask to book",
  ctaHref = "#book",
}: StickyActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-mk-border bg-mk-surface shadow-sticky lg:hidden">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {priceLabel ? (
          <span className="min-w-0 truncate text-money text-mk-ink">
            {priceLabel}
          </span>
        ) : (
          <span className="text-meta text-mk-muted">Custom quote</span>
        )}
        <Link
          href={ctaHref}
          className={buttonVariants({ variant: "primary", size: "md", className: "shrink-0" })}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
