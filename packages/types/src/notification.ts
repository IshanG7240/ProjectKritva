import { z } from "zod";
import { devicePlatformSchema } from "./enums.js";

// ==========================================
// 1. Notification Preferences Schema
// ==========================================
export const updateNotificationPreferencesSchema = z.object({
  push_bookings: z.boolean().optional(),
  push_messages: z.boolean().optional(),
  push_payments: z.boolean().optional(),
  push_marketing: z.boolean().optional(),
  sms_bookings: z.boolean().optional(),
  sms_payments: z.boolean().optional(),
  email_bookings: z.boolean().optional(),
  email_payments: z.boolean().optional(),
  email_weekly_summary: z.boolean().optional(),
});
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;

// ==========================================
// 2. Device Push Token Registration Schema
// ==========================================
export const registerPushTokenSchema = z.object({
  token: z
    .string()
    .min(1, "Push token is required")
    .max(500, "Push token cannot exceed 500 characters"),
  platform: devicePlatformSchema,
});
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
