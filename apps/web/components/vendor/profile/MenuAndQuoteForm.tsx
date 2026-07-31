"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { packageUnitAllowsMinQuantity } from "@kritva/types/enums";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import {
  buildLoginUrl,
  clearEnquiryDraft,
  DEFAULT_VENDOR_LEAD_TIME_DAYS,
  formatInr,
  getMinEventDate,
  isEventDateValid,
  restoreEnquiryDraft,
  storeEnquiryDraft,
  type EnquiryDraft,
} from "@/lib/booking-form";
import { formatUnit } from "@/lib/vendor-profile";
import type { VendorPackage } from "@/lib/vendor-profile";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EVENT_TYPES = [
  "wedding",
  "reception",
  "corporate",
  "college_fest",
  "hackathon",
  "birthday",
  "other",
] as const;

const EVENT_TYPE_LABELS: Record<(typeof EVENT_TYPES)[number], string> = {
  wedding: "Wedding",
  reception: "Reception",
  corporate: "Corporate",
  college_fest: "College fest",
  hackathon: "Hackathon",
  birthday: "Birthday",
  other: "Other",
};

const DELIVERABLE_OPTIONS = [
  "Edited photos",
  "Raw files",
  "Album",
  "Video",
  "Drone",
] as const;

const STEP_LABELS = ["Event", "What you need", "Package"] as const;

interface BookingFormValues {
  event_date: string;
  event_type: (typeof EVENT_TYPES)[number];
  guest_count: string;
  venue_area: string;
  coverage_hours: string;
  shooters: string;
  deliverables: string[];
  delivery_days: string;
  package_id: string;
  quantity: string;
  notes: string;
}

interface CreateBookingPayload {
  vendor_id: string;
  package_details: Array<{
    package_id: string;
    quantity: number;
  }>;
  event_date: string;
  event_type: string;
  guest_count?: number;
  notes?: string;
  city_id?: string;
}

async function createBooking(payload: CreateBookingPayload) {
  const res = await apiClient.post<{ booking: { id: string } }>(
    "/v1/bookings",
    payload,
  );
  if (res.error) throw new Error(res.error.message);
  if (!res.data?.booking?.id) {
    throw new Error("Booking was created but no id returned.");
  }
  return res.data.booking;
}

function buildBriefNotes(values: BookingFormValues): string | undefined {
  const lines: string[] = [];
  const area = values.venue_area.trim();
  if (area) lines.push(`Area: ${area}`);

  const hours = values.coverage_hours.trim();
  if (hours) lines.push(`Hours of coverage: ${hours}`);

  const shooters = values.shooters.trim();
  if (shooters) lines.push(`Photographers needed: ${shooters}`);

  if (values.deliverables.length > 0) {
    lines.push(`Deliverables: ${values.deliverables.join(", ")}`);
  }

  const delivery = values.delivery_days.trim();
  if (delivery) lines.push(`Needed by: ${delivery} days after the event`);

  const free = values.notes.trim().slice(0, 500);
  if (free) {
    if (lines.length > 0) lines.push("");
    lines.push(free);
  }

  const combined = lines.join("\n").trim();
  if (!combined) return undefined;
  return combined.slice(0, 2000);
}

const inputClassName =
  "h-11 w-full rounded-md border border-mk-border bg-mk-surface px-3 text-body text-mk-ink outline-none transition-colors placeholder:text-mk-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const labelClassName =
  "mb-1.5 block text-body font-medium text-mk-ink";

export interface MenuAndQuoteFormProps {
  vendorId: string;
  vendorSlug: string;
  packages: Pick<
    VendorPackage,
    "id" | "name" | "price" | "unit" | "min_quantity" | "inclusions"
  >[];
  leadTimeDays?: number;
  cityId?: string;
}

