import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Page, PageHeader } from "@/components/layout/page";

export default function VendorCalendarLoading() {
  return (
    <Page width="wide">
      <PageHeader title="Calendar" />
      <div className="space-y-4" aria-busy="true" aria-label="Loading calendar">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Card className="p-3">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={`h-${i}`} className="h-4 w-full" />
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton
                key={`d-${i}`}
                className="h-11 w-full rounded-md"
              />
            ))}
          </div>
        </Card>
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Page>
  );
}
