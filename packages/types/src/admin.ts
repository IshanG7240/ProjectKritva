import { z } from "zod";
import { paisaSchema } from "./api.js";

// ==========================================
// 1. Vendor Verification Schema
// ==========================================
export const verifyVendorSchema = z.object({
  approved: z.boolean(),
  notes: z
    .string()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .nullable(),
});
export type VerifyVendorInput = z.infer<typeof verifyVendorSchema>;

// ==========================================
// 2. Dispute Resolution Schema
// ==========================================
export const resolveDisputeSchema = z
  .object({
    status: z.enum(["resolved_vendor", "resolved_customer", "resolved_split"]),
    resolution_notes: z
      .string()
      .min(1, "Resolution notes are required")
      .max(2000, "Resolution notes cannot exceed 2000 characters"),
    vendor_payout_amount: paisaSchema.optional().nullable(),
    customer_refund_amount: paisaSchema.optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.status === "resolved_split") {
        const vPayout = data.vendor_payout_amount ?? 0;
        const cRefund = data.customer_refund_amount ?? 0;
        return vPayout > 0 || cRefund > 0;
      }
      return true;
    },
    {
      message: "At least one payout or refund amount must be specified for split resolutions",
      path: ["vendor_payout_amount"],
    }
  );
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

// ==========================================
// 3. Platform Configuration Schema
// ==========================================
export const updateConfigSchema = z.object({
  value: z.unknown(), // Key-specific validation is performed in the application layer
});
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;
