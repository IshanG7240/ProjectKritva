"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Play, Trash2, Upload } from "lucide-react";

import type { VendorMediaItem } from "./HeroGallery";

const PREVIEW_LIMIT = 6;

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

  if (!editable && items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-heading text-mk-ink">Work</h2>
        <div className="flex items-center gap-3">
          {showViewAll ? (
            <Link
              href={`/vendors/${vendorSlug}/photos`}
              className="text-body font-medium text-mk-navy hover:underline"
            >
              All{hasMore ? ` ${allItems.length}` : ""}
            </Link>
          ) : null}
          {editable ? (
            <>
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
                className="inline-flex items-center gap-1.5 font-sans text-meta font-medium text-mk-navy hover:underline disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
              </button>
            </>
          ) : null}
        </div>
      </div>

      {uploadError ? (
        <p className="font-sans text-meta text-red-600">{uploadError}</p>
      ) : null}

      {items.length === 0 ? (
        <p className="font-sans text-meta text-mk-muted">
          Upload portfolio photos or videos.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-mk-line"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={item.alt}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />

              {item.isVideo ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
                    <Play className="ml-0.5 h-4 w-4 fill-mk-ink text-mk-ink" />
                  </span>
                </div>
              ) : null}

              {editable && onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="Remove portfolio item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
