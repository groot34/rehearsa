# Project Progress & Status — Rehearsa

## 1. Current Milestone
**Milestone 7B.1 — Section Regeneration Contract Design (COMPLETED)**
- **Git Baseline**: Commit `21731a8` (`feat(web): implement manual kit editing for questions and flashcards`) on branch `main`.

---

## 2. Completed Work
- [x] **Milestone 1: Project Foundation & Engineering Setup**:
  - Monorepo workspace scaffolding (`apps/web`, `apps/api`, `packages/shared`), permanent project memory documentation.
- [x] **Milestone 2: Deterministic Core Engine**:
  - `packages/shared/src/algorithms/coverageChecker.ts`: Pure, deterministic requirement coverage checking via set difference.
  - `packages/shared/src/algorithms/scheduleAllocator.ts`: Deterministic study schedule allocation across 1–60 days with sequential day numbering, integer study minutes, and category focus labels.
  - `packages/shared/src/validation/kitValidator.ts`: Complete Appendix A kit structure, referential integrity, and coverage consistency validation.
- [x] **Milestone 3: Backend Research & AI Generation Pipeline**:
  - SSRF-safe multi-page company crawler, Gemini LLM provider, Mock provider, 11-step orchestrator, REST API `POST /api/interview-prep/generate`, and batch evaluator CLI (`npm run evaluate`).
- [x] **Milestone 4: Web Frontend Interface & Interactive Kit Builder**:
  - Next.js 14 App Router interface with full kit generator form, progress tracker, interactive flashcard deck, question bank, company brief, role breakdown, and schedule timeline views.
- [x] **Milestone 5: End-to-End Evaluation & Benchmarking (COMPLETED & VERIFIED)**:
  - **Synthetic Benchmark Suite (`scratch/synthetic-benchmark-cases.json`)**:
    - Created a comprehensive 8-case benchmark suite covering varied roles (Senior Backend, Staff Frontend, Principal DevOps, Senior ML, Full-Stack Lead), duration boundaries (`1` day min, `60` days max, `5`, `14`, `30` days intermediate), and invalid inputs (short JD, days > 60, malformed URL).
  - **Batch Evaluator CLI Enhancements (`scripts/evaluator.ts`)**:
    - Added high-resolution per-case latency tracking (`Date.now()`) and an end-of-batch summary breakdown (Total, Successful, Failed, Total Time).
    - Enforced strict HTTP/HTTPS protocol validation across `BatchCaseInputSchema`, `CreateKitInputSchema`, and `pipelineOrchestrator`.
  - **Appendix A & Appendix B Output Validation**:
    - Executed: `npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json`
    - Exit Code: `0`.
    - Total Runtime: `782ms` across 8 cases (5 successful kits, 3 isolated invalid failures).
    - Appendix B envelope validation: 100% compliant (`version`, `generated_at`, `kits`).
    - Appendix A kit validation: 100% compliant across all generated kits with referential integrity, matching day count (`days.length === days_available`), and integer study minutes.
  - **Edge Case & Failure Isolation Verification (`scripts/tests/evaluator.test.ts`)**:
    - Verified boundary schedules at 1 day and 60 days.
    - Verified per-case failure isolation (short JD, out-of-bounds days, malformed URL fail without crashing batch).
    - Verified graceful degradation and kit generation when company site is unreachable.
    - Verified CLI error exit code `1` on missing files or malformed JSON.
  - **Verification Evidence**:
    - `npx vitest run`: Exit Code `0`. **51/51 tests passing** across 12 test files.
    - `npm run build`: Exit Code `0`. All three workspaces compile cleanly.
    - `npm run lint`: Exit Code `0`. All workspaces lint cleanly.

---

## 3. Work in Progress
- [x] **Milestone 6: Live Gemini Integration & Resilience Hardening (VERIFIED)**:
  - Verified live Gemini 1.5 Flash pipeline with API key integration.
  - Implemented resilient JSON schema normalization in `geminiProvider.ts` to seamlessly handle LLM key aliases (`job_title`, `core_responsibilities`, etc.).
  - Added explicit JSON schemas to prompt instructions in `pipelineOrchestrator.ts` to prevent hallucinations and schema validation failures.
  - Hardened `safeFetcher.ts` and crawler to handle site unreachable gracefully with strict timeouts and abort controllers.
  - Verified live end-to-end kit generation via both direct API (port 4000) and Next.js frontend proxy (port 3000) with HTTP 200 OK.
  - Verified all 54 tests across 12 test suites passing cleanly.
