import { z } from "zod";
import { ulidSchema } from "./api.js";

// ==========================================
// 1. Review Creation Schema
// ==========================================
export const createReviewSchema = z.object({
  booking_id: ulidSchema,
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot be more than 5"),
  content: z
    .string()
    .max(2000, "Review content cannot exceed 2000 characters")
    .optional()
    .nullable(),
  media_urls: z
    .array(z.string().url("Invalid media URL format"))
    .max(10, "Cannot upload more than 10 media files")
    .optional()
    .nullable(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
