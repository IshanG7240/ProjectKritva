import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
});

// DM Serif Display local configuration to prevent Turbopack next/font/google resolution errors
const dmSerif = localFont({
  src: [
    {
      path: "./fonts/DMSerifDisplay-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/DMSerifDisplay-Italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kritva — Money held until the job is done",
  description:
    "Find photographers in Delhi NCR, agree a price, pay into hold, and release when the work is done. Starting with photography.",
};

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Providers } from "@/app/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable, dmSerif.variable)}>
      <body className="font-sans antialiased">
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <Toaster>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </Toaster>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

