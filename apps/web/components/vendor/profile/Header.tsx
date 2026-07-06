import Link from "next/link";
import { HelpCircle, Search, Shield } from "lucide-react";

import { Input } from "@/components/ui/input";

export function Header() {
  return (
    <header className="border-b border-mk-border bg-mk-bg">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-mk-ink transition-opacity hover:opacity-80"
        >
          <Shield className="h-5 w-5 text-mk-navy" strokeWidth={1.75} />
          <span className="font-sans text-[17px] font-semibold tracking-tight">
            Kritva
          </span>
        </Link>

        <div className="flex flex-1 justify-center px-2">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-mk-muted" />
            <Input
              type="search"
              placeholder="Search for your vendor..."
              className="h-9 border-mk-border bg-white pl-9 font-sans text-sm text-mk-ink placeholder:text-mk-muted"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            aria-label="Help"
            className="rounded-md p-1.5 text-mk-muted transition-colors hover:bg-[#EDE5D4] hover:text-mk-ink"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          <Link
            href="/login"
            className="font-sans text-sm text-mk-muted transition-colors hover:text-mk-ink"
          >
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center justify-center rounded-full bg-mk-navy px-4 font-sans text-sm font-medium text-white transition-colors hover:bg-[#162C47]"
          >
            View in Profile
          </Link>
        </div>
      </div>
    </header>
  );
}
