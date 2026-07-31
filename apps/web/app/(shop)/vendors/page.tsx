"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { VendorListItem } from "@kritva/types/vendor";
import { apiClient } from "@/lib/api-client";
import { Footer } from "@/components/vendor/profile/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Page } from "@/components/layout/page";
import { VendorCard, VendorCardSkeletonGrid } from "@/components/vendor/VendorCard";
import {
  VendorDirectoryFilters,
  filtersFromUrl,
  formatFilterDateLabel,
  serializeFiltersForUrl,
  type VendorFilters,
} from "@/components/vendor/VendorDirectoryFilters";

function availabilityLabelForVendor(
  vendor: VendorListItem,
  dateLabel: string | null,
): string | null {
  if (!dateLabel) return null;
  const hint = vendor as VendorListItem & {
    is_available?: boolean;
    available?: boolean;
  };
  if (hint.is_available === false || hint.available === false) return null;
  return dateLabel;
}

const PAGE_SIZE = 12;
const VENDOR_LIST_STALE_MS = 5 * 60 * 1000;

interface VendorsResponse {
  vendors: VendorListItem[];
}

interface VendorQueryParams {
  q?: string;
  category?: string;
  city_id?: string;
  date?: string;
  price_max?: number;
  sort?: "best" | "cheapest";
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
  if (filters.date) params.date = filters.date;
  if (filters.sort) params.sort = filters.sort;

  const priceMax = rupeesToPaisa(filters.price_max_rupees);
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

function VendorDirectoryEmpty({
  filters,
  onClearDate,
}: {
  filters: VendorFilters;
  onClearDate: () => void;
}) {
  const [date, setDate] = useState(filters.date);
  const [budget, setBudget] = useState(filters.price_max_rupees);
  const [requirement, setRequirement] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const dateLabel = filters.date ? formatFilterDateLabel(filters.date) : null;
  const headline = dateLabel
    ? `No photographers free on ${dateLabel} yet`
    : "No photographers match these filters";

  return (
    <Card className="py-10">
      <div className="mx-auto grid max-w-4xl gap-8 px-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-3">
          <p className="text-heading text-mk-ink">{headline}</p>
          {filters.date ? (
            <Button variant="secondary" onClick={onClearDate}>
              Show all photographers
            </Button>
          ) : null}
          <p className="text-meta text-mk-muted">
            Tell us what you need and we&apos;ll try to match you with a
            photographer.
          </p>
        </div>

        {status === "sent" ? (
          <p className="text-body text-mk-ink">
            Request received{email ? ` — we'll reply at ${email}` : ""}.
          </p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setStatus("sending");
              const res = await apiClient.post("/v1/leads/supply-gap", {
                date: date || undefined,
                budget_rupees: budget || undefined,
                requirement,
                contact_email: email || undefined,
              });
              setStatus(res.error ? "error" : "sent");
            }}
          >
            <label className="block space-y-1.5">
              <span className="text-label uppercase text-mk-muted">
                Event date
              </span>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-label uppercase text-mk-muted">
                Budget (₹)
              </span>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 45000"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-label uppercase text-mk-muted">
                What do you need?
              </span>
              <textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                required
                rows={3}
                placeholder="Wedding, half day, Noida…"
                className="w-full resize-y rounded-md border border-mk-border bg-white px-3 py-2 text-body text-mk-ink placeholder:text-mk-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-label uppercase text-mk-muted">
                Your email (optional)
              </span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="so we can reply"
              />
            </label>
            {status === "error" ? (
              <p className="text-meta text-danger">
                Couldn&apos;t send. Try again in a moment.
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={status === "sending" || requirement.trim().length < 3}
              className="w-full"
            >
              {status === "sending" ? "Sending…" : "Send request"}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}

export default function VendorsPage() {
  return (
    <Suspense
      fallback={
        <>
          <Page width="wide">
            <VendorCardSkeletonGrid />
          </Page>
          <Footer />
        </>
      }
    >
      <VendorsPageContent />
    </Suspense>
  );
}

function VendorsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSnapshot = searchParams.toString();
  const lastWrittenUrl = useRef(urlSnapshot);

  const [filters, setFilters] = useState<VendorFilters>(() =>
    filtersFromUrl(searchParams),
  );
  const debouncedFilters = useDebouncedValue(filters, 300);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (urlSnapshot === lastWrittenUrl.current) return;
    lastWrittenUrl.current = urlSnapshot;
    setFilters(filtersFromUrl(searchParams));
  }, [urlSnapshot, searchParams]);

  useEffect(() => {
    const qs = serializeFiltersForUrl(filters);
    if (qs === lastWrittenUrl.current) return;
    lastWrittenUrl.current = qs;
    const href = qs ? `${pathname}?${qs}` : pathname;
    router.replace(href, { scroll: false });
  }, [filters, pathname, router]);

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
  const availableOnLabel = filters.date
    ? formatFilterDateLabel(filters.date)
    : null;

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
    <>
      <Page width="wide">
        <VendorDirectoryFilters
          filters={filters}
          onChange={setFilters}
          totalCount={totalCount}
          isFetching={isFetching && !isLoading}
        />

        {isLoading ? (
          <VendorCardSkeletonGrid />
        ) : isError ? (
          <Card className="mx-auto max-w-md space-y-4 p-8 text-center">
            <p className="text-heading text-mk-ink">
              Couldn&apos;t load photographers
            </p>
            <p className="text-meta text-mk-muted">
              {error instanceof Error
                ? error.message
                : "Something went wrong. Try again."}
            </p>
            <Button onClick={() => window.location.reload()}>Try again</Button>
          </Card>
        ) : vendors.length === 0 ? (
          <VendorDirectoryEmpty
            key={`${filters.date}:${filters.price_max_rupees}`}
            filters={filters}
            onClearDate={() => setFilters({ ...filters, date: "" })}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
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
                  unit={vendor.unit}
                  profile_photo_url={vendor.profile_photo_url}
                  cover_image={vendor.cover_image}
                  is_verified={vendor.is_verified}
                  is_mock={vendor.is_mock}
                  available_on_label={availabilityLabelForVendor(
                    vendor,
                    availableOnLabel,
                  )}
                />
              ))}
            </div>

            <div ref={loadMoreRef} className="mt-12 flex justify-center py-2">
              {isFetchingNextPage ? (
                <p className="text-meta text-mk-muted">Loading more…</p>
              ) : null}
            </div>
          </>
        )}
      </Page>
      <Footer />
    </>
  );
}
