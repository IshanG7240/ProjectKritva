// Comms domain: conversations, messages, notification_preferences
// Mirrors migrations/005_comms_domain.sql exactly.

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { MESSAGE_TYPES } from "@kritva/types";

// ============================================================
// CONVERSATIONS
// One conversation per booking (enforced by UNIQUE on booking_id).
// All IDs are soft refs (cross-domain boundary).
// ============================================================
export const conversations = pgTable(
  "conversations",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    bookingId: text("booking_id").notNull(), // soft ref; UNIQUE per migration
    customerId: text("customer_id").notNull(), // soft ref
    vendorId: text("vendor_id").notNull(), // soft ref
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_conv_booking").on(t.bookingId),
    index("idx_conv_customer").on(t.customerId),
    index("idx_conv_vendor").on(t.vendorId),
    index("idx_conv_last_msg").on(t.lastMessageAt),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

// ============================================================
// MESSAGES
// ============================================================
export const messages = pgTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull(), // soft ref to users.id
    content: text("content").notNull(),
    type: text("type")
      .notNull()
      .default("text")
      .$type<(typeof MESSAGE_TYPES)[number]>(),
    mediaUrl: text("media_url"),
    flagged: boolean("flagged").notNull().default(false),
    flagReason: text("flag_reason"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_msg_conversation").on(t.conversationId),
    index("idx_msg_conversation_created").on(t.conversationId, t.createdAt),
    index("idx_msg_sender").on(t.senderId),
    index("idx_msg_unread").on(t.conversationId, t.readAt),
  ],
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

// ============================================================
// NOTIFICATION_PREFERENCES
// ============================================================
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    userId: text("user_id").notNull(), // soft ref; UNIQUE per migration
    pushBookings: boolean("push_bookings").notNull().default(true),
    pushMessages: boolean("push_messages").notNull().default(true),
    pushPayments: boolean("push_payments").notNull().default(true),
    pushMarketing: boolean("push_marketing").notNull().default(false),
    smsBookings: boolean("sms_bookings").notNull().default(true),
    smsPayments: boolean("sms_payments").notNull().default(true),
    emailBookings: boolean("email_bookings").notNull().default(true),
    emailPayments: boolean("email_payments").notNull().default(true),
    emailWeeklySummary: boolean("email_weekly_summary").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("uq_notif_user").on(t.userId)],
);

export type NotificationPreference =
  typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference =
  typeof notificationPreferences.$inferInsert;
