import { Skeleton } from "@/components/ui/skeleton";
import { shellWide } from "@/lib/shell";

export default function AdminLoading() {
  return (
    <div className={`${shellWide} space-y-6 px-4 py-8 sm:px-6`}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
