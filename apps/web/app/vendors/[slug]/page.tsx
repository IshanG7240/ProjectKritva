"use client";

/**
 * Individual vendor profile page.
 * Fetches vendor data from GET /v1/vendors/:slug, then renders
 * a booking inquiry form that POSTs to /v1/bookings on submit.
 */

import { use } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { apiClient } from "@/lib/api-client";

// --- Types ---

interface Service {
  id: string;
  name: string;
  description: string | null;
  price_min: number;
  price_max: number;
  unit: string;
}

interface VendorProfile {
  id: string;
  business_name: string;
  slug: string;
  category: string[];
  city_id: string;
  description: string | null;
  years_in_business: number | null;
  avg_rating: number | null;
  rating_count: number;
  booking_count: number;
  response_time_hours: number | null;
  services: Service[];
}

// Shape after apiClient unwraps the outer `data` key.
interface VendorResponse {
  vendor: VendorProfile;
}

// react-hook-form field types.
interface BookingFormValues {
  event_date: string;
  event_type: string;
  guest_count: number;
  total_amount: number;
  notes: string;
}

// Payload sent to POST /v1/bookings.
interface CreateBookingPayload {
  vendor_id: string;
  event_date: string;
  event_type: string;
  guest_count?: number;
  total_amount: number;
  notes?: string;
}

interface BookingResponse {
  booking: { id: string; status: string };
}

// --- Data fetchers ---

async function fetchVendor(slug: string): Promise<VendorProfile> {
  const res = await apiClient.get<VendorResponse>(`/v1/vendors/${slug}`);
  if (res.error) throw new Error(res.error.message);
  return res.data!.vendor;
}

async function createBooking(payload: CreateBookingPayload): Promise<BookingResponse> {
  const res = await apiClient.post<BookingResponse>("/v1/bookings", payload);
  if (res.error) throw new Error(res.error.message);
  return res.data!;
}

// --- Component ---

export default function VendorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Unwrap the async params object (Next.js 15 pattern).
  const { slug } = use(params);

  const {
    data: vendor,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["vendor", slug],
    queryFn: () => fetchVendor(slug),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookingFormValues>();

  const mutation = useMutation({
    mutationFn: (values: BookingFormValues) =>
      createBooking({
        vendor_id: vendor!.id,
        event_date: values.event_date,
        event_type: values.event_type,
        // guest_count and total_amount come in as strings from HTML inputs; coerce to int.
        guest_count: values.guest_count ? Number(values.guest_count) : undefined,
        total_amount: Number(values.total_amount),
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      alert("Inquiry Sent!");
      reset();
    },
    onError: (err: Error) => {
      alert(`Failed to send inquiry: ${err.message}`);
    },
  });

  if (isLoading) return <div>Loading...</div>;

  if (isError) {
    return (
      <div>
        Error loading vendor:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <main>
      <h1>{vendor.business_name}</h1>

      {/* Vendor meta */}
      <p>Category: {vendor.category.join(", ")}</p>
      {vendor.avg_rating != null && <p>Rating: {vendor.avg_rating}</p>}
      {vendor.description && <p>{vendor.description}</p>}

      {/* Services list */}
      <section>
        <h2>Services</h2>
        {vendor.services.length === 0 ? (
          <p>No services listed.</p>
        ) : (
          <ul>
            {vendor.services.map((service) => (
              <li key={service.id}>
                <strong>{service.name}</strong> — ₹
                {(service.price_min / 100).toLocaleString("en-IN")} /{" "}
                {service.unit.replace("_", " ")}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Booking inquiry form */}
      <section>
        <h2>Request a Booking</h2>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>

          <div>
            <label htmlFor="event_date">Event Date</label>
            <input
              id="event_date"
              type="date"
              {...register("event_date", { required: "Event date is required" })}
            />
            {errors.event_date && <span>{errors.event_date.message}</span>}
          </div>

          <div>
            <label htmlFor="event_type">Event Type</label>
            <select
              id="event_type"
              {...register("event_type", { required: "Event type is required" })}
            >
              <option value="">Select type</option>
              <option value="wedding">Wedding</option>
              <option value="corporate">Corporate</option>
              <option value="birthday">Birthday</option>
              <option value="social">Social</option>
            </select>
            {errors.event_type && <span>{errors.event_type.message}</span>}
          </div>

          <div>
            <label htmlFor="guest_count">Guest Count</label>
            <input
              id="guest_count"
              type="number"
              min={1}
              {...register("guest_count")}
            />
          </div>

          <div>
            <label htmlFor="total_amount">
              Total Amount (paisa, e.g. 50000 = ₹500)
            </label>
            <input
              id="total_amount"
              type="number"
              min={1}
              {...register("total_amount", {
                required: "Total amount is required",
              })}
            />
            {errors.total_amount && <span>{errors.total_amount.message}</span>}
          </div>

          <div>
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" {...register("notes")} />
          </div>

          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending..." : "Send Inquiry"}
          </button>

          {mutation.isError && (
            <p>Error: {(mutation.error as Error).message}</p>
          )}
        </form>
      </section>
    </main>
  );
}
