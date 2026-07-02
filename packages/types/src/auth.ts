import { z } from "zod";

// ==========================================
// 1. OTP Authentication Schemas
// ==========================================
export const otpSendSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number in E.164 format"),
});
export type OtpSendInput = z.infer<typeof otpSendSchema>;

export const otpVerifySchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number in E.164 format"),
  code: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only digits"),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

// ==========================================
// 2. Email/Password Auth Schemas
// ==========================================
export const registerSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number in E.164 format"),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  city_id: z.string().max(50).optional().default("delhi-ncr"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ==========================================
// 3. User Modification Schemas
// ==========================================
export const roleSetSchema = z.object({
  role: z.enum(["customer", "vendor"]),
});
export type RoleSetInput = z.infer<typeof roleSetSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters").optional(),
  avatar_url: z.string().url("Invalid URL format").nullable().optional(),
  city_id: z.string().max(50).optional(),
  event_interests: z.array(z.string()).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
