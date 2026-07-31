import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import type { MarketingPage } from "@/lib/marketing-pages";

type MarketingStaticPageProps = {
  page: MarketingPage;
};

export function MarketingStaticPage({ page }: MarketingStaticPageProps) {
  if (page.comingSoon) {
    return (
      <main className="mx-auto w-full max-w-[68ch] px-6 py-16">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="text-meta font-semibold uppercase tracking-widest text-mk-navy">
              Coming soon
            </p>
            <h1 className="text-title text-mk-ink">{page.title}</h1>
            <p className="text-body text-mk-muted">
              We&apos;re finalising this page. Reach us at{" "}
              <a
                href="mailto:legal@kritva.in"
                className="text-mk-navy underline-offset-2 hover:underline"
              >
                legal@kritva.in
              </a>
              .
            </p>
            <Link
              href="/"
              className="text-meta text-mk-navy underline-offset-2 hover:underline"
            >
              ← Back to home
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[68ch] px-6 py-16">
      <header className="mb-10 border-b border-mk-border pb-8">
        <h1 className="font-serif text-display text-mk-ink md:text-display">
          {page.title}
        </h1>
        <p className="mt-4 text-body text-mk-muted">
          {page.description}
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {page.sections.map((section, index) => (
          <section key={index}>
            {section.heading ? (
              <h2 className="mb-3 text-meta font-semibold uppercase tracking-widest text-mk-navy">
                {section.heading}
              </h2>
            ) : null}
            <div className="flex flex-col gap-4">
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p
                  key={paragraphIndex}
                  className="text-body text-mk-ink"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
