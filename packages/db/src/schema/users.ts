// Auth domain: users, otp_requests, refresh_tokens, device_tokens
// Mirrors migrations/001_auth_domain.sql exactly.

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import {
  DEVICE_PLATFORMS,
  ROLES,
  USER_STATUSES,
} from "@kritva/types";

// ============================================================
// USERS
// ============================================================
export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    phone: varchar("phone", { length: 15 }),
    email: varchar("email", { length: 255 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    name: varchar("name", { length: 100 }).notNull(),
    role: text("role")
      .notNull()
      .$type<(typeof ROLES)[number]>()
      .notNull(),
    cityId: varchar("city_id", { length: 50 }).notNull().default("delhi-ncr"),
    avatarUrl: text("avatar_url"),
    eventInterests: text("event_interests").array(),
    status: text("status")
      .notNull()
      .default("active")
      .$type<(typeof USER_STATUSES)[number]>(),
    suspendedUntil: timestamp("suspended_until", { withTimezone: true }),
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("idx_users_phone").on(t.phone),
    uniqueIndex("idx_users_email").on(t.email),
    index("idx_users_role").on(t.role),
    index("idx_users_city").on(t.cityId),
    index("idx_users_status").on(t.status),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ============================================================
// OTP_REQUESTS
// ============================================================
export const otpRequests = pgTable(
  "otp_requests",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    phone: varchar("phone", { length: 15 }).notNull(),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    attempts: text("attempts")
      .notNull()
      .default(sql`0`),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_otp_phone").on(t.phone),
    index("idx_otp_expires").on(t.expiresAt),
  ],
);

export type OtpRequest = typeof otpRequests.$inferSelect;
export type NewOtpRequest = typeof otpRequests.$inferInsert;

// ============================================================
// REFRESH_TOKENS
// ============================================================
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    deviceInfo: jsonb("device_info"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_refresh_user").on(t.userId),
    index("idx_refresh_expires").on(t.expiresAt),
  ],
);

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

// ============================================================
// DEVICE_TOKENS
// ============================================================
export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: text("platform")
      .notNull()
      .$type<(typeof DEVICE_PLATFORMS)[number]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("uq_device_token").on(t.userId, t.token)],
);

export type DeviceToken = typeof deviceTokens.$inferSelect;
export type NewDeviceToken = typeof deviceTokens.$inferInsert;
