/**
 * Vendor routes handler.
 * Mounted at /v1/vendors.
 */

import { Hono } from "hono";
import { and, eq, min, max, sql } from "drizzle-orm";
import { db } from "@kritva/db/client";
import { vendors, vendorServices } from "@kritva/db";

const vendorsRouter = new Hono();

/**
 * GET /v1/vendors
 * Public directory of approved vendors, with optional category filtering.
 * Price range is aggregated from active vendor_services rows.
 */
vendorsRouter.get("/", async (c) => {
  const category = c.req.query("category");

  // Build the WHERE clause: only approved vendors, optionally filtered by category.
  // The category column is a text[] array; we use the Postgres ANY operator
  // to check if the requested string exists inside it.
  const whereConditions = [eq(vendors.verificationStatus, "approved")];

  if (category) {
    // `= ANY(column)` checks if the scalar value is in the array column.
    whereConditions.push(
      sql`${category} = ANY(${vendors.category})`,
    );
  }

  // Single query: join vendors with their active services and aggregate price range.
  const rows = await db
    .select({
      id: vendors.id,
      business_name: vendors.businessName,
      slug: vendors.slug,
      category: vendors.category,
      avg_rating: vendors.avgRating,
      rating_count: vendors.ratingCount,
      // Aggregate over active services; NULL when vendor has no services yet.
      price_min: min(vendorServices.priceMin),
      price_max: max(vendorServices.priceMax),
      unit: sql<string | null>`mode() within group (order by ${vendorServices.unit})`,
    })
    .from(vendors)
    .leftJoin(
      vendorServices,
      and(
        eq(vendorServices.vendorId, vendors.id),
        eq(vendorServices.isActive, true),
      ),
    )
    .where(and(...whereConditions))
    .groupBy(
      vendors.id,
      vendors.businessName,
      vendors.slug,
      vendors.category,
      vendors.avgRating,
      vendors.ratingCount,
    );

  // Map rows to the spec shape, coercing numeric strings to integers.
  const vendorList = rows.map((row) => ({
    id: row.id,
    business_name: row.business_name,
    slug: row.slug,
    category: row.category,
    avg_rating: row.avg_rating,
    rating_count: row.rating_count,
    // price columns are integer paisa; return as int or null if no services.
    price_min: row.price_min != null ? Number(row.price_min) : null,
    price_max: row.price_max != null ? Number(row.price_max) : null,
    unit: row.unit ?? null,
  }));

  return c.json({ data: { vendors: vendorList }, error: null }, 200);
});

/**
 * GET /v1/vendors/:slug
 * Public profile for a single approved vendor including their active services.
 * Returns 404 if the slug does not exist or the vendor is not approved.
 */
vendorsRouter.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  // Fetch the vendor row — must be approved to be publicly visible.
  const [vendor] = await db
    .select({
      id: vendors.id,
      business_name: vendors.businessName,
      slug: vendors.slug,
      category: vendors.category,
      city_id: vendors.cityId,
      description: vendors.description,
      years_in_business: vendors.yearsInBusiness,
      avg_rating: vendors.avgRating,
      rating_count: vendors.ratingCount,
      booking_count: vendors.bookingCount,
      response_time_hours: vendors.responseTimeHours,
    })
    .from(vendors)
    .where(
      and(
        eq(vendors.slug, slug),
        eq(vendors.verificationStatus, "approved"),
      ),
    )
    .limit(1);

  if (!vendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Vendor with slug '${slug}' was not found.`,
        },
      },
      404,
    );
  }

  // Fetch all active services for this vendor.
  const services = await db
    .select({
      id: vendorServices.id,
      name: vendorServices.name,
      description: vendorServices.description,
      price_min: vendorServices.priceMin,
      price_max: vendorServices.priceMax,
      unit: vendorServices.unit,
    })
    .from(vendorServices)
    .where(
      and(
        eq(vendorServices.vendorId, vendor.id),
        eq(vendorServices.isActive, true),
      ),
    );

  // Map to response shape; numeric fields coerced to plain numbers.
  const payload = {
    id: vendor.id,
    business_name: vendor.business_name,
    slug: vendor.slug,
    category: vendor.category,
    city_id: vendor.city_id,
    description: vendor.description ?? null,
    years_in_business: vendor.years_in_business ?? null,
    avg_rating: vendor.avg_rating,
    rating_count: vendor.rating_count,
    booking_count: vendor.booking_count,
    response_time_hours:
      vendor.response_time_hours != null
        ? Number(vendor.response_time_hours)
        : null,
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? null,
      price_min: Number(s.price_min), // integer paisa
      price_max: Number(s.price_max), // integer paisa
      unit: s.unit,
    })),
  };

  return c.json({ data: { vendor: payload }, error: null }, 200);
});

export { vendorsRouter };
