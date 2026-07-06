"use client";

import { useRef, useState } from "react";
import Image from "next/image";
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
  onUpload?: (file: File) => Promise<void>;
  onRemove?: (mediaId: string) => void;
}

function isUnsplashUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

function GalleryImage({
  src,
  alt,
  priority,
  sizes,
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes: string;
  className?: string;
}) {
  if (isUnsplashUrl(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className={className ?? "object-cover"}
        sizes={sizes}
      />
    );
  }

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

  const mainItem = imageMedia[0];
  const mainSrc = mainItem?.url;
  const mainAlt = mainItem?.alt_text ?? "Featured event decor";
  const mainId = mainItem?.id;

  const smallSources = imageMedia.slice(1, 5).map((item) => ({
    src: item.thumbnail_url ?? item.url,
    alt: item.alt_text ?? "Event decor gallery image",
    id: item.id,
  }));

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onUpload) return;

    setUploadError(null);
    try {
      await onUpload(file);
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
            Upload photo
          </button>
          {uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-mk-border bg-[#EDE8DE] p-1.5 shadow-[0_4px_24px_rgba(28,26,22,0.06)] md:p-2">
        {mainSrc ? (
          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 md:grid-rows-2 md:gap-2">
            <div className="relative col-span-2 row-span-2 min-h-[240px] overflow-hidden rounded-lg md:min-h-[400px]">
              <GalleryImage
                src={mainSrc}
                alt={mainAlt}
                priority
                sizes="(max-width: 768px) 100vw, 720px"
              />
              {renderRemoveButton(mainId)}
            </div>

            {smallSources.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="relative min-h-[100px] overflow-hidden rounded-lg md:min-h-0"
              >
                <GalleryImage
                  src={item.src}
                  alt={item.alt}
                  sizes="(max-width: 768px) 50vw, 180px"
                />
                {renderRemoveButton(item.id)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-mk-border bg-[#FAF7F0] md:min-h-[320px]">
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
