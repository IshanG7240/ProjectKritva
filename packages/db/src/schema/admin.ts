// Admin domain: platform_config, category_configs, disputes, audit_logs
// Mirrors migrations/006_admin_domain.sql + 020_mvp_columns.sql.

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { DISPUTE_RAISED_BY_ROLES, DISPUTE_STATUSES } from "@kritva/types";

// ============================================================
// PLATFORM_CONFIG
// ============================================================
export const platformConfig = pgTable(
  "platform_config",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    key: varchar("key", { length: 100 }).notNull(),
    value: jsonb("value").notNull(),
    updatedBy: text("updated_by"), // soft ref to admin users.id
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("uq_config_key").on(t.key)],
);

export type PlatformConfig = typeof platformConfig.$inferSelect;
export type NewPlatformConfig = typeof platformConfig.$inferInsert;

// ============================================================
// CATEGORY_CONFIGS
// ============================================================
export const categoryConfigs = pgTable("category_configs", {
  id: text("id").primaryKey(),
  contractType: text("contract_type").notNull(),
  pricingUnits: text("pricing_units").array().notNull().default(sql`'{}'`),
  quantityLabel: text("quantity_label"),
  briefFields: jsonb("brief_fields")
    .$type<unknown[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  proofRequired: jsonb("proof_required")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  minLeadTimeDays: integer("min_lead_time_days").notNull().default(0),
  minPortfolioPhotos: integer("min_portfolio_photos").notNull().default(0),
  commissionBps: integer("commission_bps").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type CategoryConfig = typeof categoryConfigs.$inferSelect;
export type NewCategoryConfig = typeof categoryConfigs.$inferInsert;

// ============================================================
// DISPUTES
// ============================================================
export const disputes = pgTable(
  "disputes",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    bookingId: text("booking_id").notNull(), // soft ref
    raisedBy: text("raised_by").notNull(), // soft ref to users.id
    raisedByRole: text("raised_by_role")
      .notNull()
      .$type<(typeof DISPUTE_RAISED_BY_ROLES)[number]>(),
    reason: text("reason").notNull(),
    description: text("description").notNull(),
    evidenceUrls: text("evidence_urls").array(),
    vendorResponse: text("vendor_response"),
    vendorEvidenceUrls: text("vendor_evidence_urls").array(),
    status: text("status")
      .notNull()
      .default("open")
      .$type<(typeof DISPUTE_STATUSES)[number]>(),
    resolutionNotes: text("resolution_notes"),
    resolvedBy: text("resolved_by"), // soft ref to admin users.id
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    requiresDualApproval: boolean("requires_dual_approval")
      .notNull()
      .default(false),
    approvedBy: text("approved_by").array(), // array of admin user IDs
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_dispute_booking").on(t.bookingId),
    index("idx_dispute_status").on(t.status),
    index("idx_dispute_raised_by").on(t.raisedBy),
    index("idx_dispute_created").on(t.createdAt),
  ],
);

export type Dispute = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;

// ============================================================
// AUDIT_LOGS  (APPEND-ONLY)
// Retain for 7 years per RBI requirements.
// ============================================================
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    actorId: text("actor_id").notNull(), // soft ref to users.id
    actorRole: text("actor_role").notNull(),
    action: varchar("action", { length: 100 }).notNull(), // 'vendor.approve', etc.
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: text("resource_id").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_al_actor").on(t.actorId),
    index("idx_al_resource").on(t.resourceType, t.resourceId),
    index("idx_al_created").on(t.createdAt),
    index("idx_al_action").on(t.action),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
