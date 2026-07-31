import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { shellTask } from "@/lib/shell";

export default function NotFound() {
  return (
    <div className={`${shellTask} space-y-4 px-4 py-24 text-center sm:px-6`}>
      <p className="font-sans text-label uppercase tracking-wide text-mk-muted">
        404
      </p>
      <h1 className="font-serif text-title text-mk-ink">Page not found</h1>
      <p className="font-sans text-meta text-mk-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="flex justify-center">
        <Link href="/" className={buttonVariants({ variant: "primary" })}>
          Go home
        </Link>
      </div>
    </div>
  );
}
