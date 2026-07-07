import { z } from "zod";
import { ulidSchema, paisaSchema } from "./api.js";

// ==========================================
// 1. Payment Action Schemas
// ==========================================
export const initiatePaymentSchema = z.object({
  booking_id: ulidSchema,
});
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

export const simulateCapturePaymentSchema = z.object({
  booking_id: ulidSchema,
});
export type SimulateCapturePaymentInput = z.infer<typeof simulateCapturePaymentSchema>;

export const releasePaymentSchema = z.object({
  booking_id: ulidSchema,
});
export type ReleasePaymentInput = z.infer<typeof releasePaymentSchema>;

// ==========================================
// 2. Vendor Bank Account linking Schemas
// ==========================================
export const linkBankAccountSchema = z.object({
  account_number: z
    .string()
    .min(9, "Account number must be at least 9 digits")
    .max(18, "Account number cannot exceed 18 digits")
    .regex(/^\d+$/, "Account number must contain only digits"),
  ifsc_code: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format (e.g. SBIN0012345)"),
  account_holder_name: z
    .string()
    .min(2, "Account holder name must be at least 2 characters")
    .max(200, "Account holder name cannot exceed 200 characters"),
});
export type LinkBankAccountInput = z.infer<typeof linkBankAccountSchema>;

export const verifyPennyDropSchema = z.object({
  amount: paisaSchema, // expected verification amount in paisa (e.g., 100 paisa = ₹1.00)
});
export type VerifyPennyDropInput = z.infer<typeof verifyPennyDropSchema>;
