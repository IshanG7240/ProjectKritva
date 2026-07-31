import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Photographers", href: "/vendors" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-mk-border">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="font-sans text-meta text-mk-muted hover:text-mk-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="font-sans text-label text-mk-muted">
          © {new Date().getFullYear()} Kritva
        </p>
      </div>
    </footer>
  );
}
