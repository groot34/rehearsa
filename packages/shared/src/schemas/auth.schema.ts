import { z } from 'zod';

// ---------------------------------------------------------------------------
// Registration and login input schemas
// ---------------------------------------------------------------------------

export const RegisterInputSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address')
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address')
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

// ---------------------------------------------------------------------------
// Safe public user representation (never includes passwordHash)
// ---------------------------------------------------------------------------

export const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.string(), // ISO-8601
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

// ---------------------------------------------------------------------------
// JWT payload shape (what we sign and verify)
// ---------------------------------------------------------------------------

export const JwtPayloadSchema = z.object({
  sub: z.string(),   // MongoDB _id as string
  email: z.string(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
