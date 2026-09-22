import { z } from 'zod';
import { KitSchema } from './kit.schema';

export const BatchCaseInputSchema = z.object({
  id: z.string(),
  jd: z.string().min(10, 'Job description must be provided'),
  company_url: z.string().url('Must be a valid URL'),
  days: z.number().int().min(1).max(60),
});

export const BatchErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const BatchKitResultOkSchema = z.object({
  id: z.string(),
  status: z.literal('ok'),
  kit: KitSchema,
  error: z.null(),
});

export const BatchKitResultFailedSchema = z.object({
  id: z.string(),
  status: z.literal('failed'),
  kit: z.null(),
  error: BatchErrorSchema,
});

export const BatchKitResultSchema = z.discriminatedUnion('status', [
  BatchKitResultOkSchema,
  BatchKitResultFailedSchema,
]);

export const BatchOutputEnvelopeSchema = z.object({
  version: z.string(),
  generated_at: z.string(),
  kits: z.array(BatchKitResultSchema),
});

export type BatchCaseInput = z.infer<typeof BatchCaseInputSchema>;
export type BatchError = z.infer<typeof BatchErrorSchema>;
export type BatchKitResult = z.infer<typeof BatchKitResultSchema>;
export type BatchOutputEnvelope = z.infer<typeof BatchOutputEnvelopeSchema>;
