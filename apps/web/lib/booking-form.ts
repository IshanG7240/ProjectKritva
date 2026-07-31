const RETURN_TO_KEY = "kritva:returnTo";
const ENQUIRY_DRAFT_KEY = "kritva:enquiryDraft";

export const DEFAULT_VENDOR_LEAD_TIME_DAYS = 7;

export type EnquiryDraft = {
  vendorId: string;
  vendorSlug: string;
  step: 1 | 2 | 3;
  event_date: string;
  event_type: string;
  guest_count: string;
  venue_area: string;
  coverage_hours: string;
  shooters: string;
  deliverables: string[];
  delivery_days: string;
  package_id: string;
  quantity: string;
  notes: string;
};

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMinEventDate(leadTimeDays: number): string {
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() + leadTimeDays);
  return formatLocalDate(minDate);
}

export function isEventDateValid(
  eventDate: string,
  leadTimeDays: number,
): boolean {
  return eventDate >= getMinEventDate(leadTimeDays);
}

export function isSafeReturnTo(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export function storeReturnTo(path: string): void {
  if (typeof window === "undefined" || !isSafeReturnTo(path)) return;
  sessionStorage.setItem(RETURN_TO_KEY, path);
}

export function consumeReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  const path = sessionStorage.getItem(RETURN_TO_KEY);
  sessionStorage.removeItem(RETURN_TO_KEY);
  if (!path || !isSafeReturnTo(path)) return null;
  return path;
}

export function buildLoginUrl(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function isEnquiryDraft(value: unknown): value is EnquiryDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.vendorId === "string" &&
    typeof d.vendorSlug === "string" &&
    (d.step === 1 || d.step === 2 || d.step === 3) &&
    typeof d.event_date === "string" &&
    typeof d.event_type === "string" &&
    typeof d.guest_count === "string" &&
    typeof d.venue_area === "string" &&
    typeof d.coverage_hours === "string" &&
    typeof d.shooters === "string" &&
    Array.isArray(d.deliverables) &&
    d.deliverables.every((x) => typeof x === "string") &&
    typeof d.delivery_days === "string" &&
    typeof d.package_id === "string" &&
    typeof d.quantity === "string" &&
    typeof d.notes === "string"
  );
}

export function storeEnquiryDraft(draft: EnquiryDraft): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ENQUIRY_DRAFT_KEY, JSON.stringify(draft));
}

/** Read draft without clearing — used to restore after login. */
export function peekEnquiryDraft(): EnquiryDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ENQUIRY_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isEnquiryDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Restore draft for this vendor without clearing.
 * Clear only after a successful send via `clearEnquiryDraft`.
 */
export function restoreEnquiryDraft(vendorId: string): EnquiryDraft | null {
  const draft = peekEnquiryDraft();
  if (!draft || draft.vendorId !== vendorId) return null;
  return draft;
}

/** @deprecated Prefer restoreEnquiryDraft + clearEnquiryDraft on success. */
export function consumeEnquiryDraft(vendorId: string): EnquiryDraft | null {
  const draft = restoreEnquiryDraft(vendorId);
  if (!draft) return null;
  clearEnquiryDraft();
  return draft;
}

export function clearEnquiryDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ENQUIRY_DRAFT_KEY);
}

export function formatInr(paisa: number): string {
  return `₹${Math.round(paisa / 100).toLocaleString("en-IN")}`;
}

export function formatEventDate(raw: string): string {
  const iso = raw.includes("T") ? raw.slice(0, 10) : raw;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function customerFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "Customer";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function formatPackageSummary(
  details: Array<{ name: string }> | null | undefined,
): string {
  if (!details?.length) return "—";
  return details.map((d) => d.name).join(", ");
}

/** @deprecated Use formatPackageSummary */
export const formatServiceSummary = formatPackageSummary;
