"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Page, PageHeader } from "@/components/layout/page";
import type { VendorMediaItem } from "@/components/vendor/profile/HeroGallery";

interface VendorProfile {
  business_name: string;
  media: VendorMediaItem[];
}

async function fetchVendor(slug: string): Promise<VendorProfile> {
  const res = await apiClient.get<{ vendor: VendorProfile }>(
    `/v1/vendors/${slug}`,
  );
  if (res.error) throw new Error(res.error.message);
  return res.data!.vendor;
}

export default function VendorPhotosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["vendor", slug],
    queryFn: () => fetchVendor(slug),
  });

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const photos =
    data?.media.filter(
      (item) =>
        (item.section ?? "portfolio") === "portfolio" &&
        item.type !== "video" &&
        item.url,
    ) ?? [];

  const close = useCallback(() => setActiveIndex(null), []);
  const next = useCallback(
    () =>
      setActiveIndex((i) =>
        i == null ? i : (i + 1) % Math.max(photos.length, 1),
      ),
    [photos.length],
  );
  const prev = useCallback(
    () =>
      setActiveIndex((i) =>
        i == null
          ? i
          : (i - 1 + Math.max(photos.length, 1)) %
            Math.max(photos.length, 1),
      ),
    [photos.length],
  );

  useEffect(() => {
    if (activeIndex == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [activeIndex, close, next, prev]);

  const active = activeIndex != null ? photos[activeIndex] : null;

  return (
    <Page width="wide">
      <PageHeader
        title="Portfolio photos"
        back={{ href: `/vendors/${slug}`, label: "Back to profile" }}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-lg bg-mk-line"
            />
          ))}
        </div>
      ) : isError ? (
        <p className="text-body text-danger">
          {error instanceof Error ? error.message : "Couldn't load photos."}
        </p>
      ) : photos.length === 0 ? (
        <p className="text-body text-mk-muted">No photos yet.</p>
      ) : (
        <div className="columns-2 gap-3 md:columns-3 [&>button]:mb-3">
          {photos.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className="block w-full overflow-hidden rounded-lg bg-mk-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnail_url ?? item.url}
                alt={item.alt_text ?? ""}
                loading="lazy"
                className="block w-full"
              />
            </button>
          ))}
        </div>
      )}

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md p-2 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-6 w-6" />
          </button>
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-md p-2 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-2 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.url}
            alt={active.alt_text ?? ""}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      ) : null}
    </Page>
  );
}
