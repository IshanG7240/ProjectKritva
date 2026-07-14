/**
 * VendorCard
 *
 * Displays a vendor's summary for directory listings.
 * Uses the same `mk` colour palette as the marketing landing page.
 *
 * Props come from the GET /v1/vendors list endpoint response.
 */

import Link from "next/link";
import Image from "next/image";
import { formatPackagePriceLabel } from "@/lib/vendor-profile";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Capitalise first letter of a string. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CATEGORY_COVER_IMAGES: Record<string, string> = {
  decor:
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=640&q=80",
  catering:
    "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=640&q=80",
  photography:
    "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=640&q=80",
  venue:
    "https://images.unsplash.com/photo-1519225421980-715f02196665?auto=format&fit=crop&w=640&q=80",
  other:
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=640&q=80",
};

const SAMPLE_COVER_IMAGES = [
  ...Object.values(CATEGORY_COVER_IMAGES),
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=640&q=80",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=640&q=80",
  "https://images.unsplash.com/photo-1522673607200-83642ebe690e?auto=format&fit=crop&w=640&q=80",
] as const;

function pickSampleCoverImage(id: string, category: string[]): string {
  const primary = category[0];
  if (primary && CATEGORY_COVER_IMAGES[primary]) {
    return CATEGORY_COVER_IMAGES[primary];
  }

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % SAMPLE_COVER_IMAGES.length;
  }
  return SAMPLE_COVER_IMAGES[hash]!;
}

function isUnsplashUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

function resolveCoverImage(
  id: string,
  category: string[],
  cover_image?: string | null,
): string {
  return cover_image?.trim() || pickSampleCoverImage(id, category);
}

// ── types ─────────────────────────────────────────────────────────────────────

export interface VendorCardProps {
  id: string;
  business_name: string;
  slug: string;
  category: string[];
  avg_rating: string | number | null;
  rating_count: number;
  booking_count?: number;
  city_id?: string;
  price_min: number | null;
  price_max: number | null;
  unit: string | null;
  units_mixed?: boolean;
  /** Cover image URL. Falls back to a pattern placeholder when absent. */
  cover_image?: string | null;
  /** Vendor profile photo shown as avatar on the card. */
  profile_photo_url?: string | null;
}

// ── skeleton ──────────────────────────────────────────────────────────────────

const SKELETON_COUNT = 6;

