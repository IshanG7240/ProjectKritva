import { Skeleton } from "@/components/ui/skeleton";
import { shellWide } from "@/lib/shell";

export default function VendorLoading() {
  return (
    <div className={`${shellWide} space-y-6 px-4 py-8 sm:px-6`}>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
