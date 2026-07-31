import { Skeleton } from "@/components/ui/skeleton";
import { shellWide } from "@/lib/shell";

export default function PlatformLoading() {
  return (
    <div className={`${shellWide} space-y-6 px-4 py-8 sm:px-6`}>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
