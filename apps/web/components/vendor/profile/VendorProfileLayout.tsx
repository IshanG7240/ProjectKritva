import type { ReactNode } from "react";

import { AppNav } from "@/components/layout/app-nav";
import { Footer } from "./Footer";

interface VendorProfileLayoutProps {
  vendorName?: string;
  hero?: ReactNode;
  main: ReactNode;
  sidebar: ReactNode;
  bottom?: ReactNode;
  toolbar?: ReactNode;
  stickyBar?: ReactNode;
}

export function VendorProfileLayout({
  hero,
  main,
  sidebar,
  bottom,
  toolbar,
  stickyBar,
}: VendorProfileLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-mk-bg">
      <AppNav />
      {toolbar}
      {hero}

      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="order-1 space-y-8 lg:col-span-8 xl:col-span-8">
            {main}
          </div>
          <aside className="order-2 lg:col-span-4 xl:col-span-4">
            <div className="lg:sticky lg:top-20 lg:self-start">{sidebar}</div>
          </aside>
        </div>
      </div>

      {bottom}
      <Footer />
      {stickyBar ? <div className="h-20 lg:hidden" aria-hidden /> : null}
      {stickyBar}
    </div>
  );
}
