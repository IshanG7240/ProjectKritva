"use client";

import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const VENDOR_CITIES = [{ id: "delhi-ncr", label: "Delhi NCR" }] as const;

export interface VendorFilters {
  q: string;
  category: string;
  city_id: string;
  date: string;
  /** Kept for URL backwards-compat; not shown in UI. */
  price_min_rupees: string;
  price_max_rupees: string;
  sort: "best" | "cheapest";
}

export const DEFAULT_VENDOR_FILTERS: VendorFilters = {
  q: "",
  category: "photography",
  city_id: "delhi-ncr",
  date: "",
  price_min_rupees: "",
  price_max_rupees: "",
  sort: "best",
};

interface VendorDirectoryFiltersProps {
  filters: VendorFilters;
  onChange: (filters: VendorFilters) => void;
  totalCount?: number;
  isFetching: boolean;
}

const BUDGET_PRESETS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "₹15k", value: "15000" },
  { label: "₹25k", value: "25000" },
  { label: "₹45k", value: "45000" },
  { label: "₹75k+", value: "75000" },
];

export function serializeFiltersForUrl(filters: VendorFilters): string {
  const next = new URLSearchParams();
  if (filters.q.trim()) next.set("q", filters.q.trim());
  if (filters.category) next.set("category", filters.category);
  if (filters.city_id) next.set("city_id", filters.city_id);
  if (filters.date) next.set("date", filters.date);
  if (filters.price_max_rupees)
    next.set("price_max_rupees", filters.price_max_rupees);
  if (filters.sort && filters.sort !== "best") next.set("sort", filters.sort);
  return next.toString();
}

export function filtersFromUrl(searchParams: URLSearchParams): VendorFilters {
  const sortRaw = searchParams.get("sort");
  return {
    ...DEFAULT_VENDOR_FILTERS,
    q: searchParams.get("q") ?? DEFAULT_VENDOR_FILTERS.q,
    category: searchParams.get("category") ?? DEFAULT_VENDOR_FILTERS.category,
    city_id: searchParams.get("city_id") ?? DEFAULT_VENDOR_FILTERS.city_id,
    date: searchParams.get("date") ?? "",
    price_min_rupees: "",
    price_max_rupees: searchParams.get("price_max_rupees") ?? "",
    sort: sortRaw === "cheapest" ? "cheapest" : "best",
  };
}

