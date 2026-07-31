import { AppShell } from "@/components/layout/app-shell";

export default function VendorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
