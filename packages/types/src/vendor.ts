import { z } from "zod";
import { vendorCategorySchema, serviceUnitSchema, documentTypeSchema, mediaTypeSchema } from "./enums.js";
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
  years_in_business: z.number().int().nonnegative().optional(),
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
  thumbnail_url: z.string().url("Invalid URL format").optional(),
  detail_url: z.string().url("Invalid URL format").optional(),
  type: mediaTypeSchema.optional().default("image"),
  position: z.number().int().nonnegative().optional().default(0),
  alt_text: z.string().max(255).optional(),
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
