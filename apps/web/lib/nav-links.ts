import type { KritvaUser } from "@/hooks/use-require-auth";

export type NavRole = "guest" | "customer" | "vendor" | "admin";

export interface NavLink {
  href: string;
  label: string;
}

export const ROLE_NAV_LINKS: Record<NavRole, NavLink[]> = {
  guest: [{ label: "Vendors", href: "/vendors" }],
  customer: [
    { label: "Vendors", href: "/vendors" },
    { label: "My Bookings", href: "/dashboard" },
  ],
  vendor: [
    { label: "Inquiries", href: "/vendor" },
    { label: "Profile", href: "/vendor/profile" },
  ],
  admin: [
    { label: "Verification", href: "/admin" },
    { label: "Users", href: "/admin/users" },
  ],
};

const AUTH_FLOW_PREFIXES = ["/login", "/callback", "/onboarding"];

export function resolveNavRole(
  role: KritvaUser["role"] | undefined,
): NavRole {
  if (role === "vendor") return "vendor";
  if (role === "customer") return "customer";
  if (role === "admin" || role === "superadmin") return "admin";
  return "guest";
}

export function getNavLinks(role: NavRole): NavLink[] {
  return ROLE_NAV_LINKS[role];
}

export function getHomeHref(role: NavRole): string {
  if (role === "vendor") return "/vendor";
  if (role === "customer") return "/dashboard";
  if (role === "admin") return "/admin";
  return "/";
}

export function getProfileHref(role: NavRole): string {
  if (role === "vendor") return "/vendor/profile";
  if (role === "customer") return "/dashboard";
  if (role === "admin") return "/admin";
  return "/login";
}

export function getProfileLabel(role: NavRole): string {
  if (role === "vendor") return "Vendor profile";
  if (role === "customer") return "My bookings";
  if (role === "admin") return "Admin panel";
  return "Sign in";
}

export function isAuthFlowPath(pathname: string): boolean {
  return AUTH_FLOW_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isNavLinkActive(pathname: string, link: NavLink): boolean {
  if (link.href === "/vendor") {
    return (
      pathname === "/vendor" ||
      (pathname.startsWith("/bookings/") && pathname !== "/bookings")
    );
  }

  if (link.href === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      (pathname.startsWith("/bookings/") && pathname !== "/bookings")
    );
  }

  if (link.href === "/vendors") {
    return pathname === "/vendors" || pathname.startsWith("/vendors/");
  }

  if (link.href === "/admin") {
    return (
      pathname === "/admin" ||
      pathname.startsWith("/admin/vendors")
    );
  }

  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}