/** Short label — "Sat 14 Feb". */
export function formatFilterDateLabel(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function isoFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromIso(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatBudgetLabel(rupees: string): string {
  if (!rupees) return "Any budget";
  const num = Number(rupees);
  if (!Number.isFinite(num) || num <= 0) return "Any budget";
  if (num >= 100_000) return `₹${(num / 100_000).toFixed(num % 100_000 === 0 ? 0 : 1)}L`;
  if (num >= 1_000) return `₹${Math.round(num / 1_000)}k`;
  return `₹${num}`;
}

const pillBase =
  "inline-flex items-center h-11 justify-center gap-1.5 rounded-full border px-4 text-body outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 whitespace-nowrap";

const pillIdle = "border-mk-border bg-white text-mk-ink hover:bg-mk-surface-2";
const pillActive =
  "border-mk-navy bg-mk-navy text-white hover:bg-mk-navy-hover";

const popupClass =
  "z-50 rounded-lg border border-mk-border bg-white p-3 text-mk-ink shadow-pop outline-none data-[open]:animate-in data-[open]:fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0";

function DatePill({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = dateFromIso(value);
  const label = value ? formatFilterDateLabel(value) : "Any date";
  const today = React.useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const onSelect = (day: Date | undefined) => {
    if (!day) {
      onChange("");
    } else {
      onChange(isoFromDate(day));
    }
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(pillBase, value ? pillActive : pillIdle)}
        aria-label="Filter by date"
      >
        <span>{label}</span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            className="ml-1 rounded-full px-1 text-white/80 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                e.preventDefault();
                onChange("");
              }
            }}
          >
            ×
          </span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start">
          <Popover.Popup className={popupClass}>
            <Calendar
              mode="single"
              selected={selected}
              onSelect={onSelect}
              disabled={{ before: today }}
              defaultMonth={selected ?? today}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function BudgetPill({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);

  const label = formatBudgetLabel(value);
  const applyDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onChange("");
      setOpen(false);
      return;
    }
    const num = Number(trimmed);
    if (Number.isFinite(num) && num > 0) {
      onChange(String(Math.round(num)));
      setOpen(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(pillBase, value ? pillActive : pillIdle)}
        aria-label="Filter by budget"
      >
        <span>{label}</span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear budget"
            className="ml-1 rounded-full px-1 text-white/80 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                e.preventDefault();
                onChange("");
              }
            }}
          >
            ×
          </span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start">
          <Popover.Popup className={cn(popupClass, "w-72")}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {BUDGET_PRESETS.map((preset) => {
                  const active = value === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        onChange(preset.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "h-9 rounded-full border px-3 text-meta transition-colors",
                        active
                          ? "border-mk-navy bg-mk-navy text-white"
                          : "border-mk-border bg-white text-mk-ink hover:bg-mk-surface-2",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1.5">
                <label className="text-label uppercase text-mk-muted">
                  Custom max (₹)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={draft}
                    onChange={(e) =>
                      setDraft(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyDraft();
                      }
                    }}
                    placeholder="e.g. 45000"
                    className="h-10"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={applyDraft}
                  >
                    Apply
                  </Button>
                </div>
              </div>
              {value ? (
                <button
                  type="button"
                  className="text-meta text-mk-navy hover:underline"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  Clear budget
                </button>
              ) : null}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function VendorDirectoryFilters({
  filters,
  onChange,
  totalCount,
  isFetching,
}: VendorDirectoryFiltersProps) {
  const setField = <K extends keyof VendorFilters>(
    key: K,
    value: VendorFilters[K],
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    Boolean(filters.q) ||
    Boolean(filters.date) ||
    Boolean(filters.price_max_rupees) ||
    filters.sort !== "best";

  const dateLabel = filters.date ? formatFilterDateLabel(filters.date) : null;

  let resultLine: string | null = null;
  if (!isFetching && totalCount != null) {
    if (totalCount === 0) {
      resultLine = dateLabel
        ? `No photographers free on ${dateLabel}`
        : "No matches";
    } else {
      const noun = `photographer${totalCount === 1 ? "" : "s"}`;
      resultLine = dateLabel
        ? `${totalCount} ${noun} free on ${dateLabel}`
        : `${totalCount} ${noun}`;
    }
  }

  return (
    <>
      <div className="sticky top-14 z-30 -mx-4 mb-4 border-b border-mk-border/70 bg-mk-bg/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-mk-bg/80 sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mk-muted"
              size={16}
              aria-hidden
            />
            <Input
              type="search"
              value={filters.q}
              onChange={(e) => setField("q", e.target.value)}
              placeholder="Search by name or style"
              className="h-11 pl-9"
            />
          </div>

          <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            <DatePill
              value={filters.date}
              onChange={(v) => setField("date", v)}
            />
            <BudgetPill
              value={filters.price_max_rupees}
              onChange={(v) => setField("price_max_rupees", v)}
            />
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => onChange(DEFAULT_VENDOR_FILTERS)}
                className="shrink-0 whitespace-nowrap text-meta font-medium text-mk-navy underline-offset-4 hover:underline"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <header className="mb-4">
        <h1 className="text-title text-mk-ink">Find a photographer</h1>
      </header>

      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-meta text-mk-muted">
          {resultLine ?? (isFetching ? "Loading…" : "")}
        </p>
        <button
          type="button"
          onClick={() =>
            setField("sort", filters.sort === "best" ? "cheapest" : "best")
          }
          className="shrink-0 text-meta text-mk-muted underline-offset-4 hover:text-mk-ink hover:underline focus-visible:underline outline-none"
          aria-label={`Sort by ${filters.sort === "best" ? "best first" : "cheapest first"}. Click to change.`}
        >
          Sort: <span className="text-mk-ink">{filters.sort === "best" ? "Best first" : "Cheapest first"}</span>
        </button>
      </div>
    </>
  );
}
