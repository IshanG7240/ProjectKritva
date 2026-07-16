/**
 * Vendor routes handler.
 * Mounted at /v1/vendors.
 */

import { Hono } from "hono";
import { ulid } from "ulid";
import { and, asc, desc, eq, min, max, or, sql } from "drizzle-orm";
import { db } from "@kritva/db/client";
import { users, vendors, vendorPackages, vendorMedia } from "@kritva/db";
import {
  createMediaSchema,
  createPackageSchema,
  packageUnitAllowsMinQuantity,
  submitVendorForReviewSchema,
  updatePackageSchema,
  updateVendorSchema,
  vendorListQuerySchema,
  type PackageUnit,
} from "@kritva/types";
import { dispatch as dispatchNotification } from "@kritva/notifications/dispatcher";
import { appendAuditLog } from "../lib/audit.js";
import {
  isKritvaVerified,
  isMockVendor,
  vendorDiscoverableWhere,
} from "../lib/vendor-discoverability.js";
import { computeVendorReadiness } from "../lib/vendor-readiness.js";
import { supabaseAuth, type AuthVariables } from "../middleware/supabase-auth.js";

const vendorsRouter = new Hono<{ Variables: AuthVariables }>();

function requestMeta(c: {
  req: { header: (name: string) => string | undefined };
}) {
  return {
    ipAddress:
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      null,
    userAgent: c.req.header("user-agent") ?? null,
  };
}

async function resolveVendorForUser(userId: string) {
  const [vendor] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.userId, userId))
    .limit(1);
  return vendor ?? null;
}

function mapLocationFields(row: {
  location_name: string | null;
  location_address: string | null;
  location_lat: string | number | null;
  location_lng: string | number | null;
  location_maps_url: string | null;
}) {
  return {
    location_name: row.location_name ?? null,
    location_address: row.location_address ?? null,
    location_lat:
      row.location_lat != null ? Number(row.location_lat) : null,
    location_lng:
      row.location_lng != null ? Number(row.location_lng) : null,
    location_maps_url: row.location_maps_url ?? null,
  };
}

