import { Star } from "lucide-react";

interface VendorRatingSectionProps {
  avgRating?: number | null;
  ratingCount?: number;
  ratingBreakdown?: { stars: number; percent: number }[];
}

/** Summary only — no fake write-review form. */
export function VendorRatingSection({
  avgRating = null,
  ratingCount = 0,
  ratingBreakdown,
}: VendorRatingSectionProps) {
  const hasRating = avgRating != null && ratingCount > 0;
  if (!hasRating) return null;

  const displayRating = Number(avgRating).toFixed(1);
  const breakdown = ratingBreakdown ?? [];

  return (
    <section className="border-t border-mk-border py-6">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-mk-copper text-mk-copper" aria-hidden />
          <span className="text-heading tabular-nums text-mk-ink">
            {displayRating}
          </span>
          <span className="text-meta text-mk-muted">
            ({ratingCount} review{ratingCount === 1 ? "" : "s"})
          </span>
        </div>

        {breakdown.length > 0 ? (
          <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            {breakdown.map(({ stars, percent }) => (
              <div key={stars} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-label text-mk-muted">
                  {stars}★
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mk-line">
                  <div
                    className="h-full rounded-full bg-mk-navy"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
