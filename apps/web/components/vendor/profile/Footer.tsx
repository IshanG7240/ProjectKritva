import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Navigation", href: "/" },
  { label: "Pricing", href: "/pricing" },
  { label: "Decorators", href: "/vendors" },
  { label: "About", href: "/about" },
  { label: "Contacts", href: "/contact" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-mk-border bg-mk-bg">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="font-sans text-sm text-mk-muted transition-colors hover:text-mk-navy"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 font-sans text-[11px] uppercase tracking-wider text-mk-muted">
          © {new Date().getFullYear()} Kritva Technologies Pvt. Ltd.
        </p>
      </div>
    </footer>
  );
}