export function VendorCardSkeleton() {
  return (
    <div
      className="w-full max-w-[320px] overflow-hidden rounded-[12px] border border-mk-border bg-white shadow-sm"
      aria-hidden="true"
    >
      <div className="h-[180px] animate-pulse bg-[#EDE8DE]" />
      <div className="space-y-3 px-4 pt-3 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-[#EDE8DE]" />
          <div className="h-4 w-16 animate-pulse rounded bg-[#EDE8DE]" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded-md bg-[#EDE8DE]" />
          <div className="h-5 w-14 animate-pulse rounded-md bg-[#EDE8DE]" />
        </div>
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-[#EDE8DE]" />
        <div className="flex gap-4">
          <div className="h-3 w-20 animate-pulse rounded bg-[#EDE8DE]" />
          <div className="h-3 w-28 animate-pulse rounded bg-[#EDE8DE]" />
        </div>
        <div className="flex justify-end pt-1">
          <div className="h-8 w-24 animate-pulse rounded-[6px] bg-[#EDE8DE]" />
        </div>
      </div>
    </div>
  );
}

export function VendorCardSkeletonGrid({ count = SKELETON_COUNT }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <VendorCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export function VendorCard({
  id,
  business_name,
  slug,
  category,
  avg_rating,
  rating_count,
  booking_count,
  city_id = "Delhi NCR",
  price_min,
  price_max,
  unit,
  units_mixed = false,
  cover_image,
  profile_photo_url,
}: VendorCardProps) {
  const rating = avg_rating != null ? Number(avg_rating).toFixed(1) : null;
  const imageSrc = resolveCoverImage(id, category, cover_image);
  const avatarSrc = profile_photo_url?.trim() || null;
  const priceLabel = formatPackagePriceLabel({
    price_min,
    price_max,
    unit,
    units_mixed,
  });

  // Format city label — "delhi-ncr" → "Delhi NCR"
  const cityLabel = city_id
    .split("-")
    .map((w) => w.toUpperCase())
    .join(" ");

  return (
    <Link
      href={`/vendors/${slug}`}
      className="group block w-full max-w-[320px] overflow-hidden rounded-[12px] border border-[#DDD5C4] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D3557]"
    >
      {/* ── Cover image ──────────────────────────────────────────────────── */}
      <div className="relative h-[180px] w-full overflow-hidden bg-[#EDE8DE]">
        <Image
          src={imageSrc}
          alt={`${business_name} portfolio cover`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="320px"
        />

        {avatarSrc && (
          <div className="absolute bottom-3 left-3 h-14 w-14 overflow-hidden rounded-full border-[3px] border-white bg-[#EDE8DE] shadow-md">
            <div className="relative h-full w-full">
              {isUnsplashUrl(avatarSrc) ? (
                <Image
                  src={avatarSrc}
                  alt={`${business_name} profile`}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={`${business_name} profile`}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>
        )}

        {/* Verified badge — top right */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 shadow-sm backdrop-blur-sm">
          {/* Shield icon */}
          <svg
            width="13"
            height="14"
            viewBox="0 0 13 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6.5 0.75L1 3.25V7C1 10.2 3.44 13.2 6.5 14C9.56 13.2 12 10.2 12 7V3.25L6.5 0.75Z"
              fill="#1D3557"
            />
            <path
              d="M4.5 7L6 8.5L9 5.5"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="leading-tight">
            <p className="text-[9px] font-semibold text-[#1C1A16]">
              Kritva Verified
            </p>
            <p className="text-[8px] font-medium uppercase tracking-widest text-[#7A7060]">
              Escrow Protected
            </p>
          </div>
        </div>
      </div>

      {/* ── Card body ────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4">
        {/* Name + rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-sans text-[15px] font-semibold leading-snug text-[#1C1A16] line-clamp-1">
            {business_name}
          </h3>
          {rating != null && (
            <div className="flex shrink-0 items-center gap-1">
              {/* Star */}
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="#F59E0B"
                aria-hidden="true"
              >
                <path d="M6.5 0.5L8.09 4.26L12.18 4.64L9.14 7.24L10.18 11.24L6.5 9L2.82 11.24L3.86 7.24L0.82 4.64L4.91 4.26L6.5 0.5Z" />
              </svg>
              <span className="font-sans text-[13px] font-medium text-[#1C1A16]">
                {rating}
              </span>
              <span className="font-sans text-[12px] text-[#7A7060]">
                ({rating_count} reviews)
              </span>
            </div>
          )}
        </div>

        {/* Category pills */}
        {category.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {category.map((cat, idx) => (
              <span key={cat} className="flex items-center gap-1.5">
                <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 font-sans text-[11px] font-medium text-[#4B5563]">
                  {cap(cat)}
                </span>
                {/* Bullet separator between pills */}
                {idx < category.length - 1 && (
                  <span className="text-[10px] text-[#9CA3AF]">•</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        {priceLabel && (
          <p className="mt-3 font-sans text-[13px] text-[#1C1A16]">
            {priceLabel}
          </p>
        )}

        {/* Meta row: city + booking count */}
        <div className="mt-2.5 flex items-center gap-4 text-[#7A7060]">
          {/* Location */}
          <span className="flex items-center gap-1 font-sans text-[11px]">
            {/* Pin icon */}
            <svg
              width="10"
              height="12"
              viewBox="0 0 10 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 0C2.79 0 1 1.79 1 4c0 2.5 4 8 4 8s4-5.5 4-8c0-2.21-1.79-4-4-4Zm0 5.5A1.5 1.5 0 1 1 5 2.5a1.5 1.5 0 0 1 0 3Z"
                fill="currentColor"
              />
            </svg>
            {cityLabel}
          </span>

          {/* Booking count */}
          {booking_count != null && booking_count > 0 && (
            <span className="flex items-center gap-1 font-sans text-[11px]">
              {/* Calendar icon */}
              <svg
                width="11"
                height="11"
                viewBox="0 0 11 11"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="0.5"
                  y="1.5"
                  width="10"
                  height="9"
                  rx="1.5"
                  stroke="currentColor"
                />
                <path
                  d="M3 0.5V2.5M8 0.5V2.5M0.5 4.5H10.5"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
              </svg>
              {booking_count}+ Bookings on Kritva
            </span>
          )}
        </div>

        {/* CTA button */}
        <div className="mt-4 flex justify-end">
          <span className="inline-flex h-8 items-center justify-center rounded-[6px] bg-[#1D3557] px-4 font-sans text-[13px] font-medium text-white transition-colors group-hover:bg-[#162C47]">
            View Profile
          </span>
        </div>
      </div>
    </Link>
  );
}
