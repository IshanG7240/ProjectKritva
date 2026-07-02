import { z } from "zod";

// ==========================================
// Branded Types
// ==========================================
export const ulidSchema = z
  .string()
  .regex(/^[0-9A-HJKMNP-TV-Z]{26}$/i, "Invalid ULID")
  .brand<"ULID">();
export type ULID = z.infer<typeof ulidSchema>;

export const paisaSchema = z
  .number()
  .int("Paisa must be an integer")
  .nonnegative("Paisa must be non-negative")
  .brand<"Paisa">();
export type Paisa = z.infer<typeof paisaSchema>;

// ==========================================
// API Error Envelope
// ==========================================
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// ==========================================
// Pagination Metadata
// ==========================================
export const paginationMetaSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative().optional(),
  hasNextPage: z.boolean(),
  nextCursor: z.string().optional(),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

// ==========================================
// API Response Envelopes
// ==========================================
export const apiResponseSchema = z.object({
  data: z.any().nullable(),
  error: apiErrorSchema.nullable(),
  meta: z
    .object({
      pagination: paginationMetaSchema.optional(),
    })
    .optional(),
});

export type ApiResponse<T = unknown> = {
  data: T | null;
  error: ApiError | null;
  meta?: {
    pagination?: PaginationMeta;
  };
};

export const paginatedResponseSchema = z.object({
  data: z.array(z.any()),
  error: z.null(),
  meta: z.object({
    pagination: paginationMetaSchema,
  }),
});

export type PaginatedResponse<T = unknown> = {
  data: T[];
  error: null;
  meta: {
    pagination: PaginationMeta;
  };
};

// Helpers for compile-time / runtime route schemas
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema.nullable(),
    error: apiErrorSchema.nullable(),
    meta: z
      .object({
        pagination: paginationMetaSchema.optional(),
      })
      .optional(),
  });
}

export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    error: z.null(),
    meta: z.object({
      pagination: paginationMetaSchema,
    }),
  });
}
