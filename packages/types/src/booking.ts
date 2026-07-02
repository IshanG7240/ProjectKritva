import { z } from "zod";
import { milestoneNameSchema } from "./enums.js";
import { ulidSchema, paisaSchema } from "./api.js";

// ==========================================
// 1. Service Detail Schema (for nested JSON)
// ==========================================
export const bookingServiceDetailSchema = z.object({
  service_id: ulidSchema,
  name: z
    .string()
    .min(1, "Service name is required")
    .max(200, "Service name cannot exceed 200 characters"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .positive("Quantity must be at least 1"),
  price_at_booking: paisaSchema,
});
export type BookingServiceDetail = z.infer<typeof bookingServiceDetailSchema>;

// ==========================================
// 2. Booking State Transition Schemas
// ==========================================
export const createBookingInquirySchema = z.object({
  event_id: ulidSchema.optional().nullable(),
  vendor_id: ulidSchema,
  service_details: z
    .array(bookingServiceDetailSchema)
    .min(1, "At least one service detail is required"),
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
