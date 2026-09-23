# Project Progress & Status — Rehearsa

## 1. Current Milestone
**Milestone 7B.2 — Section Regeneration Implementation (COMPLETED, not yet committed)**
- **Git Baseline**: Commit `5bd067a` (`docs(design): add ADR-008 section regeneration contract for Milestone 7B`) on branch `main`.

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
- [x] **Milestone 7B.1: Section Regeneration Contract Design (COMPLETED, committed `5bd067a`)**:
  - Designed the complete regeneration contract in `docs/DECISIONS.md` as ADR-007 (revised) and ADR-008 (new).
  - Defined two regenerable sections: `questions` and `flashcards`. `company_brief`, `role`, and `schedule` are not independently regenerable.
  - Defined preservation predicate: auto-preserve items matching `/^(q_custom_|f_custom_)/` ID prefix PLUS explicit `preserved_ids: string[]` from client for in-place edited items.
  - Defined stateless API contract: `POST /api/interview-prep/regenerate-section` accepting `{ kit: Kit, section, preserved_ids }`, returning full updated `Kit` on success or structured error on failure.
  - Defined 7-step server-side merge algorithm reusing existing `pipelineOrchestrator` LLM patterns, `checkRequirementCoverage`, `allocateSchedule`, and `validateKit`.
  - Defined `RegenerateKitSectionInputSchema` to add to `packages/shared/src/schemas/input.schema.ts`.
  - Defined `editedItemIds: Set<string>` client-side tracking in `page.tsx` (separate from `Kit` state).
  - Confirmed no changes to `KitSchema`, batch evaluator, or Appendix A/B compliance.
  - **No code changed** (design-only milestone).
- [x] **Milestone 7B.2: Section Regeneration Implementation (COMPLETED, not yet committed)**:
  - **`packages/shared/src/schemas/input.schema.ts`**: Added `RegenerateSectionEnum` (`'questions' | 'flashcards'`) and `RegenerateKitSectionInputSchema` (`{ kit: KitSchema, section, preserved_ids }`). Documented trust boundary in JSDoc comment.
  - **`apps/api/src/modules/interview-prep/sectionRegenerator.ts`** (new file): Full 7-step regeneration algorithm. `buildPreservedSet()` implements the two-part predicate (auto-prefix + explicit list, with server-side validation that each explicit ID exists in the submitted kit). Regen IDs stamped with `q_regen_*/f_regen_*` prefix to prevent collisions. Questions path: LLM pass 1 → sanitize req IDs → merge → coverage check → optional pass 2 → schedule rebuild → `validateKit` gate. Flashcards path: LLM → sanitize → merge → `validateKit` gate. Any failure returns structured `REGEN_LLM_FAILED` or `REGEN_VALIDATION_FAILED`; original kit never returned.
  - **`apps/api/src/modules/interview-prep/index.ts`**: Added `export * from './sectionRegenerator'`.
  - **`apps/api/src/routes/interviewPrep.routes.ts`**: Added `POST /regenerate-section` route with `RegenerateKitSectionInputSchema` validation, returning `{ success: true, kit }` or `{ success: false, error }`.
  - **`apps/web/src/lib/api.ts`**: Added `regenerateKitSection()` helper, `RegenerateKitSectionPayload` and `ApiRegenerateResponse` types.
  - **`apps/web/src/app/page.tsx`**: Added `editedItemIds: Set<string>` state; `handleItemEdited` (adds ID, skips `q_custom_*/f_custom_*`); `handleItemDeleted` (removes ID from preserved set); `handleRegenerateSection` with stale-response guard (request-ID counter); all wired to `KitViewer` as `onItemEdited`, `onItemDeleted`, `onRegenerateSection`.
  - **`apps/web/src/components/KitViewer.tsx`**: Added `onItemEdited`, `onItemDeleted`, `onRegenerateSection` props; per-section `regenLoading`/`regenError` state; `RegenButton` and `RegenErrorBanner` inline components; edit handlers now call `onItemEdited`/`onItemDeleted`; regen buttons shown above QuestionBankCard and FlashcardDeck.
  - **`apps/api/src/modules/interview-prep/tests/sectionRegenerator.test.ts`** (new): 18 unit tests (added cross-section isolation and sanitization regression tests vs original 15).
  - **`apps/api/src/routes/tests/regenerateSectionRoutes.test.ts`** (new): 8 route integration tests covering input validation (empty body, invalid section, incomplete kit), successful regen for both sections, preserved_id wiring, error response has no kit, non-existent preserved_ids silently dropped.
  - **Post-review fixes**: (1) stale-response guard replaced with `useRef`-based counter (was broken `useState` counter); (2) `RegenerateSection` type now imported from `@rehearsa/shared` instead of duplicated in `api.ts`; (3) 3 regression tests added.
  - **Test result**: `npx vitest run` → Exit Code `0`. **89/89 tests passing** across 15 test files.
  - **Build**: `npm run build` → Exit Code `0`. All three workspaces compile cleanly.
  - **Lint**: `npm run lint` → Exit Code `0`.
  - **Benchmark**: `npm run evaluate` → Exit Code `0`. 5/8 cases OK, 3 invalid rejected, 343ms total.
  - **Changes NOT committed** (awaiting user instruction).

---

## 3. Work Not Yet Started
- None. Milestone 7B.2 implementation is complete. Next is Final User Review & Project Audit.

---

## 4. Outstanding Tasks (Next Milestones)
- Final User Review & Project Audit.

---

## 5. Known Bugs / Issues
* None. All 89 tests pass; live Gemini generation verified; full monorepo build succeeds; lint succeeds; benchmark 5/8 cases verified.

---

## 6. Blockers
* None. All validation checks passing.

---

## 7. Next Recommended Task
Commit the Milestone 7B.2 implementation if the user approves, then proceed to Final User Review & Project Audit.
