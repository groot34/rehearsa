# Agent Handoff Briefing — Rehearsa

> **To the Incoming Coding Agent**: Read this document first, along with [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md) and [`PROJECT_CONTEXT.md`](file:///d:/Assignemt/Rehearsa/PROJECT_CONTEXT.md), before modifying any code.

---

## 1. Project Identity & Assessment Reference

* **Project**: Rehearsa — Full-Stack AI-Powered Interview Preparation Platform
* **Assessment ID**: `FS-AI-INTERVIEW-01` (Trao Assessment)
* **Active Milestone**: `Milestone 7B.2 — Section Regeneration Implementation` (Completed, NOT yet committed)

---

## 2. Latest Known Repository State

* **Branch**: `main`
* **Latest Committed Baseline**: `5bd067a` (`docs(design): add ADR-008 section regeneration contract for Milestone 7B`)
* **Working Tree**: Uncommitted implementation changes (awaiting user commit instruction):
  - Modified: `packages/shared/src/schemas/input.schema.ts` — added `RegenerateSectionEnum` and `RegenerateKitSectionInputSchema`
  - Modified: `apps/api/src/modules/interview-prep/index.ts` — exports `sectionRegenerator`
  - New: `apps/api/src/modules/interview-prep/sectionRegenerator.ts` — 7-step regeneration algorithm
  - New: `apps/api/src/modules/interview-prep/tests/sectionRegenerator.test.ts` — 15 unit tests
  - Modified: `apps/api/src/routes/interviewPrep.routes.ts` — added `POST /regenerate-section` route
  - New: `apps/api/src/routes/tests/regenerateSectionRoutes.test.ts` — 8 route integration tests
  - Modified: `apps/web/src/lib/api.ts` — added `regenerateKitSection()` helper
  - Modified: `apps/web/src/app/page.tsx` — `editedItemIds` state, regen handler, stale-response guard
  - Modified: `apps/web/src/components/KitViewer.tsx` — regen buttons, per-section loading/error state
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

1. `npx vitest run` (from repo root): Exit Code 0. **89/89 tests passing** across 15 test files.
2. `npm run build`: Exit Code 0. All three workspaces compile with zero TypeScript errors.
3. `npm run lint`: Exit Code 0. All workspaces lint cleanly.
4. `npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json`: Exit Code 0. 5/8 cases OK, 3 invalid rejected, 409ms.
5. Milestone 7B.2 implementation reviewed and two bugs fixed; 3 regression tests added.

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

**Final User Review & Project Audit**

Milestone 7B.2 is complete and verified. The next action is for the user to:
1. Review and commit the 7B.2 implementation if satisfied.
2. Conduct a final project audit against the `docs/ASSESSMENT.md` requirements checklist.
3. Update `docs/ASSESSMENT.md` Section 5 (Kit Builder, Editing & Regeneration) to mark the editing and regeneration requirements as `Verified`.

No further feature milestones are planned at this time.
