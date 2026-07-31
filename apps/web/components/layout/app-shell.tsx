import { AppNav } from "@/components/layout/app-nav";

export function AppShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-mk-bg">
      <AppNav />
      <div className="flex-1">{children}</div>
      {footer}
    </div>
  );
}
