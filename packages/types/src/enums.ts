import { z } from "zod";

// ==========================================
// 1. Roles
// ==========================================
export const ROLES = ["customer", "vendor", "admin", "superadmin"] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

// ==========================================
// 2. Booking Statuses
// ==========================================
export const BOOKING_STATUSES = [
  "inquiry",
  "vendor_reviewing",
  "vendor_accepted",
  "vendor_declined",
  "vendor_countered",
  "customer_confirmed",
  "payment_pending",
  "payment_held",
  "in_progress",
  "completed",
  "payment_released",
  "disputed",
  "cancelled",
] as const;
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

// ==========================================
// 3. Payment Statuses
// ==========================================
export const PAYMENT_STATUSES = ["pending", "initiated", "captured", "failed", "refunded"] as const;
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// ==========================================
// 4. Escrow Statuses
// ==========================================
export const ESCROW_STATUSES = [
  "none",
  "held",
  "released",
  "refunded",
  "partially_refunded",
] as const;
export const escrowStatusSchema = z.enum(ESCROW_STATUSES);
export type EscrowStatus = z.infer<typeof escrowStatusSchema>;

// ==========================================
// 5. Milestone Names
// ==========================================
export const MILESTONE_NAMES = ["advance", "pre_event", "post_event", "custom"] as const;
export const milestoneNameSchema = z.enum(MILESTONE_NAMES);
export type MilestoneName = z.infer<typeof milestoneNameSchema>;

// ==========================================
// 6. Vendor Categories
// ==========================================
export const VENDOR_CATEGORIES = ["catering", "photography", "venue", "decor", "other"] as const;
export const vendorCategorySchema = z.enum(VENDOR_CATEGORIES);
export type VendorCategory = z.infer<typeof vendorCategorySchema>;

// ==========================================
// 7. Event Types
// ==========================================
export const EVENT_TYPES = ["wedding", "corporate", "birthday", "social", "other"] as const;
export const eventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof eventTypeSchema>;

// ==========================================
// 8. Verification Statuses
// ==========================================
export const VERIFICATION_STATUSES = [
  "pending_review",
  "approved",
  "rejected",
  "suspended",
] as const;
export const verificationStatusSchema = z.enum(VERIFICATION_STATUSES);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

// ==========================================
// 9. Payout Statuses
// ==========================================
export const PAYOUT_STATUSES = ["pending", "initiated", "completed", "failed", "reversed"] as const;
export const payoutStatusSchema = z.enum(PAYOUT_STATUSES);
export type PayoutStatus = z.infer<typeof payoutStatusSchema>;

// ==========================================
// 10. Dispute Statuses
// ==========================================
export const DISPUTE_STATUSES = [
  "open",
  "under_review",
  "resolved_vendor",
  "resolved_customer",
  "resolved_split",
] as const;
export const disputeStatusSchema = z.enum(DISPUTE_STATUSES);
export type DisputeStatus = z.infer<typeof disputeStatusSchema>;

// ==========================================
// 11. Document Types
// ==========================================
export const DOCUMENT_TYPES = ["pan", "gst_certificate", "business_registration", "other"] as const;
export const documentTypeSchema = z.enum(DOCUMENT_TYPES);
export type DocumentType = z.infer<typeof documentTypeSchema>;

// ==========================================
// 12. Message Types
// ==========================================
export const MESSAGE_TYPES = ["text", "image", "system"] as const;
export const messageTypeSchema = z.enum(MESSAGE_TYPES);
export type MessageType = z.infer<typeof messageTypeSchema>;

// ==========================================
// 13. Service Units
// ==========================================
export const SERVICE_UNITS = ["per_event", "per_plate", "per_hour", "per_day", "fixed"] as const;
export const serviceUnitSchema = z.enum(SERVICE_UNITS);
export type ServiceUnit = z.infer<typeof serviceUnitSchema>;

// ==========================================
// Additional Check Constraints from Migrations
// ==========================================

export const USER_STATUSES = ["active", "suspended", "banned"] as const;
export const userStatusSchema = z.enum(USER_STATUSES);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const MILESTONE_PAYMENT_STATUSES = [
  "pending",
  "payment_initiated",
  "paid",
  "held",
  "released",
  "refunded",
] as const;
export const milestonePaymentStatusSchema = z.enum(MILESTONE_PAYMENT_STATUSES);
export type MilestonePaymentStatus = z.infer<typeof milestonePaymentStatusSchema>;

export const DEVICE_PLATFORMS = ["ios", "android", "web"] as const;
export const devicePlatformSchema = z.enum(DEVICE_PLATFORMS);
export type DevicePlatform = z.infer<typeof devicePlatformSchema>;

export const MEDIA_TYPES = ["image", "video"] as const;
export const mediaTypeSchema = z.enum(MEDIA_TYPES);
export type MediaType = z.infer<typeof mediaTypeSchema>;

export const EVENT_STATUSES = ["planning", "in_progress", "completed", "cancelled"] as const;
export const eventStatusSchema = z.enum(EVENT_STATUSES);
export type EventStatus = z.infer<typeof eventStatusSchema>;

export const PENNY_DROP_STATUSES = ["pending", "verified", "failed"] as const;
export const pennyDropStatusSchema = z.enum(PENNY_DROP_STATUSES);
export type PennyDropStatus = z.infer<typeof pennyDropStatusSchema>;

export const INVOICE_TYPES = ["customer_tax_invoice", "vendor_settlement"] as const;
export const invoiceTypeSchema = z.enum(INVOICE_TYPES);
export type InvoiceType = z.infer<typeof invoiceTypeSchema>;

export const DISPUTE_RAISED_BY_ROLES = ["customer", "vendor"] as const;
export const disputeRaisedByRoleSchema = z.enum(DISPUTE_RAISED_BY_ROLES);
export type DisputeRaisedByRole = z.infer<typeof disputeRaisedByRoleSchema>;
