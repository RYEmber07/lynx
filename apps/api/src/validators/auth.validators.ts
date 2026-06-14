import { z } from "zod";

// ---------------------------------------------------------------------------
// RegisterSchema
// ---------------------------------------------------------------------------

export const RegisterSchema = z.object({
  email: z
    .email("Must be a valid email address")
    .toLowerCase(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine(
      (val) => Buffer.byteLength(val, "utf8") <= 72,
      "Password is too long (must not exceed 72 bytes)",
    )
    .refine(
      (val) => /[A-Z]/.test(val),
      "Password must contain at least one uppercase letter",
    )
    .refine(
      (val) => /[0-9]/.test(val),
      "Password must contain at least one number",
    ),

  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters")
    .optional(),
});

// ---------------------------------------------------------------------------
// LoginSchema
// ---------------------------------------------------------------------------

export const LoginSchema = z.object({
  email: z
    .email("Must be a valid email address")
    .toLowerCase(),

  password: z.string().min(1, "Password is required"),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
