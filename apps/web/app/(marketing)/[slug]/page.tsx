import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingStaticPage } from "@/components/marketing/MarketingStaticPage";
import {
  getMarketingPage,
  MARKETING_PAGE_SLUGS,
} from "@/lib/marketing-pages";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return MARKETING_PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getMarketingPage(slug);

  if (!page) {
    return { title: "Not found — Kritva" };
  }

  return {
    title: `${page.title} — Kritva`,
    description: page.description,
  };
}

export default async function MarketingContentPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getMarketingPage(slug);

  if (!page) {
    notFound();
  }

  return <MarketingStaticPage page={page} />;
}