export function MenuAndQuoteForm({
  vendorId,
  vendorSlug,
  packages,
  leadTimeDays = DEFAULT_VENDOR_LEAD_TIME_DAYS,
  cityId = "delhi-ncr",
}: MenuAndQuoteFormProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const minEventDate = getMinEventDate(leadTimeDays);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<BookingFormValues>({
    defaultValues: {
      event_date: "",
      event_type: "wedding",
      guest_count: "",
      venue_area: "",
      coverage_hours: "",
      shooters: "",
      deliverables: [],
      delivery_days: "",
      package_id: packages[0]?.id ?? "",
      quantity: "1",
      notes: "",
    },
  });

  useEffect(() => {
    if (restored) return;
    const draft = restoreEnquiryDraft(vendorId);
    if (!draft) {
      setRestored(true);
      return;
    }

    setValue("event_date", draft.event_date);
    setValue(
      "event_type",
      (EVENT_TYPES as readonly string[]).includes(draft.event_type)
        ? (draft.event_type as BookingFormValues["event_type"])
        : "other",
    );
    setValue("guest_count", draft.guest_count);
    setValue("venue_area", draft.venue_area);
    setValue("coverage_hours", draft.coverage_hours);
    setValue("shooters", draft.shooters);
    setValue("deliverables", draft.deliverables);
    setValue("delivery_days", draft.delivery_days);
    setValue(
      "package_id",
      packages.some((p) => p.id === draft.package_id)
        ? draft.package_id
        : (packages[0]?.id ?? ""),
    );
    setValue("quantity", draft.quantity);
    setValue("notes", draft.notes);
    setStep(draft.step);
    setRestored(true);
  }, [vendorId, packages, setValue, restored]);

  const selectedPackageId = watch("package_id");
  const quantityValue = watch("quantity");
  const deliverables = watch("deliverables");
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId);
  const showQuantity =
    selectedPackage != null &&
    packageUnitAllowsMinQuantity(selectedPackage.unit);
  const minQuantity = selectedPackage?.min_quantity ?? 1;
  const quantity = showQuantity
    ? Math.max(1, Number.parseInt(quantityValue, 10) || 1)
    : 1;
  const displayTotalPaisa =
    selectedPackage != null ? selectedPackage.price * quantity : null;

  useEffect(() => {
    if (!showQuantity) {
      setValue("quantity", "1");
      return;
    }
    const current = Number.parseInt(getValues("quantity"), 10);
    if (!Number.isFinite(current) || current < minQuantity) {
      setValue("quantity", String(Math.max(1, minQuantity)));
    }
  }, [showQuantity, minQuantity, setValue, getValues, selectedPackageId]);

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (booking) => {
      clearEnquiryDraft();
      toast.add({
        title: "Enquiry sent",
        description: "The photographer will reply with a confirmed price.",
        type: "success",
      });
      router.push(`/bookings/${booking.id}`);
    },
    onError: (err) => {
      toast.add({
        title: "Couldn't send enquiry",
        description:
          err instanceof Error ? err.message : "Please try again.",
        type: "error",
      });
    },
  });

  function toDraft(
    values: BookingFormValues,
    currentStep: 1 | 2 | 3,
  ): EnquiryDraft {
    return {
      vendorId,
      vendorSlug,
      step: currentStep,
      event_date: values.event_date,
      event_type: values.event_type,
      guest_count: values.guest_count,
      venue_area: values.venue_area,
      coverage_hours: values.coverage_hours,
      shooters: values.shooters,
      deliverables: values.deliverables,
      delivery_days: values.delivery_days,
      package_id: values.package_id,
      quantity: values.quantity,
      notes: values.notes,
    };
  }

  function redirectToLogin(values: BookingFormValues, currentStep: 1 | 2 | 3) {
    storeEnquiryDraft(toDraft(values, currentStep));
    router.push(buildLoginUrl(`/vendors/${vendorSlug}`));
  }

  async function goNext() {
    setStepError(null);
    if (step === 1) {
      const ok = await trigger(["event_date", "event_type", "venue_area"]);
      if (!ok) return;
      if (!user) storeEnquiryDraft(toDraft(getValues(), 2));
      setStep(2);
      return;
    }
    if (step === 2) {
      const ok = await trigger(["coverage_hours", "shooters"]);
      if (!ok) return;
      if (!user) storeEnquiryDraft(toDraft(getValues(), 3));
      setStep(3);
    }
  }

  function goBack() {
    setStepError(null);
    setStep((s) => (s === 3 ? 2 : 1));
  }

  function toggleDeliverable(option: string) {
    const current = getValues("deliverables");
    if (current.includes(option)) {
      setValue(
        "deliverables",
        current.filter((d) => d !== option),
        { shouldValidate: true },
      );
    } else {
      setValue("deliverables", [...current, option], { shouldValidate: true });
    }
  }

  const onSubmit = handleSubmit((values) => {
    setStepError(null);

    if (!user) {
      redirectToLogin(values, 3);
      return;
    }

    const selected = packages.find((pkg) => pkg.id === values.package_id);
    if (!selected) {
      setStepError("Select a package");
      return;
    }

    if (!isEventDateValid(values.event_date, leadTimeDays)) {
      setStep(1);
      setStepError(`Date must be at least ${leadTimeDays} days from today`);
      return;
    }

    const qty = showQuantity
      ? Math.max(1, Number.parseInt(values.quantity, 10) || 1)
      : 1;

    if (selected.min_quantity != null && qty < selected.min_quantity) {
      setStepError(`Minimum quantity is ${selected.min_quantity}`);
      return;
    }

    mutation.mutate({
      vendor_id: vendorId,
      package_details: [{ package_id: selected.id, quantity: qty }],
      event_date: values.event_date,
      event_type: values.event_type,
      notes: buildBriefNotes(values),
      city_id: cityId,
    });
  });

  return (
    <form
      id="book"
      onSubmit={onSubmit}
      className="rounded-lg border border-mk-border bg-mk-surface p-5"
    >
      <h3 className="text-heading text-mk-ink">Ask to book</h3>

      <nav className="mt-3" aria-label="Form steps">
        <ol className="flex items-end gap-0">
          {STEP_LABELS.map((label, index) => {
            const n = (index + 1) as 1 | 2 | 3;
            const active = step === n;
            const done = step > n;
            return (
              <li key={label} className="flex min-w-0 flex-1 flex-col gap-2">
                <span
                  className={cn(
                    "font-sans text-label",
                    active && "font-semibold text-mk-ink",
                    done && "font-medium text-mk-navy",
                    !active && !done && "text-mk-muted",
                  )}
                >
                  {label}
                </span>
                <span
                  className={cn(
                    "h-0.5 w-full transition-colors duration-300",
                    active || done ? "bg-mk-navy" : "bg-mk-border",
                  )}
                  aria-hidden
                />
              </li>
            );
          })}
        </ol>
      </nav>

      <div
        key={step}
        className="mt-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 space-y-3"
      >
        {step === 1 && (
          <>
            <div>
              <label htmlFor="event_date" className={labelClassName}>
                Event date
              </label>
              <input
                id="event_date"
                type="date"
                min={minEventDate}
                {...register("event_date", {
                  required: "Pick a date",
                  validate: (value) =>
                    isEventDateValid(value, leadTimeDays) ||
                    `Date must be at least ${leadTimeDays} days from today`,
                })}
                className={inputClassName}
              />
              {errors.event_date && (
                <p className="mt-1.5 font-sans text-meta text-rose-600">
                  {errors.event_date.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="event_type" className={labelClassName}>
                What kind of event
              </label>
              <div className="relative">
                <select
                  id="event_type"
                  {...register("event_type", { required: true })}
                  className={cn(inputClassName, "appearance-none pr-10")}
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {EVENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mk-muted" />
              </div>
            </div>

            <div>
              <label htmlFor="venue_area" className={labelClassName}>
                Roughly where
              </label>
              <input
                id="venue_area"
                type="text"
                {...register("venue_area", {
                  required: "Tell us the area",
                  validate: (value) =>
                    value.trim().length > 0 || "Tell us the area",
                })}
                className={inputClassName}
                placeholder="e.g. South Delhi, Gurgaon"
              />
              {errors.venue_area && (
                <p className="mt-1.5 font-sans text-meta text-rose-600">
                  {errors.venue_area.message}
                </p>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label htmlFor="coverage_hours" className={labelClassName}>
                Hours of coverage
              </label>
              <input
                id="coverage_hours"
                type="number"
                min={1}
                inputMode="numeric"
                {...register("coverage_hours", {
                  required: "How many hours do you need?",
                  validate: (value) => {
                    const n = Number.parseInt(value, 10);
                    return (
                      (Number.isFinite(n) && n > 0) || "Enter a valid number"
                    );
                  },
                })}
                className={inputClassName}
                placeholder="e.g. 8"
              />
              {errors.coverage_hours && (
                <p className="mt-1.5 font-sans text-meta text-rose-600">
                  {errors.coverage_hours.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="shooters" className={labelClassName}>
                Photographers needed
              </label>
              <input
                id="shooters"
                type="number"
                min={1}
                inputMode="numeric"
                {...register("shooters", {
                  required: "How many photographers?",
                  validate: (value) => {
                    const n = Number.parseInt(value, 10);
                    return (
                      (Number.isFinite(n) && n > 0) || "Enter a valid number"
                    );
                  },
                })}
                className={inputClassName}
                placeholder="e.g. 2"
              />
              {errors.shooters && (
                <p className="mt-1.5 font-sans text-meta text-rose-600">
                  {errors.shooters.message}
                </p>
              )}
            </div>

            <fieldset>
              <legend className={labelClassName}>What you want</legend>
              <div className="mt-1 space-y-3">
                {DELIVERABLE_OPTIONS.map((option) => {
                  const checked = deliverables.includes(option);
                  return (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-3 font-sans text-body text-mk-ink"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDeliverable(option)}
                        className="h-4 w-4 rounded border-mk-border text-mk-navy focus:ring-mk-navy/20"
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="delivery_days" className={labelClassName}>
                When you need it by{" "}
                <span className="font-normal text-mk-muted">(optional)</span>
              </label>
              <input
                id="delivery_days"
                type="number"
                min={1}
                inputMode="numeric"
                {...register("delivery_days", {
                  validate: (value) => {
                    if (!value.trim()) return true;
                    const n = Number.parseInt(value, 10);
                    return (
                      (Number.isFinite(n) && n > 0) || "Enter a valid number"
                    );
                  },
                })}
                className={inputClassName}
                placeholder="Days after the event, e.g. 21"
              />
              {errors.delivery_days && (
                <p className="mt-1.5 font-sans text-meta text-rose-600">
                  {errors.delivery_days.message}
                </p>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <label htmlFor="package_id" className={labelClassName}>
                Package
              </label>
              <div className="relative">
                <select
                  id="package_id"
                  {...register("package_id", {
                    required: "Select a package",
                    validate: (value) =>
                      packages.some((pkg) => pkg.id === value) ||
                      "Select a package",
                  })}
                  className={cn(inputClassName, "appearance-none pr-10")}
                >
                  {packages.length === 0 ? (
                    <option value="">No packages yet</option>
                  ) : (
                    packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} — {formatInr(pkg.price)} /{" "}
                        {formatUnit(pkg.unit)}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mk-muted" />
              </div>
              {errors.package_id && (
                <p className="mt-1.5 font-sans text-meta text-rose-600">
                  {errors.package_id.message}
                </p>
              )}
              {selectedPackage?.inclusions &&
              selectedPackage.inclusions.length > 0 ? (
                <ul className="mt-3 space-y-1.5 border-t border-mk-border pt-3">
                  {selectedPackage.inclusions.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 font-sans text-meta text-mk-ink"
                    >
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-mk-navy" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {showQuantity && (
              <div>
                <label htmlFor="quantity" className={labelClassName}>
                  Quantity
                  {selectedPackage?.min_quantity != null
                    ? ` (min ${selectedPackage.min_quantity})`
                    : ""}
                </label>
                <input
                  id="quantity"
                  type="number"
                  min={minQuantity}
                  inputMode="numeric"
                  {...register("quantity", {
                    required: "Enter a quantity",
                    validate: (value) => {
                      const n = Number.parseInt(value, 10);
                      if (!Number.isFinite(n) || n < 1) {
                        return "Enter a valid quantity";
                      }
                      if (
                        selectedPackage?.min_quantity != null &&
                        n < selectedPackage.min_quantity
                      ) {
                        return `Minimum quantity is ${selectedPackage.min_quantity}`;
                      }
                      return true;
                    },
                  })}
                  className={inputClassName}
                />
                {errors.quantity && (
                  <p className="mt-1.5 font-sans text-meta text-rose-600">
                    {errors.quantity.message}
                  </p>
                )}
              </div>
            )}

            {displayTotalPaisa != null && (
              <div className="rounded-md bg-mk-app px-3 py-3">
                <p className="font-sans text-body text-mk-ink">
                  <span className="text-mk-muted">Indicative total </span>
                  <span className="font-semibold tabular-nums">
                    {formatInr(displayTotalPaisa)}
                  </span>
                </p>
              </div>
            )}

            <div>
              <label htmlFor="notes" className={labelClassName}>
                Anything else{" "}
                <span className="font-normal text-mk-muted">(optional)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                maxLength={500}
                {...register("notes", {
                  maxLength: {
                    value: 500,
                    message: "Keep notes under 500 characters",
                  },
                })}
                className="w-full rounded-md border border-mk-border bg-white px-3 py-3 font-sans text-body text-mk-ink outline-none transition-colors placeholder:text-mk-muted/70 focus:border-mk-navy focus:ring-2 focus:ring-mk-navy/10"
                placeholder="Venue, timing, special requests…"
              />
              {errors.notes && (
                <p className="mt-1.5 font-sans text-meta text-rose-600">
                  {errors.notes.message}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {stepError && (
        <p className="mt-4 font-sans text-meta text-rose-600">{stepError}</p>
      )}

      <div className="mt-5 flex gap-2">
        {step > 1 && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={goBack}
            disabled={mutation.isPending}
            className="flex-1"
          >
            Back
          </Button>
        )}

        {step < 3 ? (
          <Button
            type="button"
            size="lg"
            onClick={goNext}
            className="flex-1"
          >
            Continue
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            disabled={
              mutation.isPending || authLoading || packages.length === 0
            }
            className="flex-1"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {authLoading
              ? "Checking session…"
              : user
                ? "Send enquiry"
                : "Sign in to send"}
          </Button>
        )}
      </div>
    </form>
  );
}