- [x] **Milestone 7A: Manual Kit Editing (COMPLETED & VERIFIED, committed `21731a8`)**:
  - Created `apps/web/src/lib/kitEditing.ts`: Pure, immutable editing functions for `updateQuestionInKit`, `addQuestionToKit`, `deleteQuestionFromKit`, `updateFlashcardInKit`, `addFlashcardToKit`, `deleteFlashcardFromKit`. All validated against shared Zod schemas.
  - Updated `apps/web/src/components/QuestionBankCard.tsx`: Inline edit form, add-question form, delete-with-confirmation per question. Preserves category filter state.
  - Updated `apps/web/src/components/FlashcardDeck.tsx`: Inline edit form for current card, add-card form, delete guard (cannot delete last card). Keyboard nav disabled during editing.
  - Updated `apps/web/src/components/KitViewer.tsx`: All six editing handlers wired, calls `onUpdateKit` to propagate changes up to `page.tsx`.
  - Updated `apps/web/src/app/page.tsx`: `onUpdateKit={setGeneratedKit}` wires parent state mutation correctly.
  - Created `apps/web/src/tests/kitEditing.test.ts`: 9 unit tests covering update/add/delete for both questions and flashcards, referential integrity rejection, schedule cleanup on question delete, coverage recalculation, and category filter preservation.
  - **Test result**: `npx vitest run` → Exit Code `0`. **63/63 tests passing** across 13 test files.
- [x] **Milestone 7B.1: Section Regeneration Contract Design (COMPLETED, not yet committed)**:
  - Designed the complete regeneration contract in `docs/DECISIONS.md` as ADR-007 (revised) and ADR-008 (new).
  - Defined two regenerable sections: `questions` and `flashcards`. `company_brief`, `role`, and `schedule` are not independently regenerable.
  - Defined preservation predicate: auto-preserve items matching `/^(q_custom_|f_custom_)/` ID prefix PLUS explicit `preserved_ids: string[]` from client for in-place edited items.
  - Defined stateless API contract: `POST /api/interview-prep/regenerate-section` accepting `{ kit: Kit, section, preserved_ids }`, returning full updated `Kit` on success or structured error on failure.
  - Defined 7-step server-side merge algorithm reusing existing `pipelineOrchestrator` LLM patterns, `checkRequirementCoverage`, `allocateSchedule`, and `validateKit`.
  - Defined `RegenerateKitSectionInputSchema` to add to `packages/shared/src/schemas/input.schema.ts`.
  - Defined `editedItemIds: Set<string>` client-side tracking in `page.tsx` (separate from `Kit` state).
  - Confirmed no changes to `KitSchema`, batch evaluator, or Appendix A/B compliance.
  - **No code changed** (design-only milestone).

---

## 3. Work Not Yet Started
- Milestone 7B.2 implementation (see Section 7 — Next Recommended Task).

---

## 4. Outstanding Tasks (Next Milestones)
- **Milestone 7B**: Section-Level Content Regeneration — backend endpoint to regenerate individual kit sections (question bank, flashcards) without rebuilding the entire kit, while preserving manually edited items.
- Final User Review & Project Audit.

---

## 5. Known Bugs / Issues
* None. All 63 tests pass; live Gemini generation verified; full monorepo build succeeds; lint succeeds.

---

## 6. Blockers
* None. Contract design complete. Ready for implementation.

---

## 7. Next Recommended Task
**Milestone 7B.2 — Section Regeneration Implementation**

Implement the contract defined in ADR-008 (`docs/DECISIONS.md`). Sequence:

1. Add `RegenerateKitSectionInputSchema` and `RegenerateSectionEnum` to `packages/shared/src/schemas/input.schema.ts`.
2. Implement `apps/api/src/modules/interview-prep/sectionRegenerator.ts` — the 7-step server-side algorithm.
3. Add `POST /api/interview-prep/regenerate-section` route to `apps/api/src/routes/interviewPrep.routes.ts`.
4. Add `regenerateKitSection()` API helper to `apps/web/src/lib/api.ts`.
5. Add `editedItemIds` state tracking to `apps/web/src/app/page.tsx` and wire `onEditedIdsChange` prop down to `KitViewer`.
6. Add "Regenerate Section" buttons to `KitViewer.tsx` for Questions and Flashcards sections.
7. Write unit tests for `sectionRegenerator.ts` and the new route.
8. Run full validation suite (63+ tests, lint, build).
