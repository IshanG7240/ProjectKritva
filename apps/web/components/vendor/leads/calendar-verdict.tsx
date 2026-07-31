"use client";

import { formatEventDate } from "@/lib/booking-form";
import type { AvailabilityDate } from "./lead-types";

function toIsoDate(raw: string): string {
  return raw.includes("T") ? raw.slice(0, 10) : raw;
}

function shiftIsoDate(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isBlocked(row: AvailabilityDate | undefined): boolean {
  if (!row) return false;
  return row.is_available === false || row.booking_id != null;
}

export type CalendarVerdictKind = "free" | "blocked" | "busy_near" | "unknown";

export function resolveCalendarVerdict(
  eventDate: string,
  dates: AvailabilityDate[] | undefined,
): { kind: CalendarVerdictKind; message: string } {
  if (!dates) {
    return { kind: "unknown", message: "" };
  }

  const iso = toIsoDate(eventDate);
  const byDate = new Map(dates.map((r) => [toIsoDate(r.date), r]));
  const day = byDate.get(iso);

  if (isBlocked(day)) {
    return {
      kind: "blocked",
      message: `You're booked on ${formatEventDate(iso)}.`,
    };
  }

  const prev = byDate.get(shiftIsoDate(iso, -1));
  const next = byDate.get(shiftIsoDate(iso, 1));
  if (isBlocked(prev)) {
    return {
      kind: "busy_near",
      message: `Careful — you have another job on ${formatEventDate(shiftIsoDate(iso, -1))}.`,
    };
  }
  if (isBlocked(next)) {
    return {
      kind: "busy_near",
      message: `Careful — you have another job on ${formatEventDate(shiftIsoDate(iso, 1))}.`,
    };
  }

  return {
    kind: "free",
    message: `You're free on ${formatEventDate(iso)}.`,
  };
}

const STYLES: Record<Exclude<CalendarVerdictKind, "unknown">, string> = {
  free: "text-mk-navy",
  blocked: "text-red-800",
  busy_near: "text-amber-900",
};

export function CalendarVerdict({
  eventDate,
  dates,
  isLoading,
}: {
  eventDate: string;
  dates: AvailabilityDate[] | undefined;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <p className="font-sans text-meta text-mk-muted">Checking your calendar…</p>
    );
  }

  const verdict = resolveCalendarVerdict(eventDate, dates);
  if (verdict.kind === "unknown" || !verdict.message) return null;

  return (
    <p
      className={`font-sans text-meta font-medium ${STYLES[verdict.kind]}`}
      role="status"
    >
      {verdict.message}
    </p>
  );
}
