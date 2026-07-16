import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";

const TESTIMONIALS = [
  {
    id: "1",
    name: "Ananya Mehta",
    text: "Royal Decorators transformed our palace wedding into something out of a magazine. Every mandap detail was flawless, and the escrow process gave our families complete peace of mind.",
  },
  {
    id: "2",
    name: "Rahul Khanna",
    text: "We booked them for a 600-guest corporate gala. Fire NOC, stage build, and AV were coordinated seamlessly. Kritva's compliance review saved us weeks of back-and-forth with municipal offices.",
  },
  {
    id: "3",
    name: "Priya & Vikram Singh",
    text: "From the first video consultation to the final teardown, the team was professional and responsive. The three-day celebration looked cohesive across every venue — truly bespoke work.",
  },
] as const;

function initials(name: string): string {
  return name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function StarRating() {
  return (
    <div className="flex items-center gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]"
        />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="border-t border-mk-border bg-[#FAF7F0] py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-sans text-lg font-semibold text-mk-ink">
            Client Testimonials
          </h2>
          <Link
            href="/vendors"
            className="font-sans text-sm font-medium text-mk-navy transition-colors hover:text-mk-ink"
          >
            View All
          </Link>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((review) => (
              <article
                key={review.id}
                className="flex flex-col rounded-xl border border-mk-border bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mk-border bg-[#EDE8DE] font-sans text-xs font-semibold text-mk-navy"
                    aria-hidden="true"
                  >
                    {initials(review.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-sm font-semibold text-mk-ink">
                      {review.name}
                    </p>
                    <StarRating />
                  </div>
                </div>

                <p className="mt-3 flex-1 font-sans text-sm leading-relaxed text-mk-muted">
                  {review.text}
                </p>
              </article>
            ))}
          </div>

          <button
            type="button"
            aria-label="Next testimonials"
            className="absolute top-1/2 -right-3 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-mk-border bg-white text-mk-ink shadow-md transition-colors hover:border-mk-navy hover:text-mk-navy md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
