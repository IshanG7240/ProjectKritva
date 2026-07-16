/**
 * VendorCard
 *
 * Displays a vendor's summary for directory listings.
 * Uses the same `mk` colour palette as the marketing landing page.
 *
 * Props come from the GET /v1/vendors list endpoint response.
 */

import Link from "next/link";
import { formatPackagePriceLabel } from "@/lib/vendor-profile";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Capitalise first letter of a string. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function resolveCoverImage(cover_image?: string | null): string | null {
  const url = cover_image?.trim();
  if (!url) return null;
  try {
    if (new URL(url).hostname === "images.unsplash.com") return null;
  } catch {
    return null;
  }
  return url;
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
  /** Cover image URL. Neutral placeholder when absent. */
  cover_image?: string | null;
  /** Vendor profile photo shown as avatar on the card. */
  profile_photo_url?: string | null;
  /** Admin-approved Kritva Verified badge; omitted for checklist-only listings. */
  is_verified?: boolean;
  /** Seeded marketplace demo profile. */
  is_mock?: boolean;
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
  is_verified = false,
  is_mock = false,
}: VendorCardProps) {
  const rating =
    rating_count > 0 && avg_rating != null
      ? Number(avg_rating).toFixed(1)
      : null;
  const imageSrc = resolveCoverImage(cover_image);
  const avatarSrc = resolveCoverImage(profile_photo_url);
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
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={`${business_name} portfolio cover`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : null}

        {avatarSrc && (
          <div className="absolute bottom-3 left-3 h-14 w-14 overflow-hidden rounded-full border-[3px] border-white bg-[#EDE8DE] shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc}
              alt={`${business_name} profile`}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {is_mock ? (
          <div
            className="absolute left-3 top-3 flex items-center gap-1.5 border border-dashed border-[#1D3557]/40 bg-[#FDFBF7]/95 px-2 py-1 shadow-sm backdrop-blur-sm"
            title="Demo profile for product walkthroughs"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 2.5H10V4.2L7.8 7.2V10H4.2V7.2L2 4.2V2.5Z"
                stroke="#1D3557"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              <path
                d="M4.5 2.5V1.5H7.5V2.5"
                stroke="#1D3557"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-[#1D3557]">
              Demo
            </span>
          </div>
        ) : null}

        {is_verified ? (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 shadow-sm backdrop-blur-sm">
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
        ) : null}
      </div>

      {/* ── Card body ────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4">
        {/* Name + rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-sans text-[15px] font-semibold leading-snug text-[#1C1A16] line-clamp-1">
            {business_name}
          </h3>
          <div className="flex shrink-0 items-center gap-1">
            {rating != null ? (
              <>
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
              </>
            ) : (
              <span className="font-sans text-[12px] text-[#7A7060]">
                Unrated
              </span>
            )}
          </div>
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
