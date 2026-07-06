import type { ReactNode } from "react";

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Footer } from "./Footer";

interface VendorProfileLayoutProps {
  vendorName: string;
  hero?: ReactNode;
  main: ReactNode;
  sidebar: ReactNode;
  bottom?: ReactNode;
  toolbar?: ReactNode;
}

export function VendorProfileLayout({
  vendorName,
  hero,
  main,
  sidebar,
  bottom,
  toolbar,
}: VendorProfileLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-mk-bg">
      <MarketingNav />
      {toolbar}
      <div className={toolbar ? undefined : "pt-14"}>{hero}</div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pb-8 pt-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-9">{main}</div>
          <aside className="lg:col-span-3">{sidebar}</aside>
        </div>
      </div>

      {bottom}

      <Footer />
    </div>
  );
}
