import { z } from "zod";

// ---------------------------------------------------------------------------
// CreateUrlSchema
// ---------------------------------------------------------------------------

export const CreateUrlSchema = z
  .object({
    originalUrl: z
      .url("Must be a valid URL")
      .max(2048, "URL must not exceed 2048 characters"),

    customSlug: z
      .string()
      .min(3, "Custom slug must be at least 3 characters")
      .max(50, "Custom slug must not exceed 50 characters")
      .regex(
        /^[a-zA-Z0-9-_]+$/,
        "Custom slug may only contain letters, numbers, hyphens, and underscores",
      )
      .nullable()
      .optional(),

    expiresAt: z.iso
      .datetime({ message: "Must be a valid ISO datetime string" })
      .refine(
        (val) => new Date(val) > new Date(),
        "Expiry date must be in the future",
      )
      .nullable()
      .optional(),

    isPasswordProtected: z.boolean().default(false),

    password: z
      .string()
      .min(4, "Password must be at least 4 characters")
      .refine(
        (val) => Buffer.byteLength(val, "utf8") <= 72,
        "Password is too long (must not exceed 72 bytes)",
      )
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.isPasswordProtected && !data.password) return false;
      return true;
    },
    {
      message: "Password is required when isPasswordProtected is true",
      path: ["password"],
    },
  );

// ---------------------------------------------------------------------------
// UpdateUrlSchema
// ---------------------------------------------------------------------------

export const UpdateUrlSchema = z
  .object({
    originalUrl: z
      .url("Must be a valid URL")
      .max(2048, "URL must not exceed 2048 characters")
      .optional(),

    customSlug: z
      .string()
      .min(3, "Custom slug must be at least 3 characters")
      .max(50, "Custom slug must not exceed 50 characters")
      .regex(
        /^[a-zA-Z0-9-_]+$/,
        "Custom slug may only contain letters, numbers, hyphens, and underscores",
      )
      .nullable()
      .optional(),

    expiresAt: z.iso
      .datetime({ message: "Must be a valid ISO datetime string" })
      .refine(
        (val) => new Date(val) > new Date(),
        "Expiry date must be in the future",
      )
      .nullable()
      .optional(),

    isPasswordProtected: z.boolean().optional(),

    password: z
      .string()
      .min(4, "Password must be at least 4 characters")
      .refine(
        (val) => Buffer.byteLength(val, "utf8") <= 72,
        "Password is too long (must not exceed 72 bytes)",
      )
      .optional(),

    isActive: z.boolean().optional(),
  });

// ---------------------------------------------------------------------------
// AnalyticsQuerySchema
// ---------------------------------------------------------------------------

export const AnalyticsQuerySchema = z.object({
  days: z.coerce
    .number()
    .refine((val): val is 7 | 30 | 90 => [7, 30, 90].includes(val), {
      message: "days must be 7, 30, or 90",
    })
    .default(30),

  limit: z.coerce
    .number()
    .min(1, "limit must be at least 1")
    .max(50, "limit must not exceed 50")
    .default(10),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CreateUrlInput = z.infer<typeof CreateUrlSchema>;
export type UpdateUrlInput = z.infer<typeof UpdateUrlSchema>;
export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;
