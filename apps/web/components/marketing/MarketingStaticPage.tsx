import type { MarketingPage } from "@/lib/marketing-pages";

type MarketingStaticPageProps = {
  page: MarketingPage;
};

export function MarketingStaticPage({ page }: MarketingStaticPageProps) {
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
