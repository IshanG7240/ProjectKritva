"use client";

import { useRequireAuth } from "@/hooks/use-require-auth";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Inbox } from "lucide-react";

/** Vendor dashboard — protected for role: vendor. */
export default function VendorDashboardPage() {
  const { user, loading } = useRequireAuth("vendor");

  // useRequireAuth handles redirects; show nothing while it resolves.
  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav carries the role badge so vendors immediately know their context. */}
      <DashboardNav user={user} badge="Vendor Control Panel" />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Page heading with a subtle role indicator strip */}
        <div className="mb-6 rounded border-l-2 border-foreground bg-muted/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Vendor Control Panel
          </p>
          <h1 className="mt-1 text-xl font-semibold text-foreground">
            Incoming Client Inquiries
          </h1>
        </div>

        {/* Inquiries list placeholder */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Summary stat cards — placeholder shells for future data */}
          <StatCard label="Open Inquiries" value="—" />
          <StatCard label="Accepted Bookings" value="—" />
          <StatCard label="Pending Payments" value="—" />
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Inquiries</CardTitle>
              <CardDescription>
                New booking requests from customers will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={<Inbox className="h-8 w-8 text-muted-foreground/60" />}
                title="No inquiries yet"
                description="Once your vendor profile is approved, customers can send you booking requests."
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

/** Compact stat summary card — shell for future API data. */
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

/** Reusable empty state slot. */
function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon}
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
