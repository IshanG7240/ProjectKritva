"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";
import type { KritvaUser } from "@/hooks/use-require-auth";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

interface DashboardNavProps {
  user: KritvaUser;
  /** Optional badge displayed next to the logo, e.g. "Vendor Control Panel". */
  badge?: string;
  links?: NavLink[];
}

/**
 * Shared top-navigation bar for all authenticated dashboard pages.
 * Shows the Kritva wordmark, an optional role badge, the user's name,
 * and a log-out action.
 */
export function DashboardNav({ user, badge, links }: DashboardNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left — brand + role badge + nav links */}
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold tracking-tight text-foreground">
            Kritva
          </span>
          {badge && (
            <span className="hidden rounded bg-foreground px-2 py-0.5 text-xs font-medium text-background sm:inline-block">
              {badge}
            </span>
          )}
          {links && links.length > 0 && (
            <nav className="ml-2 hidden items-center gap-1 sm:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-sm transition-colors",
                    pathname === link.href
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Right — user name + logout */}
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">
            {user.name ?? user.email}
          </span>
          <Button
            id="btn-logout"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Log out"
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span className="ml-1.5 hidden sm:inline">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
