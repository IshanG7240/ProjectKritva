import { z } from "zod";
import { paisaSchema, ulidSchema } from "./api";
import {
  escrowOutcomeSchema,
  packageUnitSchema,
  roleSchema,
  userStatusSchema,
  verificationStatusSchema,
  vendorCategorySchema,
} from "./enums";

// ==========================================
// 1. Vendor Verification Schema
// ==========================================
export const verifyVendorSchema = z
  .object({
    verification_status: z.enum(["approved", "rejected"]),
    verification_notes: z
      .string()
      .max(1000, "Notes cannot exceed 1000 characters")
      .optional(),
  })
  .refine(
    (data) =>
      data.verification_status !== "rejected" ||
      (data.verification_notes?.trim().length ?? 0) > 0,
    {
      message: "verification_notes is required when rejecting a vendor",
      path: ["verification_notes"],
    },
  );
export type VerifyVendorInput = z.infer<typeof verifyVendorSchema>;

// ==========================================
// 2. Admin vendor review payloads
// ==========================================
export const adminVendorPendingItemSchema = z.object({
  id: ulidSchema,
  user_id: ulidSchema,
  business_name: z.string(),
  slug: z.string(),
  category: z.array(vendorCategorySchema),
  city_id: z.string(),
  description: z.string().nullable(),
  verification_status: verificationStatusSchema,
  verification_notes: z.string().nullable(),
  submitted_at: z.string().datetime().nullable(),
  package_count: z.number().int().nonnegative(),
  portfolio_media_count: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
});
export type AdminVendorPendingItem = z.infer<typeof adminVendorPendingItemSchema>;

export const adminVendorReviewPackageSchema = z.object({
  id: ulidSchema,
  name: z.string(),
  price: paisaSchema,
  unit: packageUnitSchema,
  min_quantity: z.number().int().positive().nullable(),
  inclusions: z.array(z.string()),
});

export const adminVendorReviewMediaSchema = z.object({
  id: ulidSchema,
  url: z.string(),
  thumbnail_url: z.string().nullable(),
  section: z.string(),
  position: z.number().int().nonnegative(),
});

export const adminVendorReviewDetailSchema = z.object({
  id: ulidSchema,
  user_id: ulidSchema,
  business_name: z.string(),
  slug: z.string(),
  category: z.array(vendorCategorySchema),
  city_id: z.string(),
  description: z.string().nullable(),
  years_in_business: z.number().int().nullable(),
  profile_photo_url: z.string().nullable(),
  verification_status: verificationStatusSchema,
  verification_notes: z.string().nullable(),
  submitted_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  owner_email: z.string().email().nullable(),
  packages: z.array(adminVendorReviewPackageSchema),
  media: z.array(adminVendorReviewMediaSchema),
});
export type AdminVendorReviewDetail = z.infer<typeof adminVendorReviewDetailSchema>;

// ==========================================
// 3. User Management Schemas
// ==========================================
export const adminUserListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  role: roleSchema,
  status: userStatusSchema,
  suspended_until: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type AdminUserListItem = z.infer<typeof adminUserListItemSchema>;

export const updateUserStatusSchema = z.object({
  status: userStatusSchema,
  suspended_until: z.string().datetime().nullable().optional(),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(500, "Reason cannot exceed 500 characters"),
});
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export const listUsersQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  role: roleSchema.optional(),
  status: userStatusSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// ==========================================
// 4. Dispute Resolution Schema
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
    },
  );
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

/**
 * Admin money decision on a disputed (or held) booking.
 * outcome maps to bookings.escrow_outcome; reason is shown to both parties.
 */
export const resolveBookingSchema = z.object({
  outcome: escrowOutcomeSchema,
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(2000, "Reason cannot exceed 2000 characters"),
  /** Paisa to vendor on split; required when outcome is split. */
  vendor_payout_amount: paisaSchema.optional().nullable(),
  /** Paisa refunded to customer on split; required when outcome is split. */
  customer_refund_amount: paisaSchema.optional().nullable(),
}).refine(
  (data) => {
    if (data.outcome !== "split") return true;
    const v = data.vendor_payout_amount ?? 0;
    const c = data.customer_refund_amount ?? 0;
    return v > 0 || c > 0;
  },
  {
    message: "Split requires vendor_payout_amount and/or customer_refund_amount",
    path: ["vendor_payout_amount"],
  },
);
export type ResolveBookingInput = z.infer<typeof resolveBookingSchema>;

export const reconciliationQuerySchema = z.object({
  mode: z.enum(["simulated", "live"]).optional().default("live"),
});
export type ReconciliationQuery = z.infer<typeof reconciliationQuerySchema>;

// ==========================================
// 5. Platform Configuration Schema
// ==========================================
export const updateConfigSchema = z.object({
  value: z.unknown(),
});
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;

/** Commission 0–30% inclusive → 0–3000 bps. */
export const updateCategoryCommissionSchema = z.object({
  commission_bps: z
    .number()
    .int("commission_bps must be an integer")
    .min(0, "commission_bps cannot be negative")
    .max(3000, "commission_bps cannot exceed 3000 (30%)"),
  /** Required when new rate is above 500 bps (5%). */
  confirm_commission_bps: z.number().int().optional(),
});
export type UpdateCategoryCommissionInput = z.infer<
  typeof updateCategoryCommissionSchema
>;

export const listAdminBookingsQuerySchema = z.object({
  status: z
    .enum(["payment_held", "completed", "disputed", "payment_released"])
    .optional(),
  /** When true, only bookings with funds currently held (payment_held | completed). */
  held: z
    .union([z.literal("true"), z.literal("1"), z.literal("false"), z.literal("0")])
    .optional()
    .transform((v) => v === "true" || v === "1"),
  mode: z.enum(["simulated", "live"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type ListAdminBookingsQuery = z.infer<typeof listAdminBookingsQuerySchema>;
