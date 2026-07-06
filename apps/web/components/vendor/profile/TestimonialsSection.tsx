import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";

const TESTIMONIALS = [
  {
    id: "1",
    name: "Ananya Mehta",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
    text: "Royal Decorators transformed our palace wedding into something out of a magazine. Every mandap detail was flawless, and the escrow process gave our families complete peace of mind.",
    thumbnails: [
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=120&q=80",
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=120&q=80",
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=120&q=80",
    ],
  },
  {
    id: "2",
    name: "Rahul Khanna",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
    text: "We booked them for a 600-guest corporate gala. Fire NOC, stage build, and AV were coordinated seamlessly. Kritva's compliance review saved us weeks of back-and-forth with municipal offices.",
    thumbnails: [
      "https://images.unsplash.com/photo-1519225421980-715f02196665?auto=format&fit=crop&w=120&q=80",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=120&q=80",
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=120&q=80",
    ],
  },
  {
    id: "3",
    name: "Priya & Vikram Singh",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80",
    text: "From the first video consultation to the final teardown, the team was professional and responsive. The three-day celebration looked cohesive across every venue — truly bespoke work.",
    thumbnails: [
      "https://images.unsplash.com/photo-1522673607200-83642ebe690e?auto=format&fit=crop&w=120&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=120&q=80",
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=120&q=80",
    ],
  },
] as const;

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
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-mk-border">
                    <Image
                      src={review.avatar}
                      alt={review.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
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

                <div className="mt-4 flex gap-2">
                  {review.thumbnails.map((src, index) => (
                    <div
                      key={src}
                      className="relative h-14 w-14 overflow-hidden rounded-lg border border-mk-border"
                    >
                      <Image
                        src={src}
                        alt={`${review.name} event photo ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  ))}
                </div>
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
