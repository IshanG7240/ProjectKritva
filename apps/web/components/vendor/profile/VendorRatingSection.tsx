"use client";

import { useState } from "react";
import { Star } from "lucide-react";

const PLACEHOLDER_RATING_BREAKDOWN = [
  { stars: 5, percent: 72 },
  { stars: 4, percent: 18 },
  { stars: 3, percent: 6 },
  { stars: 2, percent: 2 },
  { stars: 1, percent: 2 },
] as const;

interface VendorRatingSectionProps {
  avgRating?: number | null;
  ratingCount?: number;
  ratingBreakdown?: { stars: number; percent: number }[];
  showPlaceholderRating?: boolean;
}

function InteractiveStarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (stars: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Your rating">
      {Array.from({ length: 5 }).map((_, index) => {
        const star = index + 1;
        const filled = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="rounded p-0.5 transition-transform hover:scale-110"
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
          >
            <Star
              className={`h-6 w-6 ${
                filled
                  ? "fill-[#F59E0B] text-[#F59E0B]"
                  : "fill-transparent text-[#D4CFC4]"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export function VendorRatingSection({
  avgRating = null,
  ratingCount = 0,
  ratingBreakdown,
  showPlaceholderRating = false,
}: VendorRatingSectionProps) {
  const [formRating, setFormRating] = useState(0);
  const [formTitle, setFormTitle] = useState("");
  const [formComment, setFormComment] = useState("");

  const hasRating = avgRating != null && ratingCount > 0;
  const displayRating = hasRating ? Number(avgRating).toFixed(1) : "—";
  const displayReviewCount = hasRating ? ratingCount : 0;
  const breakdown = hasRating
    ? (ratingBreakdown ?? [])
    : showPlaceholderRating
      ? [...PLACEHOLDER_RATING_BREAKDOWN]
      : [];

  return (
    <section className="border-t border-mk-border bg-white py-10">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-6 font-sans text-lg font-semibold text-mk-ink">
          Ratings &amp; Reviews
        </h2>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {(hasRating || showPlaceholderRating) && (
            <div
              className={`rounded-xl border border-mk-border bg-[#FDFBF7] p-6 ${
                showPlaceholderRating && !hasRating ? "opacity-60" : ""
              }`}
            >
              <p className="font-sans text-xs font-medium text-mk-muted">
                {showPlaceholderRating && !hasRating
                  ? "Rating preview"
                  : "Overall rating"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Star className="h-5 w-5 fill-[#F59E0B] text-[#F59E0B]" />
                <span className="font-sans text-2xl font-semibold text-mk-ink">
                  {displayRating}
                </span>
                <span className="font-sans text-sm text-mk-muted">
                  ({displayReviewCount} reviews)
                </span>
              </div>

              {breakdown.length > 0 && (
                <div className="mt-5 flex flex-col gap-2">
                  {breakdown.map(({ stars, percent }) => (
                    <div key={stars} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 font-sans text-xs text-mk-muted">
                        {stars} star
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EDE8DE]">
                        <div
                          className="h-full rounded-full bg-mk-navy transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right font-sans text-xs text-mk-muted">
                        {percent}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div
            className={`rounded-xl border border-mk-border bg-white p-6 shadow-sm ${
              !hasRating && !showPlaceholderRating ? "lg:col-span-2 lg:max-w-xl" : ""
            }`}
          >
            <h3 className="font-sans text-base font-semibold text-mk-ink">
              Write a review
            </h3>
            <p className="mt-1 font-sans text-sm text-mk-muted">
              Share your experience with this vendor.
            </p>

            <form
              className="mt-5 flex flex-col gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <div>
                <label className="mb-1.5 block font-sans text-xs font-medium text-mk-muted">
                  Your rating
                </label>
                <InteractiveStarPicker
                  value={formRating}
                  onChange={setFormRating}
                />
              </div>

              <div>
                <label
                  htmlFor="review-title"
                  className="mb-1.5 block font-sans text-xs font-medium text-mk-muted"
                >
                  Review title
                </label>
                <input
                  id="review-title"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Summarize your experience"
                  className="h-10 w-full rounded-lg border border-mk-border bg-white px-3 font-sans text-sm text-mk-ink placeholder:text-mk-muted/60"
                />
              </div>

              <div>
                <label
                  htmlFor="review-comment"
                  className="mb-1.5 block font-sans text-xs font-medium text-mk-muted"
                >
                  Your review
                </label>
                <textarea
                  id="review-comment"
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  rows={4}
                  placeholder="Tell others about the quality, timeliness, and overall experience..."
                  className="w-full resize-none rounded-lg border border-mk-border bg-white px-3 py-2 font-sans text-sm text-mk-ink placeholder:text-mk-muted/60"
                />
              </div>

              <button
                type="submit"
                className="self-start rounded-lg bg-mk-navy px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-mk-ink"
              >
                Submit review
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
