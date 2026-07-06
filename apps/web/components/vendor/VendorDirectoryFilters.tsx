"use client";

import { VENDOR_CATEGORIES } from "@kritva/types/enums";

export const VENDOR_CITIES = [{ id: "delhi-ncr", label: "Delhi NCR" }] as const;

export interface VendorFilters {
  q: string;
  category: string;
  city_id: string;
  price_min_rupees: string;
  price_max_rupees: string;
}

export const DEFAULT_VENDOR_FILTERS: VendorFilters = {
  q: "",
  category: "",
  city_id: "",
  price_min_rupees: "",
  price_max_rupees: "",
};

interface VendorDirectoryFiltersProps {
  filters: VendorFilters;
  onChange: (filters: VendorFilters) => void;
  totalCount?: number;
  isFetching: boolean;
}

const inputClass =
  "h-10 w-full rounded-[8px] border border-[#DDD5C4] bg-white px-3 font-sans text-sm text-[#1C1A16] placeholder:text-[#7A7060] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D3557]";

const selectClass =
  "h-10 w-full rounded-[8px] border border-[#DDD5C4] bg-white px-3 font-sans text-sm text-[#1C1A16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D3557]";

export function VendorDirectoryFilters({
  filters,
  onChange,
  totalCount,
  isFetching,
}: VendorDirectoryFiltersProps) {
  const setField = <K extends keyof VendorFilters>(key: K, value: VendorFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.q ||
    filters.category ||
    filters.city_id ||
    filters.price_min_rupees ||
    filters.price_max_rupees;

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1C1A16]">Find Vendors</h1>
          {totalCount != null && (
            <p className="mt-1 font-sans text-sm text-[#7A7060]">
              {isFetching ? "Searching…" : `${totalCount} vendor${totalCount === 1 ? "" : "s"} found`}
            </p>
          )}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_VENDOR_FILTERS)}
            className="self-start font-sans text-sm font-medium text-[#1D3557] underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block lg:col-span-2">
          <span className="sr-only">Search vendors</span>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => setField("q", e.target.value)}
            placeholder="Search by name or category…"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="sr-only">Category</span>
          <select
            value={filters.category}
            onChange={(e) => setField("category", e.target.value)}
            className={selectClass}
          >
            <option value="">All categories</option>
            {VENDOR_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Location</span>
          <select
            value={filters.city_id}
            onChange={(e) => setField("city_id", e.target.value)}
            className={selectClass}
          >
            <option value="">All locations</option>
            {VENDOR_CITIES.map((city) => (
              <option key={city.id} value={city.id}>
                {city.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <label className="block flex-1">
            <span className="sr-only">Minimum price in rupees</span>
            <input
              type="number"
              min={0}
              value={filters.price_min_rupees}
              onChange={(e) => setField("price_min_rupees", e.target.value)}
              placeholder="Min ₹"
              className={inputClass}
            />
          </label>
          <label className="block flex-1">
            <span className="sr-only">Maximum price in rupees</span>
            <input
              type="number"
              min={0}
              value={filters.price_max_rupees}
              onChange={(e) => setField("price_max_rupees", e.target.value)}
              placeholder="Max ₹"
              className={inputClass}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
