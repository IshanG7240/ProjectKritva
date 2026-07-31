import { Skeleton } from "@/components/ui/skeleton";
import { shellWide } from "@/lib/shell";

export default function ShopLoading() {
  return (
    <div className={`${shellWide} space-y-6 px-4 py-8 sm:px-6`}>
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full" />
        ))}
      </div>
    </div>
  );
}
