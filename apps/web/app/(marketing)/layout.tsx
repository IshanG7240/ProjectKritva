import { AppNav } from "@/components/layout/app-nav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { LenisProvider } from "@/lib/lenis-provider";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LenisProvider>
      <div className="flex min-h-screen flex-col bg-mk-bg">
        <AppNav />
        {children}
        <MarketingFooter />
      </div>
    </LenisProvider>
  );
}
