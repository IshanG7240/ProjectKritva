import { z } from "zod";
import { ulidSchema, paisaSchema } from "./api";
import { paymentModeSchema } from "./enums";

// ==========================================
// 1. Payment Action Schemas
// ==========================================
export const releasePaymentSchema = z.object({
  booking_id: ulidSchema,
});
export type ReleasePaymentInput = z.infer<typeof releasePaymentSchema>;

export const createOrderSchema = z.object({
  booking_id: ulidSchema,
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const verifyPaymentSchema = z.object({
  booking_id: ulidSchema,
  razorpay_payment_id: z.string().min(1, "razorpay_payment_id is required"),
  razorpay_order_id: z.string().min(1, "razorpay_order_id is required"),
  razorpay_signature: z.string().min(1, "razorpay_signature is required"),
});
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

/** Simulated checkout control — only when PAYMENT_MODE=simulated. */
export const simulatedCheckoutSchema = z.object({
  order_id: z
    .string()
    .min(1)
    .regex(/^simulated_order_/, "order_id must be a simulated_order_* id"),
  outcome: z.enum(["success", "failure"]),
  inject: z.enum(["bad_signature", "replay"]).nullable().optional(),
});
export type SimulatedCheckoutInput = z.infer<typeof simulatedCheckoutSchema>;

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

export const vendorBankAccountResponseSchema = z.object({
  id: ulidSchema,
  last_four: z.string().length(4),
  ifsc_code: z.string(),
  account_holder_name: z.string(),
  penny_drop_status: z.enum(["pending", "verified", "failed"]),
  gateway_account_id: z.string().nullable(),
  verified_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type VendorBankAccountResponse = z.infer<
  typeof vendorBankAccountResponseSchema
>;

export { paymentModeSchema };
