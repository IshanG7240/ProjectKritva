"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { BadgeCheck, Calendar, Loader2, MapPin, Shield, Star, Upload } from "lucide-react";
import { VENDOR_CATEGORIES } from "@kritva/types/enums";
import { InlineEditField } from "@/components/vendor/edit/InlineEditField";
import { VENDOR_CITIES } from "@/components/vendor/VendorDirectoryFilters";

const PLACEHOLDER_RATING_BREAKDOWN = [
  { stars: 5, percent: 72 },
  { stars: 4, percent: 18 },
  { stars: 3, percent: 6 },
  { stars: 2, percent: 2 },
  { stars: 1, percent: 2 },
] as const;

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatCityLabel(cityId: string): string {
  return cityId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isUnsplashUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

interface VendorHeaderProps {
  businessName: string;
  categories?: string[];
  location?: string;
  cityId?: string;
  yearsInBusiness?: number | null;
  avgRating?: number | null;
  ratingCount?: number;
  avatarUrl?: string | null;
  ratingBreakdown?: { stars: number; percent: number }[];
  showPlaceholderRating?: boolean;
  editable?: boolean;
  uploadingAvatar?: boolean;
  onAvatarUpload?: (file: File) => Promise<void>;
  onBusinessNameChange?: (value: string) => void;
  onCategoriesChange?: (categories: string[]) => void;
  onCityIdChange?: (cityId: string) => void;
  onYearsInBusinessChange?: (years: number | null) => void;
}

export function VendorHeader({
  businessName,
  categories = [],
  location,
  cityId = "delhi-ncr",
  yearsInBusiness = null,
  avgRating = null,
  ratingCount = 0,
  avatarUrl = null,
  ratingBreakdown,
  showPlaceholderRating = false,
  editable = false,
  uploadingAvatar = false,
  onAvatarUpload,
  onBusinessNameChange,
  onCategoriesChange,
  onCityIdChange,
  onYearsInBusinessChange,
}: VendorHeaderProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(
    null,
  );
  const hasRating = avgRating != null && ratingCount > 0;
  const showRating = hasRating || showPlaceholderRating;
  const displayRating = hasRating ? Number(avgRating).toFixed(1) : "—";
  const displayReviewCount = hasRating ? ratingCount : 0;
  const experienceLabel =
    yearsInBusiness != null && yearsInBusiness > 0
      ? `${yearsInBusiness}+ Years`
      : null;
  const breakdown = hasRating
    ? (ratingBreakdown ?? [])
    : showPlaceholderRating
      ? [...PLACEHOLDER_RATING_BREAKDOWN]
      : [];

  const cityLabel = formatCityLabel(cityId);
  const displayLocation =
    location ??
    (cityId ? `${cityLabel}, Serving Pan-India` : "Serving Pan-India");

  function toggleCategory(category: string) {
    if (!onCategoriesChange) return;
    onCategoriesChange(
      categories.includes(category)
        ? categories.filter((item) => item !== category)
        : [...categories, category],
    );
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onAvatarUpload) return;

    setAvatarUploadError(null);
    try {
      await onAvatarUpload(file);
    } catch (err) {
      setAvatarUploadError(
        err instanceof Error ? err.message : "Upload failed.",
      );
    }
  }

  return (
    <section className="rounded-2xl border border-mk-border bg-[#FDFBF7] p-5 shadow-[0_8px_32px_rgba(28,26,22,0.08)] md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#EDE8DE] shadow-sm sm:h-24 sm:w-24">
              {avatarUrl ? (
                isUnsplashUrl(avatarUrl) ? (
                  <Image
                    src={avatarUrl}
                    alt={`${businessName} profile`}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={`${businessName} profile`}
                    className="h-full w-full object-cover"
                  />
                )
              ) : null}
              {editable && onAvatarUpload && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/45 font-sans text-[10px] font-medium text-white opacity-0 transition-opacity hover:opacity-100 disabled:opacity-60"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="mr-1 h-3.5 w-3.5" />
                        Photo
                      </>
                    )}
                  </button>
                </>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#FDFBF7] bg-kritva-blue text-white">
                <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            </div>

            <div className="flex min-w-0 flex-col gap-2.5">
              {avatarUploadError && (
                <p className="text-sm text-red-600">{avatarUploadError}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {editable && onBusinessNameChange ? (
                  <InlineEditField
                    as="h1"
                    value={businessName}
                    onChange={onBusinessNameChange}
                    placeholder="Your business name"
                    className="font-sans text-2xl font-semibold tracking-tight text-mk-ink sm:text-3xl md:text-4xl"
                    inputClassName="font-sans text-2xl font-semibold sm:text-3xl md:text-4xl"
                  />
                ) : (
                  <h1 className="font-sans text-2xl font-semibold tracking-tight text-mk-ink sm:text-3xl md:text-4xl">
                    {businessName}
                  </h1>
                )}
                <div className="flex items-center gap-1.5 rounded-full border border-mk-border bg-white px-2.5 py-1 shadow-sm">
                  <Shield className="h-3.5 w-3.5 text-mk-navy" strokeWidth={2} />
                  <div className="leading-tight">
                    <p className="font-sans text-[10px] font-semibold text-mk-ink">
                      Kritva Verified
                    </p>
                    <p className="font-sans text-[8px] font-medium uppercase tracking-widest text-mk-muted">
                      Escrow Protected
                    </p>
                  </div>
                </div>
              </div>

              {editable && onCategoriesChange ? (
                <div className="flex flex-wrap gap-2">
                  {VENDOR_CATEGORIES.map((category) => {
                    const selected = categories.includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className={`rounded-full border px-3 py-1 font-sans text-xs font-medium capitalize transition-colors ${
                          selected
                            ? "border-mk-navy bg-mk-navy text-white"
                            : "border-mk-border bg-white text-mk-muted hover:text-mk-ink"
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              ) : (
                categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full border border-mk-border bg-white px-3 py-1 font-sans text-xs font-medium text-mk-ink"
                      >
                        {cap(cat)}
                      </span>
                    ))}
                  </div>
                )
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-sm text-mk-muted">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {editable && onCityIdChange ? (
                    <select
                      value={cityId}
                      onChange={(e) => onCityIdChange(e.target.value)}
                      className="rounded-md border border-mk-border bg-white px-2 py-1 text-sm text-mk-ink"
                    >
                      {VENDOR_CITIES.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    displayLocation
                  )}
                  {editable && ", Serving Pan-India"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {editable && onYearsInBusinessChange ? (
                    <input
                      type="number"
                      min={0}
                      value={yearsInBusiness ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        onYearsInBusinessChange(
                          raw === "" ? null : Number.parseInt(raw, 10),
                        );
                      }}
                      className="w-16 rounded-md border border-mk-border bg-white px-2 py-1 text-sm text-mk-ink"
                    />
                  ) : experienceLabel ? (
                    experienceLabel
                  ) : null}
                  {editable ? " years" : null}
                </span>
              </div>
            </div>
          </div>
        </div>

        {showRating ? (
          <div
            className={`w-full shrink-0 lg:w-44 xl:w-48 ${
              showPlaceholderRating && !hasRating ? "opacity-60" : ""
            }`}
          >
            <p className="font-sans text-xs font-medium text-mk-muted">
              {showPlaceholderRating && !hasRating ? "Rating preview" : "Rating"}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
              <span className="font-sans text-sm font-semibold text-mk-ink">
                {displayRating}
              </span>
              <span className="font-sans text-xs text-mk-muted">
                ({displayReviewCount} reviews)
              </span>
            </div>

            {breakdown.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-1">
                {breakdown.map(({ stars, percent }) => (
                  <div key={stars} className="flex items-center gap-2">
                    <span className="w-9 shrink-0 font-sans text-[10px] text-mk-muted">
                      {stars} star
                    </span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#EDE8DE]">
                      <div
                        className="h-full rounded-full bg-mk-navy"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
