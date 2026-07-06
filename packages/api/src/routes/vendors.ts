/**
 * Vendor routes handler.
 * Mounted at /v1/vendors.
 */

import { Hono } from "hono";
import { ulid } from "ulid";
import { and, asc, desc, eq, min, max, or, sql } from "drizzle-orm";
import { db } from "@kritva/db/client";
import { vendors, vendorServices, vendorMedia } from "@kritva/db";
import {
  createMediaSchema,
  createServiceSchema,
  updateServiceSchema,
  updateVendorSchema,
  vendorListQuerySchema,
} from "@kritva/types";
import { supabaseAuth, type AuthVariables } from "../middleware/supabase-auth.js";

const vendorsRouter = new Hono<{ Variables: AuthVariables }>();

async function resolveVendorForUser(userId: string) {
  const [vendor] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.userId, userId))
    .limit(1);
  return vendor ?? null;
}

function mapServiceRow(s: {
  id: string;
  name: string;
  description: string | null;
  price_min: number;
  price_max: number;
  unit: string;
  is_active?: boolean;
}) {
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    price_min: Number(s.price_min),
    price_max: Number(s.price_max),
    unit: s.unit,
    ...(s.is_active !== undefined ? { is_active: s.is_active } : {}),
  };
}

function mapMediaRow(m: {
  id: string;
  url: string;
  thumbnail_url: string | null;
  detail_url: string | null;
  type: string;
  section: string;
  position: number;
  alt_text: string | null;
}) {
  return {
    id: m.id,
    url: m.url,
    thumbnail_url: m.thumbnail_url ?? null,
    detail_url: m.detail_url ?? null,
    type: m.type,
    section: m.section,
    position: m.position,
    alt_text: m.alt_text ?? null,
  };
}

const DEFAULT_PAGE_SIZE = 12;

/**
 * GET /v1/vendors
 * Public directory of approved vendors with search, filters, and pagination.
 * Price range is aggregated from active vendor_services rows.
 */
vendorsRouter.get("/", async (c) => {
  const parsed = vendorListQuerySchema.safeParse({
    category: c.req.query("category") || undefined,
    city_id: c.req.query("city_id") || undefined,
    q: c.req.query("q") || undefined,
    price_min: c.req.query("price_min") || undefined,
    price_max: c.req.query("price_max") || undefined,
    limit: c.req.query("limit") ?? DEFAULT_PAGE_SIZE,
    offset: c.req.query("offset") ?? 0,
  });

  if (!parsed.success) {
    return c.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message ?? "Invalid query parameters",
        },
      },
      400,
    );
  }

  const query = parsed.data;
  const limit = query.limit;
  const offset = query.offset;

  const whereConditions = [eq(vendors.verificationStatus, "approved")];

  if (query.category) {
    whereConditions.push(sql`${query.category} = ANY(${vendors.category})`);
  }

  if (query.city_id) {
    whereConditions.push(eq(vendors.cityId, query.city_id));
  }

  if (query.q) {
    whereConditions.push(
      sql`${vendors.searchVector} @@ plainto_tsquery('english', ${query.q})`,
    );
  }

  const havingConditions = [];

  if (query.price_min != null) {
    havingConditions.push(
      sql`min(${vendorServices.priceMin}) >= ${query.price_min}`,
    );
  }

  if (query.price_max != null) {
    havingConditions.push(
      sql`min(${vendorServices.priceMin}) <= ${query.price_max}`,
    );
  }

  const baseQuery = db
    .select({
      id: vendors.id,
      business_name: vendors.businessName,
      slug: vendors.slug,
      category: vendors.category,
      city_id: vendors.cityId,
      avg_rating: vendors.avgRating,
      rating_count: vendors.ratingCount,
      booking_count: vendors.bookingCount,
      price_min: min(vendorServices.priceMin),
      price_max: max(vendorServices.priceMax),
      unit: sql<string | null>`mode() within group (order by ${vendorServices.unit})`,
      total_count: sql<number>`count(*) over()`.as("total_count"),
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
      vendors.cityId,
      vendors.avgRating,
      vendors.ratingCount,
      vendors.bookingCount,
    )
    .$dynamic();

  if (havingConditions.length > 0) {
    baseQuery.having(and(...havingConditions));
  }

  const rows = await baseQuery
    .orderBy(desc(vendors.avgRating), desc(vendors.bookingCount))
    .limit(limit)
    .offset(offset);

  const totalCount = rows.length > 0 ? Number(rows[0]!.total_count) : 0;

  const vendorList = rows.map((row) => ({
    id: row.id,
    business_name: row.business_name,
    slug: row.slug,
    category: row.category,
    city_id: row.city_id,
    avg_rating: row.avg_rating,
    rating_count: row.rating_count,
    booking_count: row.booking_count,
    price_min: row.price_min != null ? Number(row.price_min) : null,
    price_max: row.price_max != null ? Number(row.price_max) : null,
    unit: row.unit ?? null,
  }));

  return c.json(
    {
      data: { vendors: vendorList },
      error: null,
      meta: {
        pagination: {
          totalCount,
          limit,
          offset,
          hasNextPage: offset + vendorList.length < totalCount,
        },
      },
    },
    200,
  );
});

