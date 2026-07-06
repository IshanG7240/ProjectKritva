/* eslint-disable */
"use client";

/**
 * MarketingNav
 *
 * Fixed top nav for the marketing / landing page.
 * Nav links and the right-side CTA are role-aware:
 *   - unauthenticated → only "Sign In" / "Start planning"
 *   - customer        → Vendors, My Bookings + avatar menu
 *   - vendor          → Inquiries + avatar menu
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Menu, X, LogOut, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

/** Nav links per role. */
const ROLE_NAV: Record<
  "guest" | "customer" | "vendor",
  { label: string; href: string }[]
> = {
  guest: [],
  customer: [
    { label: "Vendors", href: "/vendors" },
    { label: "My Bookings", href: "/my-bookings" },
  ],
  vendor: [
    { label: "Bookings", href: "/vendor" },
    { label: "Reviews", href: "/vendor/reviews" },
    { label: "Profile", href: "/vendor/profile" },
  ],
};

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const { user, loading } = useAuth();

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const role: "guest" | "customer" | "vendor" =
    user?.role === "vendor" ? "vendor" : user?.role === "customer" ? "customer" : "guest";

  const navLinks = ROLE_NAV[role];

  /** Initials avatar from the user's name. */
  const initials = user?.name
    ? user.name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "?";

  /** Profile link based on role. */
  const profileHref = role === "vendor" ? "/vendor" : "/dashboard";

  async function handleSignOut() {
    await supabase.auth.signOut();
    setAvatarOpen(false);
    setMenuOpen(false);
    window.location.href = "/";
  }

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-x-0 top-0 z-50 border-b border-[#DDD5C4] bg-[#F5EFE2] transition-shadow duration-300 ${scrolled ? "shadow-[0_1px_0_rgba(0,0,0,0.04)]" : ""
        }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Wordmark */}
        <Link
          href="/"
          className="font-sans text-[17px] font-semibold tracking-tight text-[#1C1A16]"
        >
          Kritva.
        </Link>

        {/* Desktop nav links — role-aware */}
        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-sans text-sm text-[#7A7060] transition-colors duration-150 hover:text-[#1C1A16]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right area — auth-aware */}
        <div className="hidden items-center gap-4 md:flex">
          {loading ? (
            /* Skeleton pill while resolving session */
            <div className="h-8 w-20 animate-pulse rounded-full bg-[#E8DFC8]" />
          ) : user ? (
            /* Avatar + dropdown */
            <div ref={avatarRef} className="relative">
              <button
                onClick={() => setAvatarOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full bg-[#1C1A16] py-1 pl-1 pr-3 text-white transition-opacity hover:opacity-80"
                aria-label="User menu"
              >
                {/* Initials circle */}
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C8A96E] font-sans text-xs font-semibold text-[#1C1A16]">
                  {initials}
                </span>
                <span className="max-w-[120px] truncate font-sans text-sm font-medium">
                  {user.name?.split(" ")[0]}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 opacity-70 transition-transform duration-200 ${avatarOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {avatarOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-[#DDD5C4] bg-[#F5EFE2] py-1 shadow-lg"
                  >
                    <div className="border-b border-[#DDD5C4] px-4 py-2.5">
                      <p className="truncate font-sans text-xs font-semibold text-[#1C1A16]">
                        {user.name}
                      </p>
                      <p className="truncate font-sans text-xs text-[#7A7060]">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href={profileHref}
                      onClick={() => setAvatarOpen(false)}
                      className="block px-4 py-2 font-sans text-sm text-[#1C1A16] hover:bg-[#EDE5D4]"
                    >
                      Profile &amp; Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-4 py-2 font-sans text-sm text-red-600 hover:bg-[#EDE5D4]"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Unauthenticated CTAs */
            <>
              <Link
                href="/login"
                className="font-sans text-sm text-[#7A7060] transition-colors hover:text-[#1C1A16]"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="text-[#1C1A16] md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[#DDD5C4] bg-[#F5EFE2] md:hidden"
          >
            <nav className="flex flex-col gap-1 px-6 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-2.5 font-sans text-sm text-[#7A7060] hover:text-[#1C1A16]"
                >
                  {link.label}
                </Link>
              ))}

              <div className="mt-3 flex flex-col gap-2 border-t border-[#DDD5C4] pt-3">
                {user ? (
                  <>
                    {/* User info row */}
                    <div className="flex items-center gap-3 py-1">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C8A96E] font-sans text-xs font-semibold text-[#1C1A16]">
                        {initials}
                      </span>
                      <div>
                        <p className="font-sans text-sm font-semibold text-[#1C1A16]">
                          {user.name}
                        </p>
                        <p className="font-sans text-xs text-[#7A7060]">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={profileHref}
                      onClick={() => setMenuOpen(false)}
                      className="py-2 font-sans text-sm text-[#1C1A16]"
                    >
                      Profile &amp; Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 py-2 font-sans text-sm text-red-600"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="py-2 font-sans text-sm text-[#7A7060]"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex h-10 items-center justify-center rounded-full bg-[#1C1A16] font-sans text-sm font-medium text-white"
                    >
                      Start planning
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
