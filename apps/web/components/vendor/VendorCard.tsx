/**
 * Directory card — Frame owns geometry; VendorCard and skeleton both render it (zero CLS).
 */

import Link from "next/link";
import { Media } from "@/components/ui/media";
import { cn } from "@/lib/utils";
import { formatDirectoryFromPrice } from "@/lib/vendor-profile";

function resolveImage(url?: string | null): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    if (new URL(trimmed).hostname === "images.unsplash.com") return null;
  } catch {
    return null;
  }
  return trimmed;
}

export interface VendorCardFrameProps {
  media: React.ReactNode;
  body: React.ReactNode;
  href?: string;
  className?: string;
}

/** Owns all card geometry: media aspect, body spacing, padding. */
export function VendorCardFrame({
  media,
  body,
  href,
  className,
}: VendorCardFrameProps) {
  const content = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-mk-line">
        {media}
      </div>
      <div className="space-y-1 px-0.5 pt-3">{body}</div>
    </>
  );

  if (!href) {
    return (
      <div className={cn("block w-full", className)} aria-hidden="true">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group block w-full outline-none transition-transform duration-300 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      {content}
    </Link>
  );
}

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
  unit: string | null;
  cover_image?: string | null;
  profile_photo_url?: string | null;
  is_verified?: boolean;
  is_mock?: boolean;
  available_on_label?: string | null;
}

export function VendorCardSkeleton() {
  return (
    <VendorCardFrame
      media={<div className="h-full w-full animate-pulse bg-mk-line" />}
      body={
        <div className="space-y-2 py-1">
          <div className="h-4 w-2/3 animate-pulse rounded bg-mk-line" />
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-mk-line" />
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-mk-line" />
        </div>
      }
    />
  );
}

export function VendorCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <VendorCardSkeleton key={i} />
      ))}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span
      className="ml-1.5 inline-flex align-middle text-mk-navy"
      title="Verified"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M7 1L2 3.5V7.2c0 2.9 2.1 5.5 5 6.3 2.9-.8 5-3.4 5-6.3V3.5L7 1Z"
          fill="currentColor"
        />
        <path
          d="M5 7.1l1.3 1.3L9.2 5.5"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function VendorCard({
  business_name,
  slug,
  avg_rating,
  rating_count,
  city_id = "delhi-ncr",
  price_min,
  unit,
  cover_image,
  profile_photo_url,
  is_verified = false,
  is_mock = false,
  available_on_label = null,
}: VendorCardProps) {
  const rating =
    rating_count > 0 && avg_rating != null
      ? Number(avg_rating).toFixed(1)
      : null;
  const imageSrc =
    resolveImage(cover_image) ?? resolveImage(profile_photo_url);
  const priceLabel = formatDirectoryFromPrice({ price_min, unit });
  const cityLabel =
    city_id === "delhi-ncr"
      ? "Delhi NCR"
      : city_id
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

  const media = imageSrc ? (
    <Media
      src={imageSrc}
      alt=""
      ratio="card"
      unoptimized
      className="absolute inset-0 h-full w-full rounded-none"
      imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
    />
  ) : (
    <div className="flex h-full w-full items-end p-4">
      <span className="font-serif text-heading text-mk-muted">
        {business_name}
      </span>
    </div>
  );

  return (
    <VendorCardFrame
      href={`/vendors/${slug}`}
      media={
        <>
          {media}
          {is_mock ? (
            <span className="absolute left-3 top-3 text-label uppercase text-white/90 drop-shadow">
              Demo
            </span>
          ) : null}
        </>
      }
      body={
        <>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-subhead text-mk-ink">
              {business_name}
              {is_verified ? <VerifiedBadge /> : null}
            </h3>
            {rating != null ? (
              <span className="shrink-0 text-meta tabular-nums text-mk-ink">
                <span className="text-mk-copper">★</span> {rating}
              </span>
            ) : null}
          </div>

          {priceLabel || cityLabel ? (
            <p className="text-meta text-mk-ink/90">
              {priceLabel}
              {priceLabel && cityLabel ? (
                <span className="text-mk-muted"> · {cityLabel}</span>
              ) : (
                <span className="text-mk-muted">{cityLabel}</span>
              )}
            </p>
          ) : null}

          {available_on_label ? (
            <p className="text-meta font-medium text-mk-navy">
              Free on {available_on_label}
            </p>
          ) : null}
        </>
      }
    />
  );
}
