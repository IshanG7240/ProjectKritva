"use client";

import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { eachDateKeyInclusive, toDateKey, todayKey } from "./date-key";
import {
  indexAvailability,
  resolveDayState,
  type AvailabilityRow,
  type DayState,
} from "./availability-types";

type InteractionMode = "toggle" | "range";

type Props = {
  dates: AvailabilityRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isSaving: boolean;
  onRetry: () => void;
  onToggleDay: (dateKey: string, nextAvailable: boolean) => void;
  onBlockRange: (dateKeys: string[]) => void;
};

const STATE_LABEL: Record<DayState, string> = {
  available: "Open",
  blocked: "Blocked",
  booked: "Booked",
  past: "Past",
};

export function AvailabilityCalendar({
  dates,
  isLoading,
  isError,
  isSaving,
  onRetry,
  onToggleDay,
  onBlockRange,
}: Props) {
  const today = todayKey();
  const byDate = useMemo(() => indexAvailability(dates), [dates]);
  const [mode, setMode] = useState<InteractionMode>("toggle");
  const [range, setRange] = useState<DateRange | undefined>();
  const [month, setMonth] = useState<Date>(() => new Date());

  const blockedMatcher = useMemo(
    () => (date: Date) =>
      resolveDayState(toDateKey(date), byDate, today) === "blocked",
    [byDate, today],
  );
  const bookedMatcher = useMemo(
    () => (date: Date) =>
      resolveDayState(toDateKey(date), byDate, today) === "booked",
    [byDate, today],
  );
  const pastMatcher = useMemo(
    () => (date: Date) =>
      resolveDayState(toDateKey(date), byDate, today) === "past",
    [byDate, today],
  );
  const todayMatcher = useMemo(
    () => (date: Date) => toDateKey(date) === today,
    [today],
  );

  const rangeKeys = useMemo(() => {
    if (!range?.from || !range.to) return [];
    return eachDateKeyInclusive(toDateKey(range.from), toDateKey(range.to));
  }, [range]);

  const blockableInRange = useMemo(
    () =>
      rangeKeys.filter(
        (key) => resolveDayState(key, byDate, today) === "available",
      ),
    [rangeKeys, byDate, today],
  );

  function handleDayClick(date: Date) {
    if (isSaving || mode === "range") return;
    const key = toDateKey(date);
    const state = resolveDayState(key, byDate, today);
    if (state === "past") return;
    if (state === "booked") return;
    if (state === "blocked") {
      onToggleDay(key, true);
      return;
    }
    onToggleDay(key, false);
  }

  function handleApplyRange() {
    if (blockableInRange.length === 0) return;
    onBlockRange(blockableInRange);
    setRange(undefined);
    setMode("toggle");
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[22rem] items-center justify-center rounded-lg border border-mk-border bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-mk-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-mk-border bg-white px-4 py-8 text-center">
        <p className="text-body text-mk-ink">
          Couldn&apos;t load your calendar.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={onRetry}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "toggle" ? "default" : "outline"}
          className="min-h-10"
          disabled={isSaving}
          onClick={() => {
            setMode("toggle");
            setRange(undefined);
          }}
        >
          Tap to toggle
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "range" ? "default" : "outline"}
          className="min-h-10"
          disabled={isSaving}
          onClick={() => {
            setMode("range");
            setRange(undefined);
          }}
        >
          Block a range
        </Button>
        {isSaving ? (
          <span className="inline-flex items-center gap-1.5 font-sans text-label text-mk-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving…
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "rounded-lg border border-mk-border bg-white p-2 sm:p-3",
          isSaving && "pointer-events-none opacity-70",
        )}
      >
        {mode === "toggle" ? (
          <Calendar
            month={month}
            onMonthChange={setMonth}
            onDayClick={handleDayClick}
            showOutsideDays={false}
            className="w-full [--cell-size:2.75rem] sm:[--cell-size:3rem]"
            modifiers={{
              blocked: blockedMatcher,
              booked: bookedMatcher,
              pastDay: pastMatcher,
              todayCell: todayMatcher,
            }}
            modifiersClassNames={{
              blocked:
                "bg-rose-100 text-rose-950 [&_button]:bg-rose-100 [&_button]:text-rose-950",
              booked:
                "bg-mk-navy/15 text-mk-navy [&_button]:bg-mk-navy/15 [&_button]:text-mk-navy [&_button]:font-semibold",
              pastDay:
                "opacity-40 [&_button]:opacity-40 [&_button]:pointer-events-none",
              todayCell:
                "[&_button]:ring-2 [&_button]:ring-mk-navy [&_button]:ring-offset-1",
            }}
            disabled={(date) => {
              const state = resolveDayState(toDateKey(date), byDate, today);
              return state === "past" || state === "booked";
            }}
          />
        ) : (
          <Calendar
            mode="range"
            month={month}
            onMonthChange={setMonth}
            selected={range}
            onSelect={setRange}
            showOutsideDays={false}
            className="w-full [--cell-size:2.75rem] sm:[--cell-size:3rem]"
            modifiers={{
              blocked: blockedMatcher,
              booked: bookedMatcher,
              pastDay: pastMatcher,
              todayCell: todayMatcher,
            }}
            modifiersClassNames={{
              blocked:
                "bg-rose-100 text-rose-950 [&_button]:bg-rose-100 [&_button]:text-rose-950",
              booked:
                "bg-mk-navy/15 text-mk-navy [&_button]:bg-mk-navy/15 [&_button]:text-mk-navy [&_button]:font-semibold",
              pastDay:
                "opacity-40 [&_button]:opacity-40 [&_button]:pointer-events-none",
              todayCell:
                "[&_button]:ring-2 [&_button]:ring-mk-navy [&_button]:ring-offset-1",
            }}
            disabled={(date) => {
              const state = resolveDayState(toDateKey(date), byDate, today);
              return state === "past" || state === "booked";
            }}
          />
        )}
      </div>

      {mode === "range" ? (
        <div className="flex flex-col gap-2 rounded-lg border border-mk-border bg-mk-app px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-meta text-mk-ink">
            {range?.from && range.to
              ? blockableInRange.length > 0
                ? `Block ${blockableInRange.length} open day${blockableInRange.length === 1 ? "" : "s"} in this range.`
                : "No open days in this range to block."
              : "Tap a start day, then an end day."}
          </p>
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={isSaving || blockableInRange.length === 0}
            onClick={handleApplyRange}
          >
            Block days
          </Button>
        </div>
      ) : (
        <p className="font-sans text-meta text-mk-muted">
          Tap an open day to block it. Tap a blocked day to open it again.
          Booked days stay locked.
        </p>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-meta text-mk-muted">
        {(Object.keys(STATE_LABEL) as DayState[]).map((state) => (
          <li key={state} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block size-2.5 rounded-md",
                state === "available" && "border border-mk-border bg-white",
                state === "blocked" && "bg-rose-300",
                state === "booked" && "bg-mk-navy/50",
                state === "past" && "bg-mk-muted/40",
              )}
              aria-hidden
            />
            {STATE_LABEL[state]}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-md ring-2 ring-mk-navy"
            aria-hidden
          />
          Today
        </li>
      </ul>
    </div>
  );
}
