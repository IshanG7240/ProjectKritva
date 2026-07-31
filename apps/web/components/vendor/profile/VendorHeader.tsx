"use client";

import { useRef, useState } from "react";
import {
  BadgeCheck,
  FlaskConical,
  Loader2,
  Star,
  Upload,
} from "lucide-react";
import { VENDOR_CATEGORIES } from "@kritva/types/enums";
import { InlineEditField } from "@/components/vendor/edit/InlineEditField";
import { VENDOR_CITIES } from "@/components/vendor/VendorDirectoryFilters";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatCityLabel(cityId: string): string {
  return cityId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
  showPlaceholderRating?: boolean;
  isVerified?: boolean;
  isMock?: boolean;
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
  showPlaceholderRating = false,
  isVerified = false,
  isMock = false,
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
  const experienceLabel =
    yearsInBusiness != null && yearsInBusiness > 0
      ? `${yearsInBusiness}+ yrs`
      : null;
  const cityLabel = formatCityLabel(cityId);
  const displayLocation = location?.trim() || cityLabel;

  const metaParts = [
    categories.length > 0 ? categories.map(cap).join(" · ") : null,
    displayLocation,
    experienceLabel,
  ].filter(Boolean) as string[];

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
    <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-mk-line sm:h-16 sm:w-16">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
        {editable && onAvatarUpload ? (
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
              className="absolute inset-0 flex items-center justify-center bg-black/45 font-sans text-label font-medium text-white opacity-0 transition-opacity hover:opacity-100 disabled:opacity-60"
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
        ) : null}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        {avatarUploadError ? (
          <p className="font-sans text-meta text-red-600">{avatarUploadError}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {editable && onBusinessNameChange ? (
            <InlineEditField
              as="h1"
              value={businessName}
              onChange={onBusinessNameChange}
              placeholder="Your business name"
              className="font-sans text-title font-semibold tracking-tight text-mk-ink sm:text-[1.75rem]"
              inputClassName="font-sans text-title font-semibold sm:text-[1.75rem]"
            />
          ) : (
            <h1 className="font-sans text-title font-semibold tracking-tight text-mk-ink sm:text-[1.75rem]">
              {businessName}
            </h1>
          )}
          {isVerified ? (
            <span title="Verified" className="text-mk-navy">
              <BadgeCheck className="h-5 w-5" strokeWidth={2} aria-hidden />
              <span className="sr-only">Verified</span>
            </span>
          ) : null}
          {isMock ? (
            <span className="inline-flex items-center gap-1 font-sans text-label font-medium text-mk-muted">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              Demo
            </span>
          ) : null}
        </div>

        {showRating ? (
          <p
            className={`font-sans text-meta tabular-nums text-mk-ink ${
              showPlaceholderRating && !hasRating ? "opacity-50" : ""
            }`}
          >
            <Star
              className="mr-1 inline h-3.5 w-3.5 fill-mk-copper text-mk-copper"
              aria-hidden
            />
            {displayRating}
            {hasRating ? (
              <span className="text-mk-muted"> ({ratingCount})</span>
            ) : null}
          </p>
        ) : null}

        {editable && onCategoriesChange ? (
          <div className="flex flex-wrap gap-2">
            {VENDOR_CATEGORIES.map((category) => {
              const selected = categories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`rounded-md border px-2.5 py-1 font-sans text-label font-medium capitalize ${
                    selected
                      ? "border-mk-navy bg-mk-navy text-white"
                      : "border-mk-border bg-white text-mk-muted"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        ) : null}

        {editable ? (
          <div className="flex flex-wrap items-center gap-3 font-sans text-meta text-mk-muted">
            {onCityIdChange ? (
              <select
                value={cityId}
                onChange={(e) => onCityIdChange(e.target.value)}
                className="rounded-md border border-mk-border bg-white px-2 py-1 text-meta text-mk-ink"
              >
                {VENDOR_CITIES.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.label}
                  </option>
                ))}
              </select>
            ) : (
              <span>{displayLocation}</span>
            )}
            {onYearsInBusinessChange ? (
              <label className="inline-flex items-center gap-1.5">
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
                  className="w-16 rounded-md border border-mk-border bg-white px-2 py-1 text-meta text-mk-ink"
                />
                years
              </label>
            ) : null}
          </div>
        ) : metaParts.length > 0 ? (
          <p className="font-sans text-meta leading-snug text-mk-muted">
            {metaParts.join(" · ")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