/**
 * GET /v1/vendors/me
 * Authenticated vendor: returns the full editable profile for the current user.
 */
vendorsRouter.get("/me", supabaseAuth(), async (c) => {
  const userId = c.get("user").id;

  const [vendor] = await db
    .select({
      id: vendors.id,
      business_name: vendors.businessName,
      slug: vendors.slug,
      category: vendors.category,
      city_id: vendors.cityId,
      description: vendors.description,
      years_in_business: vendors.yearsInBusiness,
      profile_photo_url: vendors.profilePhotoUrl,
      avg_rating: vendors.avgRating,
      rating_count: vendors.ratingCount,
      booking_count: vendors.bookingCount,
      response_time_hours: vendors.responseTimeHours,
      verification_status: vendors.verificationStatus,
    })
    .from(vendors)
    .where(eq(vendors.userId, userId))
    .limit(1);

  if (!vendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "No vendor profile is associated with this account.",
        },
      },
      403,
    );
  }

  const [services, media] = await Promise.all([
    db
      .select({
        id: vendorServices.id,
        name: vendorServices.name,
        description: vendorServices.description,
        price_min: vendorServices.priceMin,
        price_max: vendorServices.priceMax,
        unit: vendorServices.unit,
        is_active: vendorServices.isActive,
      })
      .from(vendorServices)
      .where(eq(vendorServices.vendorId, vendor.id))
      .orderBy(desc(vendorServices.createdAt)),
    db
      .select({
        id: vendorMedia.id,
        url: vendorMedia.url,
        thumbnail_url: vendorMedia.thumbnailUrl,
        detail_url: vendorMedia.detailUrl,
        type: vendorMedia.type,
        section: vendorMedia.section,
        position: vendorMedia.position,
        alt_text: vendorMedia.altText,
      })
      .from(vendorMedia)
      .where(eq(vendorMedia.vendorId, vendor.id))
      .orderBy(asc(vendorMedia.position)),
  ]);

  return c.json(
    {
      data: {
        vendor: {
          id: vendor.id,
          business_name: vendor.business_name,
          slug: vendor.slug,
          category: vendor.category,
          city_id: vendor.city_id,
          description: vendor.description ?? null,
          years_in_business: vendor.years_in_business ?? null,
          profile_photo_url: vendor.profile_photo_url ?? null,
          avg_rating: vendor.avg_rating,
          rating_count: vendor.rating_count,
          booking_count: vendor.booking_count,
          response_time_hours:
            vendor.response_time_hours != null
              ? Number(vendor.response_time_hours)
              : null,
          verification_status: vendor.verification_status,
          services: services.map(mapServiceRow),
          media: media.map(mapMediaRow),
        },
      },
      error: null,
    },
    200,
  );
});

/**
 * PATCH /v1/vendors/me
 * Authenticated vendor: updates business profile fields.
 */
