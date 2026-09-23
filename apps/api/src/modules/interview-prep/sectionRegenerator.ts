import { z } from 'zod';
import {
  Kit,
  Question,
  Flashcard,
  QuestionSchema,
  FlashcardSchema,
  RegenerateSection,
  checkRequirementCoverage,
  allocateSchedule,
  validateKit,
} from '@rehearsa/shared';
import { ILlmProvider, createLlmProvider } from '../llm';

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export interface SectionRegenerationResult {
  success: boolean;
  kit?: Kit;
  error?: {
    code: 'REGEN_INVALID_INPUT' | 'REGEN_LLM_FAILED' | 'REGEN_VALIDATION_FAILED';
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Internal LLM output schemas (same patterns as pipelineOrchestrator.ts)
// ---------------------------------------------------------------------------

const RegenQuestionsSchema = z.object({
  questions: z.array(QuestionSchema),
});

const RegenFlashcardsSchema = z.object({
  flashcards: z.array(FlashcardSchema),
});

// ---------------------------------------------------------------------------
// Preservation predicate helpers
// ---------------------------------------------------------------------------

/**
 * Builds the effective preserved ID set for a regeneration request.
 *
 * Two-part predicate (ADR-007 / ADR-008):
 *   1. Auto-preserved: any item whose ID starts with 'q_custom_' or 'f_custom_'
 *      (these were user-added via addQuestionToKit / addFlashcardToKit).
 *   2. Explicitly preserved: IDs supplied by the client in `preserved_ids`
 *      (these are in-place edited items that retained their original IDs).
 *
 * Trust boundary: the server cannot independently verify which submitted items
 * were actually edited by the user.  The client is authoritative.  We validate
 * that every explicitly supplied ID actually exists in the submitted kit before
 * treating it as preserved; unrecognised IDs are silently dropped.
 */
function buildPreservedSet(
  kitItems: Array<{ id: string }>,
  preserved_ids: string[]
): Set<string> {
  const existingIds = new Set(kitItems.map((item) => item.id));
  const preserved = new Set<string>();

  // 1. Auto-preserve by prefix
  for (const item of kitItems) {
    if (item.id.startsWith('q_custom_') || item.id.startsWith('f_custom_')) {
      preserved.add(item.id);
    }
  }

  // 2. Explicitly preserved — only if the ID actually exists in the submitted kit
  for (const id of preserved_ids) {
    if (existingIds.has(id)) {
      preserved.add(id);
    }
  }

  return preserved;
}

/**
 * Generates a unique regen ID prefix that cannot collide with preserved or
 * custom IDs.  Includes a random suffix for extra safety.
 */
function regenId(prefix: 'q_regen' | 'f_regen'): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${ts}_${rand}`;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export interface SectionRegeneratorInput {
  kit: Kit;
  section: RegenerateSection;
  preserved_ids: string[];
  provider?: ILlmProvider;
}

/**
 * Regenerates a single kit section (questions or flashcards) while preserving
 * manually edited and user-added items.
 *
 * The original kit is never mutated.  On any failure the caller receives a
 * structured error and retains their existing kit intact.
 */
export async function regenerateKitSection(
  input: SectionRegeneratorInput
): Promise<SectionRegenerationResult> {
  const { kit, section, preserved_ids } = input;
  const provider = input.provider ?? createLlmProvider();

  const validReqIds = new Set(kit.role.requirements.map((r) => r.id));

  /**
   * Sanitise requirement_ids on a new item: strip any IDs that do not exist
   * in role.requirements so referential integrity is guaranteed before merge.
   */
  const sanitizeReqIds = (ids: string[]): string[] =>
    ids.filter((id) => validReqIds.has(id));

  // -------------------------------------------------------------------------
  // Questions regeneration
  // -------------------------------------------------------------------------

  if (section === 'questions') {
    // Step 1 — extract preserved questions
    const preservedSet = buildPreservedSet(kit.questions, preserved_ids);
    const preservedQuestions = kit.questions.filter((q) => preservedSet.has(q.id));

    // Step 2 — LLM generation of replacement questions
    const pass1Prompt = [
      'Generate categorized interview questions (technical, behavioural, system-design,',
      'company-fit) for the following role requirements.\n',
      `Requirements:\n${JSON.stringify(kit.role.requirements, null, 2)}\n`,
      `Company context: ${kit.company_brief.summary}`,
    ].join(' ');

    const pass1Sys = `Generate questions into valid JSON with this exact schema:
{
  "questions": [
    {
      "id": "PLACEHOLDER_ID",
      "requirement_ids": ["r1"],
      "category": "technical" | "behavioural" | "system-design" | "company-fit",
      "prompt": "Interview question text",
      "answer_outline": "Key points to look for in the answer",
      "difficulty": 1 | 2 | 3
    }
  ]
}
Assign unique IDs using this exact prefix pattern: q_regen_<sequential_number> (e.g. q_regen_1, q_regen_2).
Every question MUST link to valid requirement IDs from the provided list.`;

    let newQuestions: Question[];
    try {
      const pass1Output = await provider.generateStructuredJson(
        pass1Prompt,
        pass1Sys,
        RegenQuestionsSchema,
      );
      const rawQuestions: Question[] = pass1Output.questions ?? [];

      // De-duplicate against preserved IDs and assign stable regen IDs
      const preservedIdSet = new Set(preservedQuestions.map((q) => q.id));
      const seenNewIds = new Set<string>();
      newQuestions = rawQuestions
        .filter((q) => {
          // Drop if the LLM reused a preserved ID
          if (preservedIdSet.has(q.id)) return false;
          // Drop duplicates within the new batch
          if (seenNewIds.has(q.id)) return false;
          seenNewIds.add(q.id);
          return true;
        })
        .map((q) => ({
          ...q,
          // Re-stamp with a guaranteed-unique regen ID so no collision is possible
          id: regenId('q_regen'),
          requirement_ids: sanitizeReqIds(q.requirement_ids),
        }));
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'REGEN_LLM_FAILED',
          message: `LLM failed to generate replacement questions: ${(err as Error).message ?? 'Unknown error'}`,
        },
      };
    }

    // Step 3 — merge: preserved first, then new
    let mergedQuestions: Question[] = [...preservedQuestions, ...newQuestions];

    // Step 4 — deterministic coverage check
    let coverageRes = checkRequirementCoverage(kit.role.requirements, mergedQuestions);

    // Step 5 — Pass 2: targeted generation for any still-uncovered requirements
    if (coverageRes.uncovered_requirement_ids.length > 0) {
      const uncoveredReqs = kit.role.requirements.filter((r) =>
        coverageRes.uncovered_requirement_ids.includes(r.id),
      );
      const pass2Prompt = [
        'The following role requirements have NO linked interview questions yet.\n',
        `Requirements:\n${JSON.stringify(uncoveredReqs, null, 2)}\n`,
        'Generate targeted questions covering these requirement IDs.',
      ].join('');
      const pass2Sys = `Generate questions into valid JSON with this exact schema:
{
  "questions": [
    {
      "id": "PLACEHOLDER_ID",
      "requirement_ids": ["r1"],
      "category": "technical" | "behavioural" | "system-design" | "company-fit",
      "prompt": "Interview question text",
      "answer_outline": "Key points to look for in the answer",
      "difficulty": 1 | 2 | 3
    }
  ]
}
Assign unique IDs using this exact prefix pattern: q_regen_p2_<sequential_number>.`;

      try {
        const pass2Output = await provider.generateStructuredJson(
          pass2Prompt,
          pass2Sys,
          RegenQuestionsSchema,
        );
        const existingQIds = new Set(mergedQuestions.map((q) => q.id));
        const pass2Questions: Question[] = (pass2Output.questions ?? [])
          .filter((q) => !existingQIds.has(q.id))
          .map((q) => ({
            ...q,
            id: regenId('q_regen'),
            requirement_ids: sanitizeReqIds(q.requirement_ids),
          }));
        mergedQuestions = [...mergedQuestions, ...pass2Questions];
      } catch {
        // Pass 2 failure is non-fatal: continue with whatever coverage we have
      }

      coverageRes = checkRequirementCoverage(kit.role.requirements, mergedQuestions);
    }

    // Step 6 — deterministic schedule rebuild from merged questions
    const newSchedule = allocateSchedule({
      days_available: kit.schedule.days_available,
      questions: mergedQuestions,
      role_title: kit.role.title,
    });

    // Step 7 — assemble candidate kit and validate against Appendix A
    const candidateKit: Kit = {
      ...kit,
      questions: mergedQuestions,
      schedule: newSchedule,
      coverage: {
        uncovered_requirement_ids: coverageRes.uncovered_requirement_ids,
        passes: kit.coverage.passes, // preserve original generation pass count
      },
    };

    const validation = validateKit(candidateKit);
    if (!validation.valid || !validation.kit) {
      return {
        success: false,
        error: {
          code: 'REGEN_VALIDATION_FAILED',
          message: 'Regenerated kit failed Appendix A schema validation.',
          details: validation.errors,
        },
      };
    }

    return { success: true, kit: validation.kit };
  }

  // -------------------------------------------------------------------------
  // Flashcards regeneration
  // -------------------------------------------------------------------------

  if (section === 'flashcards') {
    // Step 1 — extract preserved flashcards
    const preservedSet = buildPreservedSet(kit.flashcards, preserved_ids);
    const preservedFlashcards = kit.flashcards.filter((f) => preservedSet.has(f.id));

    // Step 2 — LLM generation of replacement flashcards
    const flashPrompt = [
      'Generate quick-recall flashcards for the following role requirements.\n',
      `Requirements:\n${JSON.stringify(kit.role.requirements, null, 2)}\n`,
      `Company context: ${kit.company_brief.summary}`,
    ].join(' ');

    const flashSys = `Generate flashcards into valid JSON with this exact schema:
{
  "flashcards": [
    {
      "id": "PLACEHOLDER_ID",
      "front": "Flashcard question or concept prompt",
      "back": "Concise concept explanation or answer",
      "requirement_ids": ["r1"]
    }
  ]
}
Assign unique IDs using this exact prefix pattern: f_regen_<sequential_number> (e.g. f_regen_1, f_regen_2).
Every flashcard MUST link to valid requirement IDs from the provided list.`;

    let newFlashcards: Flashcard[];
    try {
      const flashOutput = await provider.generateStructuredJson(
        flashPrompt,
        flashSys,
        RegenFlashcardsSchema,
      );
      const rawFlashcards: Flashcard[] = flashOutput.flashcards ?? [];

      const preservedIdSet = new Set(preservedFlashcards.map((f) => f.id));
      const seenNewIds = new Set<string>();
      newFlashcards = rawFlashcards
        .filter((f) => {
          if (preservedIdSet.has(f.id)) return false;
          if (seenNewIds.has(f.id)) return false;
          seenNewIds.add(f.id);
          return true;
        })
        .map((f) => ({
          ...f,
          id: regenId('f_regen'),
          requirement_ids: sanitizeReqIds(f.requirement_ids),
        }));
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'REGEN_LLM_FAILED',
          message: `LLM failed to generate replacement flashcards: ${(err as Error).message ?? 'Unknown error'}`,
        },
      };
    }

    // Step 3 — merge: preserved first, then new
    const mergedFlashcards: Flashcard[] = [...preservedFlashcards, ...newFlashcards];

    // Steps 4-6 skipped: flashcards do not affect coverage or schedule

    // Step 7 — assemble candidate kit and validate
    const candidateKit: Kit = {
      ...kit,
      flashcards: mergedFlashcards,
    };

    const validation = validateKit(candidateKit);
    if (!validation.valid || !validation.kit) {
      return {
        success: false,
        error: {
          code: 'REGEN_VALIDATION_FAILED',
          message: 'Regenerated kit failed Appendix A schema validation.',
          details: validation.errors,
        },
      };
    }

    return { success: true, kit: validation.kit };
  }

  // Should never reach here due to TypeScript exhaustiveness, but guard anyway
  return {
    success: false,
    error: {
      code: 'REGEN_INVALID_INPUT',
      message: `Unknown section: ${section as string}`,
    },
  };
}
