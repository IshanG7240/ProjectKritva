import { z } from "zod";
import { messageTypeSchema } from "./enums";

// ==========================================
// 1. Message Sending Schema
// ==========================================
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content cannot be empty")
    .max(5000, "Message content cannot exceed 5000 characters"),
  type: messageTypeSchema.optional().default("text"),
  media_url: z
    .string()
    .url("Invalid media URL format")
    .optional()
    .nullable(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
