// Vendor domain: vendors, vendor_packages, vendor_media,
// vendor_availability, vendor_documents
// Mirrors migrations/002_vendor_domain.sql + 016_vendor_packages.sql.

import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import {
  DOCUMENT_TYPES,
  MEDIA_SECTIONS,
  MEDIA_TYPES,
  PACKAGE_UNITS,
  VERIFICATION_STATUSES,
} from "@kritva/types";
// tsvector is not a built-in Drizzle pg-core column type; we declare a
// custom type so Drizzle carries it through without trying to cast it.
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ============================================================
// VENDORS
// ============================================================
export const vendors = pgTable(
  "vendors",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    userId: text("user_id").notNull(),
    businessName: varchar("business_name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    category: text("category").array().notNull().default(sql`'{}'`),
    cityId: varchar("city_id", { length: 50 }).notNull().default("delhi-ncr"),
    description: text("description"),
    yearsInBusiness: integer("years_in_business"),
    profilePhotoUrl: text("profile_photo_url"),
    avgRating: numeric("avg_rating", { precision: 3, scale: 2 })
      .notNull()
      .default("0"),
    ratingCount: integer("rating_count").notNull().default(0),
    bookingCount: integer("booking_count").notNull().default(0),
    responseTimeHours: numeric("response_time_hours", {
      precision: 5,
      scale: 1,
    }),
    verificationStatus: text("verification_status")
      .notNull()
      .default("draft")
      .$type<(typeof VERIFICATION_STATUSES)[number]>(),
    verificationNotes: text("verification_notes"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"), // soft ref to users.id
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    searchVector: tsvector("search_vector"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_vendor_user").on(t.userId),
    uniqueIndex("uq_vendor_slug").on(t.slug),
    index("idx_vendor_user").on(t.userId),
    index("idx_vendor_slug").on(t.slug),
    index("idx_vendor_city").on(t.cityId),
    // GIN indexes on array/tsvector columns are created via raw SQL in
    // migrations; Drizzle does not generate GIN index DDL via push but
    // the column definitions here match the schema exactly.
    index("idx_vendor_status").on(t.verificationStatus),
    index("idx_vendor_rating").on(t.avgRating),
    index("idx_vendor_city_status").on(t.cityId, t.verificationStatus),
  ],
);

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;

// ============================================================
// VENDOR_PACKAGES
// ============================================================
export const vendorPackages = pgTable(
  "vendor_packages",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    price: integer("price").notNull(), // paisa
    unit: text("unit")
      .notNull()
      .default("flat")
      .$type<(typeof PACKAGE_UNITS)[number]>(),
    minQuantity: integer("min_quantity"),
    inclusions: jsonb("inclusions")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_vp_vendor").on(t.vendorId),
    index("idx_vp_vendor_active").on(t.vendorId, t.isActive),
  ],
);

export type VendorPackage = typeof vendorPackages.$inferSelect;
export type NewVendorPackage = typeof vendorPackages.$inferInsert;
// ============================================================
// VENDOR_MEDIA
// ============================================================
export const vendorMedia = pgTable(
  "vendor_media",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    vendorId: text("vendor_id").notNull(),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    detailUrl: text("detail_url"),
    type: text("type")
      .notNull()
      .default("image")
      .$type<(typeof MEDIA_TYPES)[number]>(),
    section: text("section")
      .notNull()
      .default("portfolio")
      .$type<(typeof MEDIA_SECTIONS)[number]>(),
    position: integer("position").notNull().default(0),
    altText: varchar("alt_text", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_vm_vendor").on(t.vendorId),
    index("idx_vm_position").on(t.vendorId, t.position),
  ],
);

export type VendorMedia = typeof vendorMedia.$inferSelect;
export type NewVendorMedia = typeof vendorMedia.$inferInsert;

// ============================================================
// VENDOR_AVAILABILITY
// ============================================================
export const vendorAvailability = pgTable(
  "vendor_availability",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    vendorId: text("vendor_id").notNull(),
    date: text("date").notNull(), // stored as `date` in PG; text keeps Drizzle simple
    isAvailable: boolean("is_available").notNull().default(true),
    bookingId: text("booking_id"), // soft ref to bookings.id
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_vendor_date").on(t.vendorId, t.date),
    index("idx_va_vendor_date").on(t.vendorId, t.date),
  ],
);

export type VendorAvailability = typeof vendorAvailability.$inferSelect;
export type NewVendorAvailability = typeof vendorAvailability.$inferInsert;

// ============================================================
// VENDOR_DOCUMENTS
// ============================================================
export const vendorDocuments = pgTable(
  "vendor_documents",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    vendorId: text("vendor_id").notNull(),
    type: text("type")
      .notNull()
      .$type<(typeof DOCUMENT_TYPES)[number]>(),
    url: text("url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    verified: boolean("verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"), // soft ref to admin users.id
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("idx_vd_vendor").on(t.vendorId)],
);

export type VendorDocument = typeof vendorDocuments.$inferSelect;
export type NewVendorDocument = typeof vendorDocuments.$inferInsert;
