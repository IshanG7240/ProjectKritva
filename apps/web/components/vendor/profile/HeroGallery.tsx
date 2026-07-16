"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";

export interface VendorMediaItem {
  id: string;
  url: string;
  thumbnail_url?: string | null;
  alt_text?: string | null;
  type?: string;
  section?: string;
}

interface HeroGalleryProps {
  media?: VendorMediaItem[];
  editable?: boolean;
  uploading?: boolean;
  onUpload?: (files: File[]) => Promise<void>;
  onRemove?: (mediaId: string) => void;
}

interface GalleryCell {
  colSpan: number;
  rowSpan: number;
}

const BANNER_GRID_HEIGHT = "h-[280px] md:h-[400px]";
export const MAX_BANNER_PHOTOS = 5;

function getGalleryLayout(count: number): GalleryCell[] {
  switch (count) {
    case 1:
      return [{ colSpan: 4, rowSpan: 2 }];
    case 2:
      return [
        { colSpan: 2, rowSpan: 2 },
        { colSpan: 2, rowSpan: 2 },
      ];
    case 3:
      return [
        { colSpan: 2, rowSpan: 2 },
        { colSpan: 2, rowSpan: 1 },
        { colSpan: 2, rowSpan: 1 },
      ];
    case 4:
      return [
        { colSpan: 2, rowSpan: 1 },
        { colSpan: 2, rowSpan: 1 },
        { colSpan: 2, rowSpan: 1 },
        { colSpan: 2, rowSpan: 1 },
      ];
    case 5:
      return [
        { colSpan: 2, rowSpan: 2 },
        { colSpan: 1, rowSpan: 1 },
        { colSpan: 1, rowSpan: 1 },
        { colSpan: 1, rowSpan: 1 },
        { colSpan: 1, rowSpan: 1 },
      ];
    default:
      return Array.from({ length: count }, (_, index) => {
        if (index === 0) return { colSpan: 2, rowSpan: 2 };
        if (index % 5 === 0) return { colSpan: 2, rowSpan: 1 };
        return { colSpan: 1, rowSpan: 1 };
      });
  }
}

function GalleryImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`h-full w-full ${className ?? "object-cover"}`} />
  );
}

export function HeroGallery({
  media,
  editable = false,
  uploading = false,
  onUpload,
  onRemove,
}: HeroGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const imageMedia =
    media?.filter((item) => item.type !== "video" && item.url) ?? [];

  const visibleMedia = imageMedia.slice(0, MAX_BANNER_PHOTOS);
  const atPhotoLimit = imageMedia.length >= MAX_BANNER_PHOTOS;
  const layout = getGalleryLayout(visibleMedia.length);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !onUpload || atPhotoLimit) return;

    const remaining = MAX_BANNER_PHOTOS - imageMedia.length;
    const toUpload = files.slice(0, remaining);

    setUploadError(null);
    try {
      await onUpload(toUpload);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  function renderRemoveButton(mediaId?: string) {
    if (!editable || !onRemove || !mediaId) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={() => onRemove(mediaId)}
        className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        aria-label="Remove image"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-5">
      {editable && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={uploading || atPhotoLimit}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-mk-border bg-white px-3 py-2 font-sans text-sm font-medium text-mk-ink hover:bg-[#FAF7F0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload photos
          </button>
          {atPhotoLimit && (
            <p className="font-sans text-sm text-mk-muted">
              Gallery limit reached ({MAX_BANNER_PHOTOS} photos).
            </p>
          )}
          {uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-mk-border bg-[#EDE8DE] p-1.5 shadow-[0_4px_24px_rgba(28,26,22,0.06)] md:p-2">
        {visibleMedia.length > 0 ? (
          <div
            className={`grid grid-cols-2 grid-rows-2 gap-1.5 md:grid-cols-4 md:gap-2 ${BANNER_GRID_HEIGHT}`}
          >
            {visibleMedia.map((item, index) => {
              const cell = layout[index] ?? { colSpan: 1, rowSpan: 1 };
              const src = item.thumbnail_url ?? item.url;
              const alt = item.alt_text ?? "Gallery image";

              return (
                <div
                  key={item.id}
                  className="relative min-h-0 overflow-hidden rounded-lg"
                  style={{
                    gridColumn: `span ${cell.colSpan}`,
                    gridRow: `span ${cell.rowSpan}`,
                  }}
                >
                  <GalleryImage src={src} alt={alt} />
                  {renderRemoveButton(item.id)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-mk-border bg-[#FAF7F0] md:h-[400px]">
            <p className="px-4 text-center font-sans text-sm text-mk-muted">
              {editable
                ? "Upload photos to build your hero gallery."
                : "No gallery photos yet."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