function mapPackageRow(p: {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  min_quantity?: number | null;
  inclusions?: string[] | null;
  metadata?: Record<string, unknown> | null;
  is_active?: boolean;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
}) {
  const inclusions = Array.isArray(p.inclusions) ? p.inclusions : [];
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    price: Number(p.price),
    unit: p.unit as PackageUnit,
    min_quantity: p.min_quantity != null ? Number(p.min_quantity) : null,
    inclusions,
    ...(p.metadata !== undefined ? { metadata: p.metadata ?? null } : {}),
    ...(p.is_active !== undefined ? { is_active: p.is_active } : {}),
    ...(p.created_at != null
      ? {
          created_at:
            p.created_at instanceof Date
              ? p.created_at.toISOString()
              : p.created_at,
        }
      : {}),
    ...(p.updated_at != null
      ? {
          updated_at:
            p.updated_at instanceof Date
              ? p.updated_at.toISOString()
              : p.updated_at,
        }
      : {}),
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
 * Public directory of discoverable vendors (checklist-complete or approved)
 * with search, filters, and pagination.
 * Price range is aggregated from active vendor_packages rows.
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

  const whereConditions = [vendorDiscoverableWhere()];

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
      sql`min(${vendorPackages.price}) >= ${query.price_min}`,
    );
  }

  if (query.price_max != null) {
    havingConditions.push(
      sql`min(${vendorPackages.price}) <= ${query.price_max}`,
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
      profile_photo_url: vendors.profilePhotoUrl,
      verification_status: vendors.verificationStatus,
      cover_image: sql<string | null>`(
        SELECT ${vendorMedia.url} FROM ${vendorMedia}
        WHERE ${vendorMedia.vendorId} = ${vendors.id}
          AND ${vendorMedia.section} = 'banner'
          AND ${vendorMedia.type} = 'image'
        ORDER BY ${vendorMedia.position} ASC
        LIMIT 1
      )`,
      price_min: min(vendorPackages.price),
      price_max: max(vendorPackages.price),
      unit: sql<string | null>`(
        array_agg(${vendorPackages.unit} ORDER BY ${vendorPackages.price} ASC)
        FILTER (WHERE ${vendorPackages.id} IS NOT NULL)
      )[1]`,
      units_mixed: sql<boolean>`count(DISTINCT ${vendorPackages.unit}) > 1`,
      total_count: sql<number>`count(*) over()`.as("total_count"),
    })
    .from(vendors)
    .leftJoin(
      vendorPackages,
      and(
        eq(vendorPackages.vendorId, vendors.id),
        eq(vendorPackages.isActive, true),
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
      vendors.profilePhotoUrl,
      vendors.verificationStatus,
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

  const vendorList = rows.map((row) => {
    const priceMin = row.price_min != null ? Number(row.price_min) : null;
    const priceMax = row.price_max != null ? Number(row.price_max) : null;
    const unitsMixed = Boolean(row.units_mixed);
    return {
      id: row.id,
      business_name: row.business_name,
      slug: row.slug,
      category: row.category,
      city_id: row.city_id,
      avg_rating: row.avg_rating,
      rating_count: row.rating_count,
      booking_count: row.booking_count,
      profile_photo_url: row.profile_photo_url ?? null,
      cover_image: row.cover_image ?? null,
      price_min: priceMin,
      // Mixed units: expose min only as starting price (price_max = price_min)
      price_max: unitsMixed && priceMin != null ? priceMin : priceMax,
      unit: (row.unit as PackageUnit | null) ?? null,
      units_mixed: unitsMixed,
      is_verified: isKritvaVerified(row.verification_status),
      is_mock: isMockVendor(row.slug),
    };
  });

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
 * GET /v1/vendors/me/readiness
 * Returns profile completeness checks for submit-for-review.
 */
vendorsRouter.get("/me/readiness", supabaseAuth(), async (c) => {
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

  const readiness = await computeVendorReadiness(vendor.id);

  return c.json({ data: readiness, error: null }, 200);
});

/**
 * POST /v1/vendors/me/submit
 * Submits a complete vendor profile for admin review.
 */
vendorsRouter.post("/me/submit", supabaseAuth(), async (c) => {
  const authUser = c.get("user");
  const userId = authUser.id;
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

  const body = await c.req.json().catch(() => ({}));
  const parsed = submitVendorForReviewSchema.safeParse(body);

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

  const [vendorRow] = await db
    .select({
      id: vendors.id,
      business_name: vendors.businessName,
      slug: vendors.slug,
      verification_status: vendors.verificationStatus,
    })
    .from(vendors)
    .where(eq(vendors.id, vendor.id))
    .limit(1);

  if (!vendorRow) {
    return c.json(
      {
        data: null,
        error: { code: "NOT_FOUND", message: "Vendor profile not found." },
      },
      404,
    );
  }

  if (
    vendorRow.verification_status !== "draft" &&
    vendorRow.verification_status !== "rejected"
  ) {
    return c.json(
      {
        data: null,
        error: {
          code: "CONFLICT",
          message: `Cannot submit while status is ${vendorRow.verification_status}.`,
        },
      },
      409,
    );
  }

  const readiness = await computeVendorReadiness(vendor.id);
  if (!readiness.complete) {
    return c.json(
      {
        data: readiness,
        error: {
          code: "VALIDATION_FAILED",
          message: "Profile is incomplete. Fix the missing items and try again.",
        },
      },
      422,
    );
  }

  const [owner] = await db
    .select({ email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const now = new Date();
  const meta = requestMeta(c);

  const [updated] = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(vendors)
      .set({
        verificationStatus: "pending_review",
        submittedAt: now,
        updatedAt: now,
      })
      .where(eq(vendors.id, vendor.id))
      .returning({
        id: vendors.id,
        verification_status: vendors.verificationStatus,
        submitted_at: vendors.submittedAt,
      });

    await appendAuditLog(tx, {
      actorId: userId,
      actorRole: owner?.role ?? "vendor",
      action: "vendor.submit",
      resourceType: "vendor",
      resourceId: vendor.id,
      oldValue: {
        verification_status: vendorRow.verification_status,
        submitted_at: null,
      },
      newValue: {
        verification_status: "pending_review",
        submitted_at: now.toISOString(),
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return [row];
  });

  const webBase = process.env.WEB_BASE_URL?.replace(/\/$/, "") ?? "";
  void dispatchNotification({
    kind: "vendor_submitted",
    vendor_id: vendor.id,
    user_id: userId,
    business_name: vendorRow.business_name,
    slug: vendorRow.slug,
    to_email: owner?.email ?? null,
    profile_url: webBase ? `${webBase}/vendor/profile` : "/vendor/profile",
  }).catch(() => {});

  return c.json(
    {
      data: {
        id: updated!.id,
        verification_status: updated!.verification_status,
        submitted_at: updated!.submitted_at!.toISOString(),
      },
      error: null,
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
      location_name: vendors.locationName,
      location_address: vendors.locationAddress,
      location_lat: vendors.locationLat,
      location_lng: vendors.locationLng,
      location_maps_url: vendors.locationMapsUrl,
      avg_rating: vendors.avgRating,
      rating_count: vendors.ratingCount,
      booking_count: vendors.bookingCount,
      response_time_hours: vendors.responseTimeHours,
      verification_status: vendors.verificationStatus,
      verification_notes: vendors.verificationNotes,
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

  const [packages, media] = await Promise.all([
    db
      .select({
        id: vendorPackages.id,
        name: vendorPackages.name,
        description: vendorPackages.description,
        price: vendorPackages.price,
        unit: vendorPackages.unit,
        min_quantity: vendorPackages.minQuantity,
        inclusions: vendorPackages.inclusions,
        metadata: vendorPackages.metadata,
        is_active: vendorPackages.isActive,
        created_at: vendorPackages.createdAt,
        updated_at: vendorPackages.updatedAt,
      })
      .from(vendorPackages)
      .where(eq(vendorPackages.vendorId, vendor.id))
      .orderBy(desc(vendorPackages.createdAt)),
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
          ...mapLocationFields(vendor),
          avg_rating: vendor.avg_rating,
          rating_count: vendor.rating_count,
          booking_count: vendor.booking_count,
          response_time_hours:
            vendor.response_time_hours != null
              ? Number(vendor.response_time_hours)
              : null,
          verification_status: vendor.verification_status,
          verification_notes: vendor.verification_notes ?? null,
          packages: packages.map(mapPackageRow),
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
      ...(data.location_name !== undefined
        ? { locationName: data.location_name }
        : {}),
      ...(data.location_address !== undefined
        ? { locationAddress: data.location_address }
        : {}),
      ...(data.location_lat !== undefined
        ? {
            locationLat:
              data.location_lat != null ? String(data.location_lat) : null,
          }
        : {}),
      ...(data.location_lng !== undefined
        ? {
            locationLng:
              data.location_lng != null ? String(data.location_lng) : null,
          }
        : {}),
      ...(data.location_maps_url !== undefined
        ? { locationMapsUrl: data.location_maps_url }
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
      location_name: vendors.locationName,
      location_address: vendors.locationAddress,
      location_lat: vendors.locationLat,
      location_lng: vendors.locationLng,
      location_maps_url: vendors.locationMapsUrl,
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
          ...mapLocationFields(updated!),
        },
      },
      error: null,
    },
    200,
  );
});

/**
 * GET /v1/vendors/me/packages
 * Authenticated vendor: lists all packages (active and inactive).
 */
vendorsRouter.get("/me/packages", supabaseAuth(), async (c) => {
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

  const packages = await db
    .select({
      id: vendorPackages.id,
      name: vendorPackages.name,
      description: vendorPackages.description,
      price: vendorPackages.price,
      unit: vendorPackages.unit,
      min_quantity: vendorPackages.minQuantity,
      inclusions: vendorPackages.inclusions,
      metadata: vendorPackages.metadata,
      is_active: vendorPackages.isActive,
      created_at: vendorPackages.createdAt,
      updated_at: vendorPackages.updatedAt,
    })
    .from(vendorPackages)
    .where(eq(vendorPackages.vendorId, vendor.id))
    .orderBy(desc(vendorPackages.createdAt));

  return c.json(
    { data: { packages: packages.map(mapPackageRow) }, error: null },
    200,
  );
});

/**
 * POST /v1/vendors/me/packages
 * Authenticated vendor: creates a new package offering.
 */
vendorsRouter.post("/me/packages", supabaseAuth(), async (c) => {
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
  const parsed = createPackageSchema.safeParse(body);

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
  const packageId = ulid();
  const minQuantity = packageUnitAllowsMinQuantity(data.unit)
    ? (data.min_quantity ?? null)
    : null;

  const [created] = await db
    .insert(vendorPackages)
    .values({
      id: packageId,
      vendorId: vendor.id,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      unit: data.unit,
      minQuantity,
      inclusions: data.inclusions ?? [],
      metadata: data.metadata ?? {},
      isActive: data.is_active ?? true,
    })
    .returning({
      id: vendorPackages.id,
      name: vendorPackages.name,
      description: vendorPackages.description,
      price: vendorPackages.price,
      unit: vendorPackages.unit,
      min_quantity: vendorPackages.minQuantity,
      inclusions: vendorPackages.inclusions,
      metadata: vendorPackages.metadata,
      is_active: vendorPackages.isActive,
      created_at: vendorPackages.createdAt,
      updated_at: vendorPackages.updatedAt,
    });

  return c.json(
    { data: { package: mapPackageRow(created!) }, error: null },
    201,
  );
});

/**
 * PATCH /v1/vendors/me/packages/:id
 * Authenticated vendor: updates an existing package (including activate/deactivate).
 */
vendorsRouter.patch("/me/packages/:id", supabaseAuth(), async (c) => {
  const userId = c.get("user").id;
  const packageId = c.req.param("id");
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
    .select({
      id: vendorPackages.id,
      unit: vendorPackages.unit,
      minQuantity: vendorPackages.minQuantity,
    })
    .from(vendorPackages)
    .where(
      and(
        eq(vendorPackages.id, packageId),
        eq(vendorPackages.vendorId, vendor.id),
      ),
    )
    .limit(1);

  if (!existing) {
    return c.json(
      {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Package '${packageId}' was not found.`,
        },
      },
      404,
    );
  }

  const body = await c.req.json();
  const parsed = updatePackageSchema.safeParse(body);

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

  const nextUnit = data.unit ?? existing.unit;
  let nextMinQuantity =
    data.min_quantity !== undefined
      ? data.min_quantity
      : existing.minQuantity;
  if (!packageUnitAllowsMinQuantity(nextUnit)) {
    nextMinQuantity = null;
  }

  const [updated] = await db
    .update(vendorPackages)
    .set({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.unit !== undefined ? { unit: data.unit } : {}),
      minQuantity: nextMinQuantity,
      ...(data.inclusions !== undefined ? { inclusions: data.inclusions } : {}),
      ...(data.metadata !== undefined
        ? { metadata: data.metadata ?? {} }
        : {}),
      ...(data.is_active !== undefined ? { isActive: data.is_active } : {}),
    })
    .where(
      and(
        eq(vendorPackages.id, packageId),
        eq(vendorPackages.vendorId, vendor.id),
      ),
    )
    .returning({
      id: vendorPackages.id,
      name: vendorPackages.name,
      description: vendorPackages.description,
      price: vendorPackages.price,
      unit: vendorPackages.unit,
      min_quantity: vendorPackages.minQuantity,
      inclusions: vendorPackages.inclusions,
      metadata: vendorPackages.metadata,
      is_active: vendorPackages.isActive,
      created_at: vendorPackages.createdAt,
      updated_at: vendorPackages.updatedAt,
    });

  return c.json(
    { data: { package: mapPackageRow(updated!) }, error: null },
    200,
  );
});

/**
 * DELETE /v1/vendors/me/packages/:id
 * Authenticated vendor: soft-deletes a package (sets is_active = false).
 */
vendorsRouter.delete("/me/packages/:id", supabaseAuth(), async (c) => {
  const userId = c.get("user").id;
  const packageId = c.req.param("id");
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
    .select({ id: vendorPackages.id })
    .from(vendorPackages)
    .where(
      and(
        eq(vendorPackages.id, packageId),
        eq(vendorPackages.vendorId, vendor.id),
      ),
    )
    .limit(1);

  if (!existing) {
    return c.json(
      {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: `Package '${packageId}' was not found.`,
        },
      },
      404,
    );
  }

  await db
    .update(vendorPackages)
    .set({ isActive: false })
    .where(
      and(
        eq(vendorPackages.id, packageId),
        eq(vendorPackages.vendorId, vendor.id),
      ),
    );

  return c.json({ data: { id: packageId }, error: null }, 200);
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
 * Public profile for a discoverable vendor (checklist-complete or approved).
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
      location_name: vendors.locationName,
      location_address: vendors.locationAddress,
      location_lat: vendors.locationLat,
      location_lng: vendors.locationLng,
      location_maps_url: vendors.locationMapsUrl,
      avg_rating: vendors.avgRating,
      rating_count: vendors.ratingCount,
      booking_count: vendors.bookingCount,
      response_time_hours: vendors.responseTimeHours,
      verification_status: vendors.verificationStatus,
    })
    .from(vendors)
    .where(
      and(
        or(eq(vendors.id, idOrSlug), eq(vendors.slug, idOrSlug)),
        vendorDiscoverableWhere(),
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

  const [packages, media] = await Promise.all([
    db
      .select({
        id: vendorPackages.id,
        name: vendorPackages.name,
        description: vendorPackages.description,
        price: vendorPackages.price,
        unit: vendorPackages.unit,
        min_quantity: vendorPackages.minQuantity,
        inclusions: vendorPackages.inclusions,
      })
      .from(vendorPackages)
      .where(
        and(
          eq(vendorPackages.vendorId, vendor.id),
          eq(vendorPackages.isActive, true),
        ),
      )
      .orderBy(desc(vendorPackages.createdAt)),
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
    ...mapLocationFields(vendor),
    avg_rating: vendor.avg_rating,
    rating_count: vendor.rating_count,
    booking_count: vendor.booking_count,
    response_time_hours:
      vendor.response_time_hours != null
        ? Number(vendor.response_time_hours)
        : null,
    is_verified: isKritvaVerified(vendor.verification_status),
    is_mock: isMockVendor(vendor.slug),
    packages: packages.map((p) => mapPackageRow(p)),
    media: media.map((m) => mapMediaRow(m)),
  };

  return c.json({ data: { vendor: payload }, error: null }, 200);
});

export { vendorsRouter };