vendorsRouter.patch("/me", supabaseAuth(), async (c) => {
  const userId = c.get("user").id;
  const vendor = await resolveVendorForUser(userId);

  if (!vendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "No vendor profile is associated with this account.",
        },
      },
      403,
    );
  }

  const body = await c.req.json();
  const parsed = updateVendorSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message ?? "Invalid request body",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return c.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "At least one field must be provided.",
        },
      },
      400,
    );
  }

  const [updated] = await db
    .update(vendors)
    .set({
      ...(data.business_name !== undefined
        ? { businessName: data.business_name }
        : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.city_id !== undefined ? { cityId: data.city_id } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
      ...(data.years_in_business !== undefined
        ? { yearsInBusiness: data.years_in_business }
        : {}),
      ...(data.profile_photo_url !== undefined
        ? { profilePhotoUrl: data.profile_photo_url }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(vendors.id, vendor.id))
    .returning({
      id: vendors.id,
      business_name: vendors.businessName,
      slug: vendors.slug,
      category: vendors.category,
      city_id: vendors.cityId,
      description: vendors.description,
      years_in_business: vendors.yearsInBusiness,
    });

  return c.json(
    {
      data: {
        vendor: {
          id: updated!.id,
          business_name: updated!.business_name,
          slug: updated!.slug,
          category: updated!.category,
          city_id: updated!.city_id,
          description: updated!.description ?? null,
          years_in_business: updated!.years_in_business ?? null,
        },
      },
      error: null,
    },
    200,
  );
});

/**
 * POST /v1/vendors/me/services
 * Authenticated vendor: creates a new service offering.
 */
vendorsRouter.post("/me/services", supabaseAuth(), async (c) => {
  const userId = c.get("user").id;
  const vendor = await resolveVendorForUser(userId);

  if (!vendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "No vendor profile is associated with this account.",
        },
      },
      403,
    );
  }

  const body = await c.req.json();
  const parsed = createServiceSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message ?? "Invalid request body",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const data = parsed.data;
  const serviceId = ulid();

  const [created] = await db
    .insert(vendorServices)
    .values({
      id: serviceId,
      vendorId: vendor.id,
      name: data.name,
      description: data.description,
      priceMin: data.price_min,
      priceMax: data.price_max,
      unit: data.unit,
      isActive: data.is_active ?? true,
    })
    .returning({
      id: vendorServices.id,
      name: vendorServices.name,
      description: vendorServices.description,
      price_min: vendorServices.priceMin,
      price_max: vendorServices.priceMax,
      unit: vendorServices.unit,
      is_active: vendorServices.isActive,
    });

  return c.json(
    { data: { service: mapServiceRow(created!) }, error: null },
    201,
  );
});

/**
 * PATCH /v1/vendors/me/services/:serviceId
 * Authenticated vendor: updates an existing service.
 */
vendorsRouter.patch("/me/services/:serviceId", supabaseAuth(), async (c) => {
  const userId = c.get("user").id;
  const serviceId = c.req.param("serviceId");
  const vendor = await resolveVendorForUser(userId);

  if (!vendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "No vendor profile is associated with this account.",
        },
      },
      403,
    );
  }

  const [existing] = await db
    .select({ id: vendorServices.id })
    .from(vendorServices)
    .where(
      and(
        eq(vendorServices.id, serviceId),
        eq(vendorServices.vendorId, vendor.id),
      ),
    )
    .limit(1);

  if (!existing) {
    return c.json(
      {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Service '${serviceId}' was not found.`,
        },
      },
      404,
    );
  }

  const body = await c.req.json();
  const parsed = updateServiceSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message ?? "Invalid request body",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return c.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "At least one field must be provided.",
        },
      },
      400,
    );
  }

  const [updated] = await db
    .update(vendorServices)
    .set({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
      ...(data.price_min !== undefined ? { priceMin: data.price_min } : {}),
      ...(data.price_max !== undefined ? { priceMax: data.price_max } : {}),
      ...(data.unit !== undefined ? { unit: data.unit } : {}),
      ...(data.is_active !== undefined ? { isActive: data.is_active } : {}),
    })
    .where(eq(vendorServices.id, serviceId))
    .returning({
      id: vendorServices.id,
      name: vendorServices.name,
      description: vendorServices.description,
      price_min: vendorServices.priceMin,
      price_max: vendorServices.priceMax,
      unit: vendorServices.unit,
      is_active: vendorServices.isActive,
    });

  return c.json(
    { data: { service: mapServiceRow(updated!) }, error: null },
    200,
  );
});

/**
 * DELETE /v1/vendors/me/services/:serviceId
 * Authenticated vendor: soft-deletes a service (sets is_active = false).
 */
vendorsRouter.delete("/me/services/:serviceId", supabaseAuth(), async (c) => {
  const userId = c.get("user").id;
  const serviceId = c.req.param("serviceId");
  const vendor = await resolveVendorForUser(userId);

  if (!vendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "No vendor profile is associated with this account.",
        },
      },
      403,
    );
  }

  const [existing] = await db
    .select({ id: vendorServices.id })
    .from(vendorServices)
    .where(
      and(
        eq(vendorServices.id, serviceId),
        eq(vendorServices.vendorId, vendor.id),
      ),
    )
    .limit(1);

  if (!existing) {
    return c.json(
      {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Service '${serviceId}' was not found.`,
        },
      },
      404,
    );
  }

  await db
    .update(vendorServices)
    .set({ isActive: false })
    .where(eq(vendorServices.id, serviceId));

  return c.json({ data: { id: serviceId }, error: null }, 200);
});

/**
 * POST /v1/vendors/me/media
 * Authenticated vendor: adds a gallery or portfolio media item.
 */
