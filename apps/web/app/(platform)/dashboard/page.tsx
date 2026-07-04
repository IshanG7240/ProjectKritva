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
import { CalendarDays } from "lucide-react";

/** Customer dashboard — protected for role: customer. */
export default function CustomerDashboardPage() {
  const { user, loading } = useRequireAuth("customer");

  // useRequireAuth handles redirects; show nothing while it resolves.
  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={user} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Your Event Bookings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and manage your active vendor bookings here.
          </p>
        </div>

        {/* Bookings list placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
            <CardDescription>
              All your inquiry and booking records will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<CalendarDays className="h-8 w-8 text-muted-foreground/60" />}
              title="No bookings yet"
              description="Browse vendors and send your first inquiry to get started."
            />
          </CardContent>
        </Card>
      </main>
    </div>
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
