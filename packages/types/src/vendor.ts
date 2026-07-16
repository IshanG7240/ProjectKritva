import { z } from "zod";
import {
  vendorCategorySchema,
  packageUnitSchema,
  packageUnitAllowsMinQuantity,
  documentTypeSchema,
  mediaTypeSchema,
  mediaSectionSchema,
  verificationStatusSchema,
} from "./enums";
import { ulidSchema, paisaSchema } from "./api";

// ==========================================
// 1. Vendor Profile Schemas
// ==========================================
const locationLatSchema = z
  .number()
  .min(-90, "Latitude must be between -90 and 90")
  .max(90, "Latitude must be between -90 and 90");

const locationLngSchema = z
  .number()
  .min(-180, "Longitude must be between -180 and 180")
  .max(180, "Longitude must be between -180 and 180");

export const vendorLocationFieldsSchema = z.object({
  location_name: z
    .string()
    .max(200, "Location name cannot exceed 200 characters")
    .nullable()
    .optional(),
  location_address: z
    .string()
    .max(500, "Location address cannot exceed 500 characters")
    .nullable()
    .optional(),
  location_lat: locationLatSchema.nullable().optional(),
  location_lng: locationLngSchema.nullable().optional(),
  location_maps_url: z
    .string()
    .url("Invalid Google Maps URL")
    .max(2000, "Maps URL cannot exceed 2000 characters")
    .nullable()
    .optional(),
});

function refineVendorLocationCoords<
  T extends {
    location_lat?: number | null;
    location_lng?: number | null;
  },
>(data: T): boolean {
  const hasLat = data.location_lat !== undefined && data.location_lat !== null;
  const hasLng = data.location_lng !== undefined && data.location_lng !== null;
  return hasLat === hasLng;
}

const vendorProfileFieldsSchema = z.object({
  business_name: z
    .string()
    .min(1, "Business name is required")
    .max(200, "Business name cannot exceed 200 characters"),
  category: z
    .array(vendorCategorySchema)
    .min(1, "At least one category is required"),
  city_id: z.string().max(50).optional().default("delhi-ncr"),
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),
  years_in_business: z.number().int().nonnegative().nullable().optional(),
  profile_photo_url: z.string().url("Invalid URL format").nullable().optional(),
  ...vendorLocationFieldsSchema.shape,
});

export const createVendorSchema = vendorProfileFieldsSchema.refine(
  refineVendorLocationCoords,
  {
    message: "location_lat and location_lng must both be set or both be null",
    path: ["location_lat"],
  },
);
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = vendorProfileFieldsSchema.partial().refine(
  refineVendorLocationCoords,
  {
    message: "location_lat and location_lng must both be set or both be null",
    path: ["location_lat"],
  },
);
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

// ==========================================
// 2. Vendor Package CRUD Schemas
// ==========================================
const packageNameSchema = z
  .string()
  .min(1, "Package name is required")
  .max(200, "Package name cannot exceed 200 characters");

const packageDescriptionSchema = z
  .string()
  .max(1000, "Description cannot exceed 1000 characters");

const packageInclusionSchema = z
  .string()
  .min(1, "Inclusion cannot be empty")
  .max(200, "Inclusion cannot exceed 200 characters");

const packageInclusionsSchema = z
  .array(packageInclusionSchema)
  .max(20, "At most 20 inclusions are allowed");

const packageMinQuantitySchema = z
  .number()
  .int("Minimum quantity must be an integer")
  .positive("Minimum quantity must be at least 1");

function refinePackageMinQuantity<
  T extends { unit?: z.infer<typeof packageUnitSchema>; min_quantity?: number | null },
>(data: T): boolean {
  if (data.min_quantity == null) return true;
  if (data.unit === undefined) return true;
  return packageUnitAllowsMinQuantity(data.unit);
}

export const createPackageSchema = z
  .object({
    name: packageNameSchema,
    description: packageDescriptionSchema.optional().nullable(),
    price: paisaSchema,
    unit: packageUnitSchema.optional().default("flat"),
    min_quantity: packageMinQuantitySchema.optional().nullable(),
    inclusions: packageInclusionsSchema.optional().default([]),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
    is_active: z.boolean().optional().default(true),
  })
  .refine(refinePackageMinQuantity, {
    message: "min_quantity is only allowed for per_plate and per_person units",
    path: ["min_quantity"],
  });
export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const updatePackageSchema = z
  .object({
    name: packageNameSchema.optional(),
    description: packageDescriptionSchema.optional().nullable(),
    price: paisaSchema.optional(),
    unit: packageUnitSchema.optional(),
    min_quantity: packageMinQuantitySchema.optional().nullable(),
    inclusions: packageInclusionsSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
    is_active: z.boolean().optional(),
  })
  .refine(refinePackageMinQuantity, {
    message: "min_quantity is only allowed for per_plate and per_person units",
    path: ["min_quantity"],
  });
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

