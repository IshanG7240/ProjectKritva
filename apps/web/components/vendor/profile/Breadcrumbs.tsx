import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbsProps {
  vendorName: string;
}

export function Breadcrumbs({ vendorName }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="border-b border-mk-border bg-mk-bg">
      <div className="mx-auto max-w-6xl px-6 py-3">
        <ol className="flex flex-wrap items-center gap-1.5 font-sans text-sm text-mk-muted">
          <li>
            <Link href="/" className="transition-colors hover:text-mk-ink">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5 text-[#C8B89A]" />
          </li>
          <li>
            <Link
              href="/vendors"
              className="transition-colors hover:text-mk-ink"
            >
              Vendors
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5 text-[#C8B89A]" />
          </li>
          <li className="font-medium text-mk-ink">{vendorName}</li>
        </ol>
      </div>
    </nav>
  );
}
