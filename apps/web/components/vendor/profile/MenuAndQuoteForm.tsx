"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Loader2, Send, CheckCircle2 } from "lucide-react";
import { packageUnitAllowsMinQuantity } from "@kritva/types/enums";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import {
  buildLoginUrl,
  DEFAULT_VENDOR_LEAD_TIME_DAYS,
  formatInr,
  getMinEventDate,
  isEventDateValid,
} from "@/lib/booking-form";
import { formatUnit, rupeesToPaisa } from "@/lib/vendor-profile";
import type { VendorPackage } from "@/lib/vendor-profile";
import { cn } from "@/lib/utils";

const EVENT_TYPES = [
  "wedding",
  "corporate",
  "birthday",
  "social",
  "other",
] as const;

const EVENT_TYPE_LABELS: Record<(typeof EVENT_TYPES)[number], string> = {
  wedding: "Wedding",
  corporate: "Corporate",
  birthday: "Birthday",
  social: "Social",
  other: "Other",
};

interface BookingFormValues {
  package_id: string;
  quantity: string;
  event_date: string;
  event_type: (typeof EVENT_TYPES)[number];
  guest_count: string;
  total_amount: string;
  notes: string;
}

interface CreateBookingPayload {
  vendor_id: string;
  package_details: Array<{
    package_id: string;
    quantity: number;
  }>;
  total_amount: number;
  event_date: string;
  event_type: string;
  guest_count?: number;
  notes?: string;
}

