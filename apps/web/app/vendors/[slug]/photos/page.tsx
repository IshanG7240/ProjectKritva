import Link from "next/link";
import { AppNav } from "@/components/layout/app-nav";
import { Footer } from "@/components/vendor/profile/Footer";

export default async function VendorPhotosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen flex-col bg-mk-bg">
      <AppNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Link
          href={`/vendors/${slug}`}
          className="font-sans text-sm font-medium text-mk-navy transition-colors hover:text-mk-ink"
        >
          ← Back to profile
        </Link>

        <h1 className="mt-4 font-sans text-2xl font-semibold text-mk-ink">
          Portfolio photos
        </h1>
        <p className="mt-2 font-sans text-sm text-mk-muted">
          Full gallery coming soon.
        </p>
      </main>

      <Footer />
    </div>
  );
}
