# Agent Handoff Briefing — Rehearsa

> **To the Incoming Coding Agent**: Read this document first, along with [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md) and [`PROJECT_CONTEXT.md`](file:///d:/Assignemt/Rehearsa/PROJECT_CONTEXT.md), before modifying any code.

---

## 1. Project Identity & Assessment Reference

* **Project**: Rehearsa — Full-Stack AI-Powered Interview Preparation Platform
* **Assessment ID**: `FS-AI-INTERVIEW-01` (Trao Assessment)
* **Active Milestone**: `Milestone 7A — Manual Kit Editing` (Completed & Verified, NOT yet committed)

---

## 2. Latest Known Repository State

* **Branch**: `main`
* **Latest Committed Baseline**: `9803474` (`fix(llm): normalise Gemini response keys and add regression tests`)
* **Working Tree**: Uncommitted changes (awaiting user commit instruction):
  - Modified: `apps/api/src/modules/research/robotsParser.ts` (TS error fix)
  - Modified: `apps/web/src/app/page.tsx` (wired `onUpdateKit`)
  - Modified: `apps/web/src/components/FlashcardDeck.tsx` (editing/adding/deleting flashcards)
  - Modified: `apps/web/src/components/KitViewer.tsx` (all six editing handlers)
  - Modified: `apps/web/src/components/QuestionBankCard.tsx` (editing/adding/deleting questions)
  - Untracked (new): `apps/web/src/lib/kitEditing.ts` (editing logic library)
  - Untracked (new): `apps/web/src/tests/kitEditing.test.ts` (9 unit tests)
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

**Milestone 7B - Section-Level Content Regeneration**

Allow users to regenerate individual kit sections (question bank, flashcards) via a new backend endpoint without rebuilding the entire kit, while preserving all manually edited items. Key constraints:

- Manually edited questions/flashcards (identified by q_custom_* / f_custom_* ID prefix) must not be overwritten.
- The backend endpoint should accept the current kit + target section name and return only the regenerated section.
- After section regeneration, deterministic coverage re-check and schedule re-allocation must run.
- The UI should show a "Regenerate Section" button per section card (Questions, Flashcards) in KitViewer.tsx.
