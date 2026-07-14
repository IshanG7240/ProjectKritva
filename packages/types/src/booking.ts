import { z } from "zod";
import {
  bookingStatusSchema,
  milestoneNameSchema,
  milestonePaymentStatusSchema,
  packageUnitSchema,
} from "./enums";
import { ulidSchema, paisaSchema } from "./api";

// ==========================================
// 1. Package Detail Schemas (for nested JSON)
// ==========================================

/** Client selection: package ID + quantity only. Server supplies the snapshot. */
export const bookingPackageSelectionSchema = z.object({
  package_id: ulidSchema,
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .positive("Quantity must be at least 1"),
});
export type BookingPackageSelection = z.infer<typeof bookingPackageSelectionSchema>;

/** Stored/returned snapshot — canonical fields from the package at inquiry time. */
export const bookingPackageDetailSchema = z.object({
  package_id: ulidSchema,
  name: z
    .string()
    .min(1, "Package name is required")
    .max(200, "Package name cannot exceed 200 characters"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .positive("Quantity must be at least 1"),
  unit: packageUnitSchema,
  price_at_booking: paisaSchema,
});
export type BookingPackageDetail = z.infer<typeof bookingPackageDetailSchema>;

// ==========================================
// 2. Booking State Transition Schemas
// ==========================================
export const createBookingInquirySchema = z.object({
  event_id: ulidSchema.optional().nullable(),
  vendor_id: ulidSchema,
  package_details: z
    .array(bookingPackageSelectionSchema)
    .min(1, "At least one package selection is required"),
  total_amount: paisaSchema,
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Event date must be in YYYY-MM-DD format"),
  event_type: z
    .string()
    .min(1, "Event type is required")
    .max(100, "Event type cannot exceed 100 characters"),
  guest_count: z
    .number()
    .int("Guest count must be an integer")
    .positive("Guest count must be positive")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(2000, "Notes cannot exceed 2000 characters")
    .optional()
    .nullable(),
  city_id: z
    .string()
    .max(50, "City ID cannot exceed 50 characters")
    .optional()
    .default("delhi-ncr"),
});
export type CreateBookingInquiryInput = z.infer<typeof createBookingInquirySchema>;

export const declineBookingSchema = z.object({
  decline_reason: z
    .string()
    .min(1, "Decline reason is required")
    .max(1000, "Decline reason cannot exceed 1000 characters"),
});
export type DeclineBookingInput = z.infer<typeof declineBookingSchema>;

export const counterBookingSchema = z.object({
  counter_amount: paisaSchema,
  counter_message: z
    .string()
    .max(1000, "Counter message cannot exceed 1000 characters")
    .optional()
    .nullable(),
});
export type CounterBookingInput = z.infer<typeof counterBookingSchema>;

export const cancelBookingSchema = z.object({
  reason: z
    .string()
    .max(1000, "Reason cannot exceed 1000 characters")
    .optional()
    .nullable(),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

// ==========================================
// 3. Milestone Validation Schemas
// ==========================================
export const createMilestoneSchema = z.object({
  name: milestoneNameSchema,
  label: z
    .string()
    .min(1, "Milestone label is required")
    .max(100, "Milestone label cannot exceed 100 characters"),
  amount: paisaSchema,
  percentage: z
    .number()
    .min(0.01, "Percentage must be greater than 0")
    .max(100, "Percentage cannot exceed 100")
    .refine(
      (val) => Number(val.toFixed(2)) === val,
      "Percentage can have at most 2 decimal places"
    ),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format")
    .optional()
    .nullable(),
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export const confirmBookingSchema = z
  .object({
    milestones: z
      .array(createMilestoneSchema)
      .min(1, "At least one milestone is required"),
  })
  .refine(
    (data) => {
      const totalPct = data.milestones.reduce((sum, m) => sum + m.percentage, 0);
      // Allow slight floating point tolerance for sum (e.g. 100.00)
      return Math.abs(totalPct - 100) < 0.01;
    },
    {
      message: "The sum of milestone percentages must equal 100%",
      path: ["milestones"],
    }
  );
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;

// ==========================================
// 4. Booking List Schemas
// ==========================================
export const listBookingsQuerySchema = z.object({
  status: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;
      const parts = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length === 0) return undefined;
      const parsed = z.array(bookingStatusSchema).safeParse(parts);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid status filter.",
          path: ["status"],
        });
        return z.NEVER;
      }
      return parsed.data;
    }),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: ulidSchema.optional(),
  role: z.enum(["customer", "vendor"]).optional(),
});
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;

export const bookingListItemSchema = z.object({
  id: ulidSchema,
  vendor_id: ulidSchema,
  customer_id: ulidSchema,
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_type: z.string(),
  guest_count: z.number().int().positive().nullable(),
  total_amount: paisaSchema,
  notes: z.string().nullable(),
  status: bookingStatusSchema,
  package_details: z.array(bookingPackageDetailSchema),
  counter_amount: paisaSchema.nullable(),
  counter_message: z.string().nullable(),
  decline_reason: z.string().nullable(),
  vendor_business_name: z.string(),
  customer_display_name: z.string(),
  customer_first_name: z.string(),
});
export type BookingListItem = z.infer<typeof bookingListItemSchema>;

// ==========================================
// 5. Booking Detail Response Schemas
// ==========================================
export const bookingEventSchema = z.object({
  id: ulidSchema,
  from_status: z.string(),
  to_status: bookingStatusSchema,
  actor_id: ulidSchema,
  actor_role: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().datetime(),
});
export type BookingEventResponse = z.infer<typeof bookingEventSchema>;

export const bookingMilestoneResponseSchema = z.object({
  id: ulidSchema,
  name: milestoneNameSchema,
  label: z.string(),
  amount: paisaSchema,
  percentage: z.number(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  payment_status: milestonePaymentStatusSchema,
  released_at: z.string().datetime().nullable(),
});
export type BookingMilestoneResponse = z.infer<typeof bookingMilestoneResponseSchema>;

export const bookingDetailSchema = z.object({
  id: ulidSchema,
  vendor_id: ulidSchema,
  customer_id: ulidSchema,
  event_id: ulidSchema.nullable(),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
  event_type: z.string(),
  guest_count: z.number().int().positive().nullable(),
  total_amount: paisaSchema,
  notes: z.string().nullable(),
  city_id: z.string(),
  status: bookingStatusSchema,
  package_details: z.array(bookingPackageDetailSchema),
  counter_amount: paisaSchema.nullable(),
  counter_message: z.string().nullable(),
  decline_reason: z.string().nullable(),
  vendor_business_name: z.string(),
  customer_display_name: z.string(),
  customer_first_name: z.string(),
  milestones: z.array(bookingMilestoneResponseSchema),
  booking_events: z.array(bookingEventSchema),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type BookingDetail = z.infer<typeof bookingDetailSchema>;
