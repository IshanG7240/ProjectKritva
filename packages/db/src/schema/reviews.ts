// Reviews domain (owned by Vendor domain per architecture).
// One review per completed booking.
// Mirrors migrations/007_reviews.sql exactly.

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================================
// REVIEWS
// ============================================================
export const reviews = pgTable(
  "reviews",
  {
    id: text("id")
      .primaryKey()
      .default(sql`generate_ulid()`),
    bookingId: text("booking_id").notNull(), // soft ref; UNIQUE per migration
    reviewerId: text("reviewer_id").notNull(), // soft ref to users.id (customer)
    vendorId: text("vendor_id").notNull(), // soft ref to vendors.id
    rating: integer("rating").notNull(),
    content: text("content"),
    mediaUrls: text("media_urls").array(),
    verified: boolean("verified").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_review_booking").on(t.bookingId),
    index("idx_review_vendor").on(t.vendorId),
    index("idx_review_rating").on(t.vendorId, t.rating),
    index("idx_review_reviewer").on(t.reviewerId),
    index("idx_review_created").on(t.createdAt),
    check("chk_review_rating", sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
  ],
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
