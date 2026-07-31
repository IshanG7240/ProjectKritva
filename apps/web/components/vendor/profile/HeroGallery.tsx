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

    setUploadError(null);
    try {
      await onUpload(files.slice(0, MAX_BANNER_PHOTOS - imageMedia.length));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 pt-4 sm:px-6 lg:px-8">
      {editable ? (
        <div className="mb-2 flex flex-wrap items-center gap-3">
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
            className="inline-flex items-center gap-2 font-sans text-meta font-medium text-mk-navy hover:underline disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload photos
          </button>
          {uploadError ? (
            <p className="font-sans text-meta text-red-600">{uploadError}</p>
          ) : null}
        </div>
      ) : null}

      {visibleMedia.length > 0 ? (
        <div
          className="grid aspect-[3/2] grid-cols-2 grid-rows-2 gap-1.5 overflow-hidden rounded-lg md:grid-cols-4 md:gap-2"
        >
          {visibleMedia.map((item, index) => {
            const cell = layout[index] ?? { colSpan: 1, rowSpan: 1 };
            return (
              <div
                key={item.id}
                className="relative min-h-0 overflow-hidden bg-mk-line"
                style={{
                  gridColumn: `span ${cell.colSpan}`,
                  gridRow: `span ${cell.rowSpan}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnail_url ?? item.url}
                  alt={item.alt_text ?? ""}
                  className="h-full w-full object-cover"
                />
                {editable && onRemove ? (
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="Remove image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : editable ? (
        <div className="flex aspect-[3/2] items-center justify-center rounded-lg bg-mk-line">
          <p className="text-body text-mk-muted">
            Upload photos for the hero gallery.
          </p>
        </div>
      ) : (
        <div className="aspect-[3/2] rounded-lg bg-mk-line" />
      )}
    </section>
  );
}
