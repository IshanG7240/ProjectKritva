import Link from "next/link";
import type { MarketingPage } from "@/lib/marketing-pages";

type MarketingStaticPageProps = {
  page: MarketingPage;
};

export function MarketingStaticPage({ page }: MarketingStaticPageProps) {
  if (page.comingSoon) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 flex-col items-start justify-center px-6 py-24 md:py-32">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[#1D3557]">
          Legal
        </p>
        <h1 className="mt-4 font-serif text-4xl text-[#1C1A16] md:text-5xl">
          {page.title}
        </h1>
        <p className="mt-6 font-serif text-2xl italic text-[#B87333] md:text-3xl">
          Coming soon
        </p>
        <p className="mt-4 max-w-md font-sans text-base leading-relaxed text-[#7A7060]">
          We&apos;re finalising this page. Check back shortly, or reach us at{" "}
          <a
            href="mailto:legal@kritva.in"
            className="text-[#1D3557] underline-offset-2 hover:underline"
          >
            legal@kritva.in
          </a>
          .
        </p>
        <Link
          href="/"
          className="mt-10 font-sans text-sm text-[#1D3557] transition-colors hover:text-[#1C1A16]"
        >
          ← Back to home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 py-16 md:py-24">
      <header className="mb-10 border-b border-[#DDD5C4] pb-8">
        <h1 className="font-serif text-4xl text-[#1C1A16] md:text-5xl">
          {page.title}
        </h1>
        <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-[#7A7060]">
          {page.description}
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {page.sections.map((section, index) => (
          <section key={index}>
            {section.heading ? (
              <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-widest text-[#1D3557]">
                {section.heading}
              </h2>
            ) : null}
            <div className="flex flex-col gap-4">
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p
                  key={paragraphIndex}
                  className="font-sans text-base leading-relaxed text-[#1C1A16]"
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
