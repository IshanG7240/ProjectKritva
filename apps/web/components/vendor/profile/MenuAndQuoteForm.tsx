"use client";

import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Loader2, Send, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import {
  buildLoginUrl,
  DEFAULT_VENDOR_LEAD_TIME_DAYS,
  getMinEventDate,
  isEventDateValid,
} from "@/lib/booking-form";
import { rupeesToPaisa } from "@/lib/vendor-profile";
import type { VendorService } from "@/lib/vendor-profile";
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
  service_id: string;
  event_date: string;
  event_type: (typeof EVENT_TYPES)[number];
  guest_count: string;
  total_amount: string;
  notes: string;
}

interface CreateBookingPayload {
  vendor_id: string;
  service_details: Array<{
    service_id: string;
    name: string;
    quantity: number;
    price_at_booking: number;
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
  services: Pick<VendorService, "id" | "name">[];
  leadTimeDays?: number;
}

export function MenuAndQuoteForm({
  vendorId,
  vendorSlug,
  services,
  leadTimeDays = DEFAULT_VENDOR_LEAD_TIME_DAYS,
}: MenuAndQuoteFormProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const minEventDate = getMinEventDate(leadTimeDays);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookingFormValues>({
    defaultValues: {
      service_id: services[0]?.id ?? "",
      event_date: "",
      event_type: "wedding",
      guest_count: "",
      total_amount: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      reset();
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (!user) {
      router.push(buildLoginUrl(`/vendors/${vendorSlug}`));
      return;
    }

    const totalAmount = rupeesToPaisa(values.total_amount);
    if (totalAmount == null || totalAmount <= 0) return;

    const selectedService = services.find(
      (service) => service.id === values.service_id,
    );
    if (!selectedService) return;

    if (!isEventDateValid(values.event_date, leadTimeDays)) return;

    const trimmedNotes = values.notes.trim();
    mutation.mutate({
      vendor_id: vendorId,
      service_details: [
        {
          service_id: selectedService.id,
          name: selectedService.name,
          quantity: 1,
          price_at_booking: totalAmount,
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
          <p className="font-sans text-xs leading-relaxed text-mk-muted">
            The vendor will review your request and get back to you shortly.
          </p>
          <Link
            href="/dashboard"
            className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-md bg-mk-navy px-3 font-sans text-sm font-medium text-white transition-colors hover:bg-[#162C47]"
          >
            View your inquiries
          </Link>
          <button
            type="button"
            onClick={() => mutation.reset()}
            className="mt-1 font-sans text-xs font-medium text-mk-navy hover:underline"
          >
            Send another inquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-mk-border bg-white px-3 py-2.5">
      <div className="mb-3">
        <h2 className="font-sans text-xs font-semibold text-mk-ink">
          Menu &amp; Quote
        </h2>
        <p className="mt-0.5 font-sans text-[10px] leading-relaxed text-mk-muted">
          Request a custom quote for your event
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label htmlFor="service_id" className={labelClassName}>
            Requested Service
          </label>
          <div className="relative">
            <select
              id="service_id"
              {...register("service_id", {
                required: "Select a service",
                validate: (value) =>
                  services.some((service) => service.id === value) ||
                  "Select a service",
              })}
              className={cn(inputClassName, "appearance-none pr-7 capitalize")}
            >
              {services.length === 0 ? (
                <option value="">No services available</option>
              ) : (
                services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-mk-muted" />
          </div>
          {errors.service_id && (
            <p className="mt-1 font-sans text-[10px] text-red-600">
              {errors.service_id.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="event_date" className={labelClassName}>
            Event Date
          </label>
          <input
            id="event_date"
            type="date"
            min={minEventDate}
            {...register("event_date", {
              required: "Event date is required",
              validate: (value) =>
                isEventDateValid(value, leadTimeDays) ||
                `Event must be at least ${leadTimeDays} days from today`,
            })}
            className={inputClassName}
          />
          {errors.event_date && (
            <p className="mt-1 font-sans text-[10px] text-red-600">
              {errors.event_date.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="event_type" className={labelClassName}>
            Event Type
          </label>
          <div className="relative">
            <select
              id="event_type"
              {...register("event_type", { required: true })}
              className={cn(inputClassName, "appearance-none pr-7")}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-mk-muted" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="guest_count" className={labelClassName}>
              Guests
            </label>
            <input
              id="guest_count"
              type="number"
              min={1}
              placeholder="—"
              {...register("guest_count")}
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="total_amount" className={labelClassName}>
              Budget (₹)
            </label>
            <input
              id="total_amount"
              type="number"
              min={1}
              step="0.01"
              placeholder="0"
              {...register("total_amount", {
                required: "Budget is required",
                validate: (value) => {
                  const paisa = rupeesToPaisa(value);
                  return (paisa != null && paisa > 0) || "Enter a valid amount";
                },
              })}
              className={inputClassName}
            />
          </div>
        </div>
        {errors.total_amount && (
          <p className="font-sans text-[10px] text-red-600">
            {errors.total_amount.message}
          </p>
        )}

        <div>
          <label htmlFor="notes" className={labelClassName}>
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Tell the vendor about your event…"
            {...register("notes")}
            className={cn(
              inputClassName,
              "h-auto resize-none py-2 leading-relaxed",
            )}
          />
        </div>

        {!authLoading && !user && (
          <p className="font-sans text-[10px] text-mk-muted">
            Sign in to submit your inquiry.
          </p>
        )}

        {mutation.isError && (
          <p className="rounded-md bg-red-50 px-2.5 py-2 font-sans text-[11px] text-red-700">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Something went wrong. Please try again."}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || authLoading || services.length === 0}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-mk-navy px-3 font-sans text-sm font-medium text-white transition-colors hover:bg-[#162C47] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              {user ? "Submit Inquiry" : "Sign in to submit"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
