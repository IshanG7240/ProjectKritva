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
        "sticky top-0 z-50 border-b border-[#DDD5C4] bg-[#F5EFE2] transition-shadow duration-300",
        scrolled && "shadow-[0_1px_0_rgba(0,0,0,0.04)]",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={homeHref}
            className="shrink-0 font-sans text-[17px] font-semibold tracking-tight text-[#1C1A16]"
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
                      "rounded-md px-2.5 py-1 font-sans text-sm transition-colors duration-150",
                      active
                        ? "bg-[#EDE5D4] font-medium text-[#1C1A16]"
                        : "text-[#7A7060] hover:bg-[#EDE5D4]/60 hover:text-[#1C1A16]",
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
            <div className="h-8 w-20 animate-pulse rounded-full bg-[#E8DFC8]" />
          ) : user ? (
            <div ref={avatarRef} className="relative">
              <button
                onClick={() => setAvatarOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full bg-[#1C1A16] py-1 pl-1 pr-3 text-white transition-opacity hover:opacity-80"
                aria-label="User menu"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C8A96E] font-sans text-xs font-semibold text-[#1C1A16]">
                  {initials}
                </span>
                <span className="max-w-[120px] truncate font-sans text-sm font-medium">
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
                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-[#DDD5C4] bg-[#F5EFE2] py-1 shadow-lg">
                  <div className="border-b border-[#DDD5C4] px-4 py-2.5">
                    <p className="truncate font-sans text-xs font-semibold text-[#1C1A16]">
                      {user.name}
                    </p>
                    <p className="truncate font-sans text-xs text-[#7A7060]">
                      {user.email}
                    </p>
                  </div>
                  {!authFlow && (
                    <Link
                      href={profileHref}
                      onClick={() => setAvatarOpen(false)}
                      className="block px-4 py-2 font-sans text-sm text-[#1C1A16] hover:bg-[#EDE5D4]"
                    >
                      {profileLabel}
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-4 py-2 font-sans text-sm text-red-600 hover:bg-[#EDE5D4]"
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
                className="font-sans text-sm text-[#7A7060] transition-colors hover:text-[#1C1A16]"
              >
                Sign In
              </Link>
            )
          )}
        </div>

        <button
          className="text-[#1C1A16] md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-[#DDD5C4] bg-[#F5EFE2] md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4 sm:px-6">
            {navLinks.map((link) => {
              const active = isNavLinkActive(pathname, link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-2 py-2.5 font-sans text-sm",
                    active
                      ? "bg-[#EDE5D4] font-medium text-[#1C1A16]"
                      : "text-[#7A7060] hover:text-[#1C1A16]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="mt-3 flex flex-col gap-2 border-t border-[#DDD5C4] pt-3">
              {loading ? null : user ? (
                <>
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
                  {!authFlow && (
                    <Link
                      href={profileHref}
                      className="py-2 font-sans text-sm text-[#1C1A16]"
                    >
                      {profileLabel}
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 py-2 font-sans text-sm text-red-600"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </>
              ) : (
                !authFlow && (
                  <Link
                    href="/login"
                    className="py-2 font-sans text-sm text-[#7A7060]"
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
