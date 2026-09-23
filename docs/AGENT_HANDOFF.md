# Agent Handoff Briefing — Rehearsa

> **To the Incoming Coding Agent**: Read this document first, along with [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md) and [`PROJECT_CONTEXT.md`](file:///d:/Assignemt/Rehearsa/PROJECT_CONTEXT.md), before modifying any code.

---

## 1. Project Identity & Assessment Reference

* **Project**: Rehearsa — Full-Stack AI-Powered Interview Preparation Platform
* **Assessment ID**: `FS-AI-INTERVIEW-01` (Trao Assessment)
* **Active Milestone**: `Milestone 7B.1 — Section Regeneration Contract Design` (Completed, NOT yet committed)

---

## 2. Latest Known Repository State

* **Branch**: `main`
* **Latest Committed Baseline**: `21731a8` (`feat(web): implement manual kit editing for questions and flashcards`)
* **Working Tree**: Uncommitted documentation changes only (no code changes):
  - Modified: `docs/DECISIONS.md` — ADR-007 revised to Accepted; ADR-008 (Section Regeneration API Contract) added
  - Modified: `docs/PROGRESS.md` — Milestone 7B.1 design recorded; next steps updated
  - Modified: `docs/AGENT_HANDOFF.md` — updated to reflect 7B.1 completion and 7B.2 as next task
* **Workspace Structure**:
  - `packages/shared`: Zod schemas, types, coverageChecker.ts, scheduleAllocator.ts, kitValidator.ts, full test suite.
  - `apps/api/src/modules/research/`: SSRF-safe fetcher, HTML cleaner, robots parser, multi-page crawler.
  - `apps/api/src/modules/llm/`: ILlmProvider interface, GeminiProvider, MockLlmProvider, llmFactory.
  - `apps/api/src/modules/interview-prep/`: pipelineOrchestrator.ts (11-step pipeline), integration tests.
  - `apps/api/src/routes/interviewPrep.routes.ts`: POST /api/interview-prep/generate.
  - `scripts/evaluator.ts`: Headless batch evaluator with Appendix B envelope output.
  - `apps/web/src/lib/kitEditing.ts`: NEW - pure immutable editing functions for questions & flashcards.
  - `apps/web/src/tests/kitEditing.test.ts`: NEW - 9 unit tests for editing library.
  - `apps/web`: Next.js 14 App Router interface with full kit generator, progress tracker, interactive flashcard deck with edit/add/delete, question bank with edit/add/delete, company brief, role breakdown, and schedule timeline views.
  - `docs/`: Complete 7-document permanent project memory.

---

## 3. Verification Evidence

1. `npx vitest run` (from repo root): Exit Code 0. **63/63 tests passing** across 13 test files.
2. `npm run build`: Exit Code 0. All three workspaces compile with zero TypeScript errors.
3. `npm run lint`: Exit Code 0. All workspaces lint cleanly.
4. `npm run evaluate`: Exit Code 0. Full batch benchmark execution verified.
5. Milestone 7B.1 is design-only — no code was changed.

---

## 4. Important Invariants & Constraints to Uphold

1. **Exact Appendix A Schema**: Do not rename, remove, or alter field types in KitSchema.
2. **Deterministic vs. Probabilistic Separation**: Coverage checking and schedule allocation must be deterministic application code, not delegated to the LLM.
3. **Preservation of Manual Edits**: When regenerating sections (Milestone 7B), manually edited questions/flashcards must be preserved without loss.
4. **Security**: All URL crawling is protected via ssrfGuard.ts. Never commit API keys.
5. **Batch Evaluation Command**: npm run evaluate -- --input <cases.json> --output <kits.json>

---

## 5. Commands to Run Before Modifying Code

```
npx vitest run
npm run build
npm run lint
npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json
```

---

## 6. Exact Next Task / Milestone

**Milestone 7B.2 — Section Regeneration Implementation**

Implement the contract from ADR-008 in `docs/DECISIONS.md`. Exact implementation sequence:

1. **`packages/shared/src/schemas/input.schema.ts`**: Add `RegenerateSectionEnum` (`'questions' | 'flashcards'`) and `RegenerateKitSectionInputSchema` (`{ kit: KitSchema, section: RegenerateSectionEnum, preserved_ids: z.array(z.string()).default([]) }`).

2. **`apps/api/src/modules/interview-prep/sectionRegenerator.ts`** (new file): Implement the 7-step regeneration algorithm:
   - Step 1: Extract preserved items using the two-part predicate: `id ∈ preserved_ids` OR `id.startsWith('q_custom_') || id.startsWith('f_custom_')`.
   - Step 2: LLM call reusing the Pass 1 prompt pattern from `pipelineOrchestrator.ts`, with ID prefix `q_regen_<ts>_<rand>` / `f_regen_<ts>_<rand>`.
   - Step 3: Sanitize `requirement_ids` against `kit.role.requirements`.
   - Step 4: `merge = [...preserved, ...newItems]`
   - Step 5 (questions only): `checkRequirementCoverage` + Pass 2 if uncovered.
   - Step 6 (questions only): `allocateSchedule` to rebuild schedule from merged questions.
   - Step 7: `validateKit` — return `REGEN_VALIDATION_FAILED` if invalid.

3. **`apps/api/src/routes/interviewPrep.routes.ts`**: Add `POST /regenerate-section` route validating with `RegenerateKitSectionInputSchema`.

4. **`apps/web/src/lib/api.ts`**: Add `regenerateKitSection(payload)` helper function.

5. **`apps/web/src/app/page.tsx`**: Add `editedItemIds: Set<string>` state; intercept `onUpdateKit` calls from edits to populate it; pass `editedItemIds` and `onEditedIdsChange` to `KitViewer`.

6. **`apps/web/src/components/KitViewer.tsx`**: Add "Regenerate Section" buttons to Questions and Flashcards section headers; call `regenerateKitSection` with `Array.from(editedItemIds)` as `preserved_ids`; on success call `onUpdateKit(newKit)`.

7. **Tests**: Add unit tests for `sectionRegenerator.ts` (preserved items survive, new items have sanitized req IDs, schedule rebuilt, validation gate fires) and integration test for the new route.

8. **Validation**: `npx vitest run` (expect 70+ tests), `npm run build`, `npm run lint`.
