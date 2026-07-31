export type AvailabilityRow = {
  date: string;
  is_available: boolean;
  booking_id: string | null;
};

export type AvailabilityPayload = {
  dates: AvailabilityRow[];
};

/** Visual / interaction state for a calendar day. */
export type DayState = "available" | "blocked" | "booked" | "past";

export function resolveDayState(
  dateKey: string,
  byDate: Map<string, AvailabilityRow>,
  today: string,
): DayState {
  if (dateKey < today) return "past";
  const row = byDate.get(dateKey);
  if (row?.booking_id) return "booked";
  if (row && row.is_available === false) return "blocked";
  // Absence from the table = available. Do not invent open-day rows.
  return "available";
}

export function indexAvailability(
  rows: AvailabilityRow[] | undefined,
): Map<string, AvailabilityRow> {
  const map = new Map<string, AvailabilityRow>();
  for (const row of rows ?? []) {
    map.set(row.date, row);
  }
  return map;
}
