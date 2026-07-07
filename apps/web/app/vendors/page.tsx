"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { VendorListItem } from "@kritva/types/vendor";
import { apiClient } from "@/lib/api-client";
import { AppNav } from "@/components/layout/app-nav";
import { Footer } from "@/components/vendor/profile/Footer";
import { VendorCard, VendorCardSkeletonGrid } from "@/components/vendor/VendorCard";
import {
  DEFAULT_VENDOR_FILTERS,
  VendorDirectoryFilters,
  type VendorFilters,
} from "@/components/vendor/VendorDirectoryFilters";

const PAGE_SIZE = 12;
const VENDOR_LIST_STALE_MS = 5 * 60 * 1000;

interface VendorsResponse {
  vendors: VendorListItem[];
}

interface VendorQueryParams {
  q?: string;
  category?: string;
  city_id?: string;
  price_min?: number;
  price_max?: number;
  limit: number;
  offset: number;
}

function rupeesToPaisa(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const rupees = Number(trimmed);
  if (!Number.isFinite(rupees) || rupees < 0) return undefined;
  return Math.round(rupees * 100);
}

function buildFilterParams(
  filters: VendorFilters,
): Omit<VendorQueryParams, "limit" | "offset"> {
  const params: Omit<VendorQueryParams, "limit" | "offset"> = {};

  const q = filters.q.trim();
  if (q) params.q = q;

  if (filters.category) params.category = filters.category;
  if (filters.city_id) params.city_id = filters.city_id;

  const priceMin = rupeesToPaisa(filters.price_min_rupees);
  const priceMax = rupeesToPaisa(filters.price_max_rupees);
  if (priceMin != null) params.price_min = priceMin;
  if (priceMax != null) params.price_max = priceMax;

  return params;
}

function buildQueryParams(filters: VendorFilters, offset: number): VendorQueryParams {
  return {
    ...buildFilterParams(filters),
    limit: PAGE_SIZE,
    offset,
  };
}

function toSearchParams(params: VendorQueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  return search.toString();
}

async function fetchVendorPage(params: VendorQueryParams) {
  const res = await apiClient.get<VendorsResponse>(
    `/v1/vendors?${toSearchParams(params)}`,
  );

  if (res.error) {
    throw new Error(res.error.message);
  }

  return {
    vendors: res.data?.vendors ?? [],
    pagination: res.meta?.pagination ?? {
      totalCount: 0,
      limit: params.limit,
      offset: params.offset,
      hasNextPage: false,
    },
  };
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default function VendorsPage() {
  const [filters, setFilters] = useState<VendorFilters>(DEFAULT_VENDOR_FILTERS);
  const debouncedFilters = useDebouncedValue(filters, 300);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const queryKey = useMemo(
    () => ["vendors", buildFilterParams(debouncedFilters)] as const,
    [debouncedFilters],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchVendorPage(buildQueryParams(debouncedFilters, pageParam)),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? (lastPage.pagination.offset ?? 0) + lastPage.pagination.limit
        : undefined,
    staleTime: VENDOR_LIST_STALE_MS,
  });

  const vendors = data?.pages.flatMap((page) => page.vendors) ?? [];
  const totalCount = data?.pages[0]?.pagination.totalCount;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="flex min-h-screen flex-col bg-mk-bg">
      <AppNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-10 pt-8">
        <VendorDirectoryFilters
          filters={filters}
          onChange={setFilters}
          totalCount={totalCount}
          isFetching={isFetching && !isLoading}
        />

        {isLoading ? (
          <VendorCardSkeletonGrid />
        ) : isError ? (
          <p className="font-sans text-sm text-red-700">
            Error loading vendors:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        ) : vendors.length === 0 ? (
          <p className="font-sans text-sm text-mk-muted">No vendors found.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {vendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  id={vendor.id}
                  business_name={vendor.business_name}
                  slug={vendor.slug}
                  category={vendor.category}
                  avg_rating={vendor.avg_rating}
                  rating_count={vendor.rating_count}
                  booking_count={vendor.booking_count}
                  city_id={vendor.city_id}
                  price_min={vendor.price_min}
                  price_max={vendor.price_max}
                  unit={vendor.unit}
                />
              ))}
            </div>

            <div ref={loadMoreRef} className="mt-8 flex justify-center py-4">
              {isFetchingNextPage && (
                <p className="font-sans text-sm text-mk-muted">Loading more…</p>
              )}
              {!hasNextPage && vendors.length > 0 && (
                <p className="font-sans text-sm text-mk-muted">
                  You&apos;ve seen all matching vendors.
                </p>
              )}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
