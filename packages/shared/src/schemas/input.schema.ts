import { z } from 'zod';
import { KitSchema } from './kit.schema';

export const CreateKitInputSchema = z.object({
  jobDescription: z.string().min(20, 'Job description must be at least 20 characters'),
  companyUrl: z
    .string()
    .url('A valid company URL is required')
    .refine((url) => /^https?:\/\//i.test(url), {
      message: 'Company URL must use http or https protocol',
    }),
  daysAvailable: z.number().int().min(1).max(60, 'Days available must be between 1 and 60'),
});

export type CreateKitInput = z.infer<typeof CreateKitInputSchema>;

/**
 * Enum of sections that can be independently regenerated.
 * Only 'questions' and 'flashcards' are supported:
 *   - 'company_brief' requires re-crawling the company URL (out of scope).
 *   - 'role' would invalidate all requirement IDs in existing items.
 *   - 'schedule' is always deterministically rebuilt after question regeneration.
 */
export const RegenerateSectionEnum = z.enum(['questions', 'flashcards']);
export type RegenerateSection = z.infer<typeof RegenerateSectionEnum>;

/**
 * Input schema for POST /api/interview-prep/regenerate-section.
 *
 * Trust boundary note: The server accepts the submitted kit at face value.
 * Without a persistence layer the server cannot independently verify which
 * items were edited by the user versus which were generated originally.
 * The client is solely responsible for accurately supplying `preserved_ids`.
 * The server validates that every ID in `preserved_ids` actually exists in
 * the submitted kit before treating it as preserved, silently dropping any
 * that do not match.
 */
export const RegenerateKitSectionInputSchema = z.object({
  /** Full current Appendix A kit (client-owned React state). */
  kit: KitSchema,
  /** Which section to regenerate. */
  section: RegenerateSectionEnum,
  /**
   * IDs of items the client explicitly wants preserved through regeneration.
   * Typically the IDs of questions/flashcards the user has edited in-place
   * (e.g. 'q1', 'f2') where the original LLM-generated ID was retained.
   * Items with IDs starting with 'q_custom_' or 'f_custom_' are always
   * preserved automatically regardless of this list.
   */
  preserved_ids: z.array(z.string()).default([]),
});
export type RegenerateKitSectionInput = z.infer<typeof RegenerateKitSectionInputSchema>;

// ---------------------------------------------------------------------------
// Kit persistence schemas (Milestone 9)
// ---------------------------------------------------------------------------

/**
 * Input schema for POST /api/kits — save a generated kit.
 * The kit payload must conform to Appendix A exactly.
 */
export const SaveKitInputSchema = z.object({
  kit: KitSchema,
});
export type SaveKitInput = z.infer<typeof SaveKitInputSchema>;

/**
 * Input schema for PUT /api/kits/:id — update a saved kit after editing.
 * Identical payload requirements to save.
 */
export const UpdateKitInputSchema = z.object({
  kit: KitSchema,
});
export type UpdateKitInput = z.infer<typeof UpdateKitInputSchema>;

/**
 * Lightweight summary returned in GET /api/kits list responses.
 * Does not include the full kit payload to keep the list response fast.
 */
export const KitSummarySchema = z.object({
  id: z.string(),
  role: z.string(),
  company: z.string(),
  daysAvailable: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type KitSummary = z.infer<typeof KitSummarySchema>;
