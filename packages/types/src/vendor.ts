import { z } from "zod";
import {
  vendorCategorySchema,
  serviceUnitSchema,
  documentTypeSchema,
  mediaTypeSchema,
  mediaSectionSchema,
} from "./enums.js";
import { ulidSchema, paisaSchema } from "./api.js";

// ==========================================
// 1. Vendor Profile Schemas
// ==========================================
export const createVendorSchema = z.object({
  business_name: z
    .string()
    .min(1, "Business name is required")
    .max(200, "Business name cannot exceed 200 characters"),
  category: z
    .array(vendorCategorySchema)
    .min(1, "At least one category is required"),
  city_id: z.string().max(50).optional().default("delhi-ncr"),
  description: z.string().max(2000, "Description cannot exceed 2000 characters").optional(),
  years_in_business: z.number().int().nonnegative().nullable().optional(),
  profile_photo_url: z.string().url("Invalid URL format").nullable().optional(),
});
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = createVendorSchema.partial();
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

// ==========================================
// 2. Vendor Service CRUD Schemas
// ==========================================
export const createServiceSchema = z
  .object({
    name: z
      .string()
      .min(1, "Service name is required")
      .max(200, "Service name cannot exceed 200 characters"),
    description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
    price_min: paisaSchema,
    price_max: paisaSchema,
    unit: serviceUnitSchema.optional().default("per_event"),
    is_active: z.boolean().optional().default(true),
  })
  .refine((data) => data.price_max >= data.price_min, {
    message: "price_max must be greater than or equal to price_min",
    path: ["price_max"],
  });
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z
  .object({
    name: z
      .string()
      .min(1, "Service name is required")
      .max(200, "Service name cannot exceed 200 characters")
      .optional(),
    description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
    price_min: paisaSchema.optional(),
    price_max: paisaSchema.optional(),
    unit: serviceUnitSchema.optional(),
    is_active: z.boolean().optional(),
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
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

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
  price_min: paisaSchema.nullable(),
  price_max: paisaSchema.nullable(),
  unit: serviceUnitSchema.nullable(),
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
