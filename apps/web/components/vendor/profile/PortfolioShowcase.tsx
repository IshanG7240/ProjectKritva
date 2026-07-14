"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Play, Trash2, Upload } from "lucide-react";

import type { VendorMediaItem } from "./HeroGallery";

const PREVIEW_LIMIT = 6;

function isUnsplashUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

interface PortfolioShowcaseProps {
  media?: VendorMediaItem[];
  vendorSlug?: string;
  editable?: boolean;
  uploading?: boolean;
  onUpload?: (files: File[]) => Promise<void>;
  onRemove?: (mediaId: string) => void;
}

export function PortfolioShowcase({
  media,
  vendorSlug,
  editable = false,
  uploading = false,
  onUpload,
  onRemove,
}: PortfolioShowcaseProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const allItems =
    media && media.length > 0
      ? media.map((item) => ({
          id: item.id,
          src: item.url,
          alt: item.alt_text ?? "Portfolio image",
          isVideo: item.type === "video",
        }))
      : [];

  const items = editable ? allItems : allItems.slice(0, PREVIEW_LIMIT);
  const hasMore = allItems.length > PREVIEW_LIMIT;
  const showViewAll = !editable && vendorSlug && allItems.length > 0;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !onUpload) return;

    setUploadError(null);
    try {
      await onUpload(files);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-sans text-lg font-semibold text-mk-ink">
          Portfolio Showcase
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {showViewAll && (
            <Link
              href={`/vendors/${vendorSlug}/photos`}
              className="font-sans text-sm font-medium text-mk-navy transition-colors hover:text-mk-ink"
            >
              View all{hasMore ? ` (${allItems.length})` : ""}
            </Link>
          )}
          {editable && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-mk-border bg-white px-3 py-2 font-sans text-sm font-medium text-mk-ink hover:bg-[#FAF7F0] disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
              </button>
            </div>
          )}
        </div>
      </div>

      {uploadError && (
        <p className="mb-3 text-sm text-red-600">{uploadError}</p>
      )}

      {items.length === 0 ? (
        <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-mk-border bg-[#FAF7F0]">
          <p className="px-4 text-center font-sans text-sm text-mk-muted">
            {editable
              ? "Upload portfolio photos or videos."
              : "No portfolio items yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl"
            >
              {isUnsplashUrl(item.src) ? (
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.src}
                  alt={item.alt}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              )}

              {item.isVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-transform group-hover:scale-105">
                    <Play className="ml-0.5 h-5 w-5 fill-mk-ink text-mk-ink" />
                  </span>
                </div>
              )}

              {editable && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="Remove portfolio item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