vendorsRouter.post("/me/media", supabaseAuth(), async (c) => {
  const userId = c.get("user").id;
  const vendor = await resolveVendorForUser(userId);

  if (!vendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "No vendor profile is associated with this account.",
        },
      },
      403,
    );
  }

  const body = await c.req.json();
  const parsed = createMediaSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message ?? "Invalid request body",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const data = parsed.data;
  const mediaId = ulid();

  const [created] = await db
    .insert(vendorMedia)
    .values({
      id: mediaId,
      vendorId: vendor.id,
      url: data.url,
      thumbnailUrl: data.thumbnail_url,
      detailUrl: data.detail_url,
      type: data.type,
      section: data.section,
      position: data.position,
      altText: data.alt_text,
    })
    .returning({
      id: vendorMedia.id,
      url: vendorMedia.url,
      thumbnail_url: vendorMedia.thumbnailUrl,
      detail_url: vendorMedia.detailUrl,
      type: vendorMedia.type,
      section: vendorMedia.section,
      position: vendorMedia.position,
      alt_text: vendorMedia.altText,
    });

  return c.json(
    { data: { media: mapMediaRow(created!) }, error: null },
    201,
  );
});

/**
 * DELETE /v1/vendors/me/media/:mediaId
 * Authenticated vendor: removes a media item.
 */
vendorsRouter.delete("/me/media/:mediaId", supabaseAuth(), async (c) => {
  const userId = c.get("user").id;
  const mediaId = c.req.param("mediaId");
  const vendor = await resolveVendorForUser(userId);

  if (!vendor) {
    return c.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "No vendor profile is associated with this account.",
        },
      },
      403,
    );
  }

  const [existing] = await db
    .select({ id: vendorMedia.id })
    .from(vendorMedia)
    .where(
      and(eq(vendorMedia.id, mediaId), eq(vendorMedia.vendorId, vendor.id)),
    )
    .limit(1);

  if (!existing) {
    return c.json(
      {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Media '${mediaId}' was not found.`,
        },
      },
      404,
    );
  }

  await db.delete(vendorMedia).where(eq(vendorMedia.id, mediaId));

  return c.json({ data: { id: mediaId }, error: null }, 200);
});

/**
 * GET /v1/vendors/:idOrSlug
 * Public profile for a single approved vendor including their active services.
 * Accepts either the vendor ULID or public slug.
 */
vendorsRouter.get("/:idOrSlug", async (c) => {
  const idOrSlug = c.req.param("idOrSlug");

  const [vendor] = await db
    .select({
      id: vendors.id,
      business_name: vendors.businessName,
      slug: vendors.slug,
      category: vendors.category,
      city_id: vendors.cityId,
      description: vendors.description,
      years_in_business: vendors.yearsInBusiness,
      profile_photo_url: vendors.profilePhotoUrl,
      avg_rating: vendors.avgRating,
      rating_count: vendors.ratingCount,
      booking_count: vendors.bookingCount,
      response_time_hours: vendors.responseTimeHours,
    })
    .from(vendors)
    .where(
      and(
        or(eq(vendors.id, idOrSlug), eq(vendors.slug, idOrSlug)),
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
          message: `Vendor '${idOrSlug}' was not found.`,
        },
      },
      404,
    );
  }

  const [services, media] = await Promise.all([
    db
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
      ),
    db
      .select({
        id: vendorMedia.id,
        url: vendorMedia.url,
        thumbnail_url: vendorMedia.thumbnailUrl,
        detail_url: vendorMedia.detailUrl,
        type: vendorMedia.type,
        section: vendorMedia.section,
        position: vendorMedia.position,
        alt_text: vendorMedia.altText,
      })
      .from(vendorMedia)
      .where(eq(vendorMedia.vendorId, vendor.id))
      .orderBy(asc(vendorMedia.position)),
  ]);

  const payload = {
    id: vendor.id,
    business_name: vendor.business_name,
    slug: vendor.slug,
    category: vendor.category,
    city_id: vendor.city_id,
    description: vendor.description ?? null,
    years_in_business: vendor.years_in_business ?? null,
    profile_photo_url: vendor.profile_photo_url ?? null,
    avg_rating: vendor.avg_rating,
    rating_count: vendor.rating_count,
    booking_count: vendor.booking_count,
    response_time_hours:
      vendor.response_time_hours != null
        ? Number(vendor.response_time_hours)
        : null,
    services: services.map((s) => mapServiceRow(s)),
    media: media.map((m) => mapMediaRow(m)),
  };

  return c.json({ data: { vendor: payload }, error: null }, 200);
});

export { vendorsRouter };
