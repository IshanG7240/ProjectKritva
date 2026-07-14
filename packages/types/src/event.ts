import { z } from "zod";
import { eventTypeSchema, eventStatusSchema } from "./enums";
import { paisaSchema } from "./api";

// ==========================================
// 1. Event CRUD Validation Schemas
// ==========================================
export const createEventSchema = z.object({
  name: z
    .string()
    .min(1, "Event name is required")
    .max(200, "Event name cannot exceed 200 characters"),
  type: eventTypeSchema,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Event date must be in YYYY-MM-DD format")
    .optional()
    .nullable(),
  city_id: z
    .string()
    .max(50, "City ID cannot exceed 50 characters")
    .optional()
    .default("delhi-ncr"),
  venue: z
    .string()
    .max(500, "Venue description cannot exceed 500 characters")
    .optional()
    .nullable(),
  guest_count: z
    .number()
    .int("Guest count must be an integer")
    .positive("Guest count must be positive")
    .optional()
    .nullable(),
  budget_total: paisaSchema
    .optional()
    .nullable(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.partial().extend({
  status: eventStatusSchema.optional(),
});
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// ==========================================
// 2. Checklist Item Validation Schemas
// ==========================================
export const addChecklistItemSchema = z.object({
  title: z
    .string()
    .min(1, "Checklist item title is required")
    .max(200, "Title cannot exceed 200 characters"),
  category: z
    .string()
    .max(100, "Category cannot exceed 100 characters")
    .optional()
    .nullable(),
});
export type AddChecklistItemInput = z.infer<typeof addChecklistItemSchema>;
