// Payment domain: payments, payment_payouts, vendor_bank_accounts,
// webhook_events, invoices
// Mirrors migrations/004_payment_domain.sql + 020_mvp_columns.sql + 021.

import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import {
  ESCROW_STATUSES,
  INVOICE_TYPES,
  PAYMENT_STATUSES,
  PAYOUT_STATUSES,
  PENNY_DROP_STATUSES,
} from "@kritva/types";

// `bytea` for encrypted account numbers (AES-256).
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// ============================================================
// PAYMENTS
// ============================================================
export const payments = pgTable(
  "payments",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    bookingId: text("booking_id").notNull(), // soft ref
    milestoneId: text("milestone_id").notNull(), // soft ref
    customerId: text("customer_id").notNull(), // soft ref
    vendorId: text("vendor_id").notNull(), // soft ref
    amount: integer("amount").notNull(), // paisa
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    platformFee: integer("platform_fee").notNull().default(0), // paisa
    gstOnFee: integer("gst_on_fee").notNull().default(0), // paisa
    gatewayOrderId: varchar("gateway_order_id", { length: 100 }),
    gatewayPaymentId: varchar("gateway_payment_id", { length: 100 }),
    paymentMethod: text("payment_method"),
    status: text("status")
      .notNull()
      .default("pending")
      .$type<(typeof PAYMENT_STATUSES)[number]>(),
    escrowStatus: text("escrow_status")
      .notNull()
      .default("none")
      .$type<(typeof ESCROW_STATUSES)[number]>(),
    failureReason: text("failure_reason"),
    mode: text("mode").notNull().default("simulated"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_pay_booking").on(t.bookingId),
    index("idx_pay_milestone").on(t.milestoneId),
    index("idx_pay_customer").on(t.customerId),
    index("idx_pay_vendor").on(t.vendorId),
    uniqueIndex("uq_pay_gateway_order_id")
      .on(t.gatewayOrderId)
      .where(sql`${t.gatewayOrderId} IS NOT NULL`),
    uniqueIndex("uq_pay_gateway_payment_id")
      .on(t.gatewayPaymentId)
      .where(sql`${t.gatewayPaymentId} IS NOT NULL`),
    index("idx_pay_status").on(t.status),
    index("idx_pay_escrow").on(t.escrowStatus),
    index("idx_pay_created").on(t.createdAt),
  ],
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

// ============================================================
// PAYMENT_PAYOUTS
// ============================================================
export const paymentPayouts = pgTable(
  "payment_payouts",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    vendorId: text("vendor_id").notNull(), // soft ref
    bookingId: text("booking_id").notNull(), // soft ref
    paymentId: text("payment_id")
      .notNull()
      .references(() => payments.id),
    amount: integer("amount").notNull(), // paisa (net after commission)
    gatewayTransferId: varchar("gateway_transfer_id", { length: 100 }),
    status: text("status")
      .notNull()
      .default("pending")
      .$type<(typeof PAYOUT_STATUSES)[number]>(),
    failureReason: text("failure_reason"),
    initiatedAt: timestamp("initiated_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_pp_vendor").on(t.vendorId),
    index("idx_pp_booking").on(t.bookingId),
    index("idx_pp_status").on(t.status),
    index("idx_pp_created").on(t.createdAt),
  ],
);

export type PaymentPayout = typeof paymentPayouts.$inferSelect;
export type NewPaymentPayout = typeof paymentPayouts.$inferInsert;

// ============================================================
// VENDOR_BANK_ACCOUNTS
// ============================================================
export const vendorBankAccounts = pgTable(
  "vendor_bank_accounts",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    vendorId: text("vendor_id").notNull(), // soft ref; UNIQUE enforced via migration
    accountNumberEnc: bytea("account_number_enc").notNull(), // AES-256 encrypted
    ifscCode: varchar("ifsc_code", { length: 11 }).notNull(),
    accountHolderName: varchar("account_holder_name", {
      length: 200,
    }).notNull(),
    lastFour: varchar("last_four", { length: 4 }).notNull(),
    pennyDropStatus: text("penny_drop_status")
      .notNull()
      .default("pending")
      .$type<(typeof PENNY_DROP_STATUSES)[number]>(),
    razorpayFundId: varchar("razorpay_fund_id", { length: 100 }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_vba_vendor").on(t.vendorId),
    index("idx_vba_vendor").on(t.vendorId),
  ],
);

export type VendorBankAccount = typeof vendorBankAccounts.$inferSelect;
export type NewVendorBankAccount = typeof vendorBankAccounts.$inferInsert;

// ============================================================
// WEBHOOK_EVENTS
// ============================================================
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    source: text("source").notNull().default("razorpay"),
    eventId: varchar("event_id", { length: 200 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    signatureValid: boolean("signature_valid").notNull(),
    processed: boolean("processed").notNull().default(false),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_webhook_idempotency").on(t.source, t.eventId),
    index("idx_we_processed").on(t.processed),
    index("idx_we_created").on(t.createdAt),
    index("idx_we_type").on(t.eventType),
  ],
);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;

// ============================================================
// INVOICES
// ============================================================
export const invoices = pgTable(
  "invoices",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    bookingId: text("booking_id").notNull(), // soft ref
    paymentId: text("payment_id").notNull(), // soft ref
    type: text("type")
      .notNull()
      .$type<(typeof INVOICE_TYPES)[number]>(),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
    amount: integer("amount").notNull(), // paisa
    gstAmount: integer("gst_amount").notNull(), // paisa
    recipientName: varchar("recipient_name", { length: 200 }).notNull(),
    recipientGstin: varchar("recipient_gstin", { length: 15 }),
    pdfUrl: text("pdf_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_invoice_number").on(t.invoiceNumber),
    index("idx_inv_booking").on(t.bookingId),
    index("idx_inv_payment").on(t.paymentId),
    index("idx_inv_type").on(t.type),
  ],
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
