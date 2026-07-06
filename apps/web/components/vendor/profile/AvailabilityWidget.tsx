import { ChevronLeft, ChevronRight } from "lucide-react";

type DayStatus = "open" | "booked" | "default";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

const OPEN_DAYS = new Set([3, 8, 10, 15, 22, 29]);
const BOOKED_DAYS = new Set([5, 12, 18, 25]);

function getDayStatus(day: number): DayStatus {
  if (BOOKED_DAYS.has(day)) return "booked";
  if (OPEN_DAYS.has(day)) return "open";
  return "default";
}

function buildJuly2026Grid(): (number | null)[] {
  const startOffset = 3;
  const cells: (number | null)[] = Array(startOffset).fill(null);
  for (let day = 1; day <= 31; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const CALENDAR_CELLS = buildJuly2026Grid();

function dayClass(status: DayStatus): string {
  if (status === "open") return "bg-[#DCFCE7] text-[#166534]";
  if (status === "booked") return "bg-[#FEE2E2] text-[#991B1B]";
  return "text-mk-muted";
}

export function AvailabilityWidget() {
  return (
    <div className="rounded-lg border border-mk-border bg-white px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-sans text-xs font-semibold text-mk-ink">
          Availability
        </h2>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Previous month"
            className="rounded p-0.5 text-mk-muted hover:text-mk-ink"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="font-sans text-[11px] font-medium text-mk-muted">
            Jul 2026
          </span>
          <button
            type="button"
            aria-label="Next month"
            className="rounded p-0.5 text-mk-muted hover:text-mk-ink"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-3 font-sans text-[10px] text-mk-muted">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#86EFAC]" />
          Open
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FCA5A5]" />
          Booked
        </span>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((day, index) => (
          <div
            key={`${day}-${index}`}
            className="py-0.5 text-center font-sans text-[9px] font-medium text-mk-muted"
          >
            {day}
          </div>
        ))}
        {CALENDAR_CELLS.map((day, index) => {
          if (day == null) {
            return <div key={`empty-${index}`} className="h-6" />;
          }
          return (
            <div
              key={day}
              className={`flex h-6 items-center justify-center rounded font-sans text-[10px] ${dayClass(getDayStatus(day))}`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <p className="mt-2 font-sans text-[10px] text-mk-muted">
        Booking requests — coming soon
      </p>
    </div>
  );
}
