"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  getHomeHref,
  getNavLinks,
  getProfileHref,
  getProfileLabel,
  isAuthFlowPath,
  isNavLinkActive,
  resolveNavRole,
} from "@/lib/nav-links";

export function AppNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const { user, loading } = useAuth();
  const authFlow = isAuthFlowPath(pathname);
  const role = resolveNavRole(user?.role);
  const navLinks = authFlow ? [] : getNavLinks(role);
  const homeHref = getHomeHref(role);
  const profileHref = getProfileHref(role);
  const profileLabel = getProfileLabel(role);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAvatarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  async function handleSignOut() {
    await supabase.auth.signOut();
    setAvatarOpen(false);
    setMenuOpen(false);
    window.location.href = "/";
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-mk-border bg-mk-bg transition-shadow duration-300",
        scrolled && "shadow-[0_1px_0_rgba(0,0,0,0.04)]",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={homeHref}
            className="shrink-0 font-sans text-heading font-semibold tracking-tight text-mk-ink"
          >
            Kritva.
          </Link>

          {navLinks.length > 0 && (
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => {
                const active = isNavLinkActive(pathname, link);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-sans text-meta transition-colors duration-150",
                      active
                        ? "bg-mk-line font-medium text-mk-ink"
                        : "text-mk-muted hover:bg-mk-line/60 hover:text-mk-ink",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-full bg-mk-line" />
          ) : user ? (
            <div ref={avatarRef} className="relative">
              <button
                onClick={() => setAvatarOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full bg-mk-ink py-1 pl-1 pr-3 text-white transition-opacity hover:opacity-80"
                aria-label="User menu"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mk-copper font-sans text-label font-semibold text-mk-ink">
                  {initials}
                </span>
                <span className="max-w-[120px] truncate font-sans text-meta font-medium">
                  {user.name?.split(" ")[0]}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 opacity-70 transition-transform duration-200",
                    avatarOpen && "rotate-180",
                  )}
                />
              </button>

              {avatarOpen && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg border border-mk-border bg-mk-bg py-1 shadow-lg">
                  <div className="border-b border-mk-border px-4 py-2.5">
                    <p className="truncate font-sans text-label font-semibold text-mk-ink">
                      {user.name}
                    </p>
                    <p className="truncate font-sans text-label text-mk-muted">
                      {user.email}
                    </p>
                  </div>
                  {!authFlow && (
                    <Link
                      href={profileHref}
                      onClick={() => setAvatarOpen(false)}
                      className="block px-4 py-2 font-sans text-meta text-mk-ink hover:bg-mk-line"
                    >
                      {profileLabel}
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-4 py-2 font-sans text-meta text-red-600 hover:bg-mk-line"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            !authFlow && (
              <Link
                href="/login"
                className="font-sans text-meta text-mk-muted transition-colors hover:text-mk-ink"
              >
                Sign In
              </Link>
            )
          )}
        </div>

        <button
          className="text-mk-ink md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-mk-border bg-mk-bg md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4 sm:px-6">
            {navLinks.map((link) => {
              const active = isNavLinkActive(pathname, link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-2 py-2.5 font-sans text-meta",
                    active
                      ? "bg-mk-line font-medium text-mk-ink"
                      : "text-mk-muted hover:text-mk-ink",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="mt-3 flex flex-col gap-2 border-t border-mk-border pt-3">
              {loading ? null : user ? (
                <>
                  <div className="flex items-center gap-3 py-1">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mk-copper font-sans text-label font-semibold text-mk-ink">
                      {initials}
                    </span>
                    <div>
                      <p className="font-sans text-meta font-semibold text-mk-ink">
                        {user.name}
                      </p>
                      <p className="font-sans text-label text-mk-muted">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  {!authFlow && (
                    <Link
                      href={profileHref}
                      className="py-2 font-sans text-meta text-mk-ink"
                    >
                      {profileLabel}
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 py-2 font-sans text-meta text-red-600"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </>
              ) : (
                !authFlow && (
                  <Link
                    href="/login"
                    className="py-2 font-sans text-meta text-mk-muted"
                  >
                    Sign In
                  </Link>
                )
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