/** Public (buyer) package payload — active packages only. */
export const publicVendorPackageSchema = z.object({
  id: ulidSchema,
  name: z.string(),
  description: z.string().nullable(),
  price: paisaSchema,
  unit: packageUnitSchema,
  min_quantity: z.number().int().positive().nullable(),
  inclusions: z.array(z.string()),
});
export type PublicVendorPackage = z.infer<typeof publicVendorPackageSchema>;

/** Owner package payload — includes inactive rows and timestamps. */
export const ownerVendorPackageSchema = publicVendorPackageSchema.extend({
  is_active: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type OwnerVendorPackage = z.infer<typeof ownerVendorPackageSchema>;

// ==========================================
// 3. Vendor Media Schemas
// ==========================================
export const createMediaSchema = z.object({
  url: z.string().url("Invalid URL format"),
  thumbnail_url: z.string().url("Invalid URL format").nullish(),
  detail_url: z.string().url("Invalid URL format").nullish(),
  type: mediaTypeSchema.optional().default("image"),
  section: mediaSectionSchema.optional().default("portfolio"),
  position: z.number().int().nonnegative().optional().default(0),
  alt_text: z.string().max(255).nullish(),
});
export type CreateMediaInput = z.infer<typeof createMediaSchema>;

export const reorderMediaSchema = z.object({
  media: z
    .array(
      z.object({
        id: ulidSchema,
        position: z.number().int().nonnegative(),
      })
    )
    .min(1, "At least one media item must be specified"),
});
export type ReorderMediaInput = z.infer<typeof reorderMediaSchema>;

// ==========================================
// 4. Vendor KYC Document Schemas
// ==========================================
export const createDocumentSchema = z.object({
  type: documentTypeSchema,
  url: z.string().url("Invalid URL format"),
  file_name: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name cannot exceed 255 characters"),
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// ==========================================
// 5. Vendor Availability Schemas
// ==========================================
export const availabilityItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  is_available: z.boolean(),
});

export const updateAvailabilitySchema = z.object({
  dates: z.array(availabilityItemSchema).min(1, "At least one date is required"),
});
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

// ==========================================
// 6. Vendor Directory (public list)
// ==========================================
export const vendorListItemSchema = z.object({
  id: ulidSchema,
  business_name: z.string(),
  slug: z.string(),
  category: z.array(vendorCategorySchema),
  city_id: z.string(),
  avg_rating: z.union([z.string(), z.number()]).nullable(),
  rating_count: z.number().int().nonnegative(),
  booking_count: z.number().int().nonnegative(),
  /** Lowest active package price in paisa; null when none. */
  price_min: paisaSchema.nullable(),
  /** Highest active package price in paisa; equals price_min when single or mixed-unit. */
  price_max: paisaSchema.nullable(),
  /** Display unit: shared unit, or unit of the cheapest package when mixed. */
  unit: packageUnitSchema.nullable(),
  /** True when active packages use more than one unit (UI shows starting-at, not a range). */
  units_mixed: z.boolean(),
  profile_photo_url: z.string().nullable(),
  /** First banner/gallery photo, ordered by position; null when vendor has none uploaded. */
  cover_image: z.string().nullable(),
  /** True when admin-approved; checklist-complete listings may appear without this. */
  is_verified: z.boolean(),
  /** True for seeded marketplace demo profiles. */
  is_mock: z.boolean(),
});
export type VendorListItem = z.infer<typeof vendorListItemSchema>;

export const vendorListQuerySchema = z
  .object({
    category: vendorCategorySchema.optional(),
    city_id: z.string().max(50).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    price_min: z.coerce.number().int().nonnegative().optional(),
    price_max: z.coerce.number().int().nonnegative().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    offset: z.coerce.number().int().nonnegative().default(0),
  })
  .refine(
    (data) => {
      if (data.price_min !== undefined && data.price_max !== undefined) {
        return data.price_max >= data.price_min;
      }
      return true;
    },
    {
      message: "price_max must be greater than or equal to price_min",
      path: ["price_max"],
    }
  );
export type VendorListQuery = z.infer<typeof vendorListQuerySchema>;

// ==========================================
// 7. Vendor go-live readiness (submit for review)
// ==========================================
export const vendorReadinessChecksSchema = z.object({
  category: z.boolean(),
  packages: z.boolean(),
  portfolio: z.boolean(),
  profile_photo: z.boolean(),
});
export type VendorReadinessChecks = z.infer<typeof vendorReadinessChecksSchema>;

export const vendorReadinessResponseSchema = z.object({
  complete: z.boolean(),
  checks: vendorReadinessChecksSchema,
  missing: z.array(z.string()),
});
export type VendorReadinessResponse = z.infer<typeof vendorReadinessResponseSchema>;

export const submitVendorForReviewSchema = z.object({});
export type SubmitVendorForReviewInput = z.infer<typeof submitVendorForReviewSchema>;

export const submitVendorForReviewResultSchema = z.object({
  id: ulidSchema,
  verification_status: verificationStatusSchema,
  submitted_at: z.string().datetime(),
});
export type SubmitVendorForReviewResult = z.infer<
  typeof submitVendorForReviewResultSchema
>;