async function createBooking(payload: CreateBookingPayload) {
  const res = await apiClient.post("/v1/bookings", payload);
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const inputClassName =
  "h-8 w-full rounded-md border border-mk-border bg-white px-2.5 font-sans text-sm text-mk-ink outline-none transition-colors placeholder:text-mk-muted/70 focus:border-mk-navy focus:ring-2 focus:ring-mk-navy/10";

const labelClassName =
  "mb-1 block font-sans text-[11px] font-semibold uppercase tracking-wider text-mk-muted";

export interface MenuAndQuoteFormProps {
  vendorId: string;
  vendorSlug: string;
  packages: Pick<
    VendorPackage,
    "id" | "name" | "price" | "unit" | "min_quantity"
  >[];
  leadTimeDays?: number;
}

export function MenuAndQuoteForm({
  vendorId,
  vendorSlug,
  packages,
  leadTimeDays = DEFAULT_VENDOR_LEAD_TIME_DAYS,
}: MenuAndQuoteFormProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const minEventDate = getMinEventDate(leadTimeDays);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BookingFormValues>({
    defaultValues: {
      package_id: packages[0]?.id ?? "",
      quantity: "1",
      event_date: "",
      event_type: "wedding",
      guest_count: "",
      total_amount: "",
      notes: "",
    },
  });

  const selectedPackageId = watch("package_id");
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId);
  const showQuantity =
    selectedPackage != null &&
    packageUnitAllowsMinQuantity(selectedPackage.unit);
  const minQuantity = selectedPackage?.min_quantity ?? 1;

  useEffect(() => {
    if (!showQuantity) {
      setValue("quantity", "1");
      return;
    }
    setValue("quantity", String(Math.max(1, minQuantity)));
  }, [showQuantity, minQuantity, setValue, selectedPackageId]);

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      reset({
        package_id: packages[0]?.id ?? "",
        quantity: "1",
        event_date: "",
        event_type: "wedding",
        guest_count: "",
        total_amount: "",
        notes: "",
      });
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (!user) {
      router.push(buildLoginUrl(`/vendors/${vendorSlug}`));
      return;
    }

    const totalAmount = rupeesToPaisa(values.total_amount);
    if (totalAmount == null || totalAmount <= 0) return;

    const selected = packages.find((pkg) => pkg.id === values.package_id);
    if (!selected) return;

    if (!isEventDateValid(values.event_date, leadTimeDays)) return;

    const quantity = showQuantity
      ? Math.max(1, Number.parseInt(values.quantity, 10) || 1)
      : 1;

    if (
      selected.min_quantity != null &&
      quantity < selected.min_quantity
    ) {
      return;
    }

    const trimmedNotes = values.notes.trim();
    mutation.mutate({
      vendor_id: vendorId,
      package_details: [
        {
          package_id: selected.id,
          quantity,
        },
      ],
      total_amount: totalAmount,
      event_date: values.event_date,
      event_type: values.event_type,
      guest_count: values.guest_count
        ? Number(values.guest_count)
        : undefined,
      notes: trimmedNotes || undefined,
    });
  });

  if (mutation.isSuccess) {
    return (
      <div className="rounded-lg border border-mk-border bg-white px-3 py-4">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCFCE7]">
            <CheckCircle2
              className="h-5 w-5 text-[#16A34A]"
              strokeWidth={1.75}
            />
          </span>
          <p className="font-sans text-sm font-semibold text-mk-ink">
            Inquiry sent!
          </p>
          <p className="font-sans text-xs text-mk-muted">
            The vendor will review and respond shortly.
          </p>
          <Link
            href="/dashboard"
            className="mt-2 font-sans text-xs font-medium text-mk-navy underline-offset-2 hover:underline"
          >
            View your bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-mk-border bg-white px-3 py-4"
    >
      <h3 className="font-sans text-sm font-semibold text-mk-ink">
        Request a quote
      </h3>
      <p className="mt-1 font-sans text-xs text-mk-muted">
        Inquiry amount is what you expect to spend — package catalog price is
        snapshotted separately for the vendor.
      </p>

      <div className="mt-4 space-y-3">
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
              className={cn(inputClassName, "appearance-none pr-8")}
            >
              {packages.length === 0 ? (
                <option value="">No packages available</option>
              ) : (
                packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} — {formatInr(pkg.price)} / {formatUnit(pkg.unit)}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mk-muted" />
          </div>
          {errors.package_id && (
            <p className="mt-1 font-sans text-xs text-rose-600">
              {errors.package_id.message}
            </p>
          )}
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
              {...register("quantity", {
                required: "Enter a quantity",
                validate: (value) => {
                  const n = Number.parseInt(value, 10);
                  if (!Number.isFinite(n) || n < 1) return "Enter a valid quantity";
                  if (selectedPackage?.min_quantity != null && n < selectedPackage.min_quantity) {
                    return `Minimum quantity is ${selectedPackage.min_quantity}`;
                  }
                  return true;
                },
              })}
              className={inputClassName}
            />
            {errors.quantity && (
              <p className="mt-1 font-sans text-xs text-rose-600">
                {errors.quantity.message}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="event_date" className={labelClassName}>
            Event date
          </label>
          <input
            id="event_date"
            type="date"
            min={minEventDate}
            {...register("event_date", {
              required: "Select an event date",
              validate: (value) =>
                isEventDateValid(value, leadTimeDays) ||
                `Date must be at least ${leadTimeDays} days from today`,
            })}
            className={inputClassName}
          />
          {errors.event_date && (
            <p className="mt-1 font-sans text-xs text-rose-600">
              {errors.event_date.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="event_type" className={labelClassName}>
            Event type
          </label>
          <div className="relative">
            <select
              id="event_type"
              {...register("event_type", { required: true })}
              className={cn(inputClassName, "appearance-none pr-8")}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mk-muted" />
          </div>
        </div>

        <div>
          <label htmlFor="guest_count" className={labelClassName}>
            Guest count
          </label>
          <input
            id="guest_count"
            type="number"
            min={1}
            {...register("guest_count")}
            className={inputClassName}
            placeholder="Optional"
          />
        </div>

        <div>
          <label htmlFor="total_amount" className={labelClassName}>
            Inquiry amount (₹)
          </label>
          <input
            id="total_amount"
            type="text"
            inputMode="decimal"
            {...register("total_amount", {
              required: "Enter an inquiry amount",
              validate: (value) => {
                const paisa = rupeesToPaisa(value);
                return (paisa != null && paisa > 0) || "Enter a valid amount";
              },
            })}
            className={inputClassName}
            placeholder="e.g. 50000"
          />
          {errors.total_amount && (
            <p className="mt-1 font-sans text-xs text-rose-600">
              {errors.total_amount.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className={labelClassName}>
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            {...register("notes")}
            className="w-full rounded-md border border-mk-border bg-white px-2.5 py-2 font-sans text-sm text-mk-ink outline-none transition-colors placeholder:text-mk-muted/70 focus:border-mk-navy focus:ring-2 focus:ring-mk-navy/10"
            placeholder="Anything the vendor should know"
          />
        </div>
      </div>

      {mutation.isError && (
        <p className="mt-3 font-sans text-xs text-rose-600">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Failed to send inquiry."}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || authLoading || packages.length === 0}
        className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-mk-navy font-sans text-sm font-semibold text-white transition-colors hover:bg-mk-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {authLoading
          ? "Checking session…"
          : user
            ? "Send inquiry"
            : "Sign in to inquire"}
      </button>
    </form>
  );
}
