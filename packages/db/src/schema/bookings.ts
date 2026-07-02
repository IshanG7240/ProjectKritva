// Booking domain: events, checklist_items, bookings,
// booking_milestones, booking_events
// Mirrors migrations/003_booking_domain.sql exactly.

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import {
  BOOKING_STATUSES,
  EVENT_STATUSES,
  EVENT_TYPES,
  MILESTONE_NAMES,
  MILESTONE_PAYMENT_STATUSES,
} from "@kritva/types";

// ============================================================
// EVENTS
// ============================================================
export const events = pgTable(
  "events",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    customerId: text("customer_id").notNull(), // soft ref to users.id
    name: varchar("name", { length: 200 }).notNull(),
    type: text("type")
      .notNull()
      .$type<(typeof EVENT_TYPES)[number]>(),
    date: text("date"), // stored as `date` in PG; nullable
    cityId: varchar("city_id", { length: 50 }).notNull().default("delhi-ncr"),
    venue: text("venue"),
    guestCount: integer("guest_count"),
    budgetTotal: integer("budget_total"), // paisa; nullable
    budgetSpent: integer("budget_spent").notNull().default(0), // paisa
    status: text("status")
      .notNull()
      .default("planning")
      .$type<(typeof EVENT_STATUSES)[number]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_event_customer").on(t.customerId),
    index("idx_event_date").on(t.date),
    index("idx_event_status").on(t.status),
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// ============================================================
// CHECKLIST_ITEMS
// ============================================================
export const checklistItems = pgTable(
  "checklist_items",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    category: varchar("category", { length: 100 }),
    bookingId: text("booking_id"), // soft ref to bookings.id
    isManual: boolean("is_manual").notNull().default(false),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("idx_cli_event").on(t.eventId)],
);

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type NewChecklistItem = typeof checklistItems.$inferInsert;

// ============================================================
// BOOKINGS
// ============================================================
export const bookings = pgTable(
  "bookings",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    eventId: text("event_id"), // soft ref to events.id; nullable
    vendorId: text("vendor_id").notNull(), // soft ref to vendors.id
    customerId: text("customer_id").notNull(), // soft ref to users.id
    serviceDetails: jsonb("service_details")
      .notNull()
      .default(sql`'{}'::jsonb`),
    totalAmount: integer("total_amount").notNull(), // paisa
    status: text("status")
      .notNull()
      .default("inquiry")
      .$type<(typeof BOOKING_STATUSES)[number]>(),
    declineReason: text("decline_reason"),
    counterAmount: integer("counter_amount"), // paisa; nullable
    counterMessage: text("counter_message"),
    eventDate: text("event_date").notNull(), // stored as `date` in PG
    eventType: text("event_type").notNull(),
    guestCount: integer("guest_count"),
    notes: text("notes"),
    cityId: varchar("city_id", { length: 50 }).notNull().default("delhi-ncr"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_booking_vendor").on(t.vendorId),
    index("idx_booking_customer").on(t.customerId),
    index("idx_booking_event").on(t.eventId),
    index("idx_booking_status").on(t.status),
    index("idx_booking_date").on(t.eventDate),
    index("idx_booking_city").on(t.cityId),
    index("idx_booking_vendor_status").on(t.vendorId, t.status),
    index("idx_booking_customer_status").on(t.customerId, t.status),
  ],
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

// ============================================================
// BOOKING_MILESTONES
// ============================================================
export const bookingMilestones = pgTable(
  "booking_milestones",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    name: text("name")
      .notNull()
      .$type<(typeof MILESTONE_NAMES)[number]>(),
    label: varchar("label", { length: 100 }).notNull(),
    amount: integer("amount").notNull(), // paisa
    percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
    dueDate: text("due_date"), // stored as `date` in PG; nullable
    paymentStatus: text("payment_status")
      .notNull()
      .default("pending")
      .$type<(typeof MILESTONE_PAYMENT_STATUSES)[number]>(),
    paymentId: text("payment_id"), // soft ref to payments.id
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_bm_booking").on(t.bookingId),
    index("idx_bm_status").on(t.paymentStatus),
  ],
);

export type BookingMilestone = typeof bookingMilestones.$inferSelect;
export type NewBookingMilestone = typeof bookingMilestones.$inferInsert;

// ============================================================
// BOOKING_EVENTS  (APPEND-ONLY)
// ============================================================
export const bookingEvents = pgTable(
  "booking_events",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    actorId: text("actor_id").notNull(), // soft ref to users.id
    actorRole: text("actor_role").notNull(),
    metadata: jsonb("metadata"),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_be_booking").on(t.bookingId),
    index("idx_be_created").on(t.createdAt),
  ],
);

export type BookingEvent = typeof bookingEvents.$inferSelect;
export type NewBookingEvent = typeof bookingEvents.$inferInsert;
