# Agent Handoff Briefing — Rehearsa

> **To the Incoming Coding Agent**: Read this document first, along with [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md) and [`PROJECT_CONTEXT.md`](file:///d:/Assignemt/Rehearsa/PROJECT_CONTEXT.md), before modifying any code.

---

## 1. Project Identity & Assessment Reference

* **Project**: Rehearsa — Full-Stack AI-Powered Interview Preparation Platform
* **Assessment ID**: `FS-AI-INTERVIEW-01` (Trao Assessment)
* **Active Milestone**: `Milestone 9 — Kit Persistence + User-Scoped CRUD` (Completed and committed)

---

## 2. Latest Known Repository State

* **Branch**: `main`
* **Latest Committed Baseline**: `8a94003` (`feat(api,web): add persistent user-owned interview kits`)
* **Previous Commits (this session)**:
  - `1a0dfc7` — `feat(api): add user authentication and MongoDB connection` (Milestone 8)
  - `8a94003` — `feat(api,web): add persistent user-owned interview kits` (Milestone 9)
* **Working Tree**: Clean — nothing uncommitted.
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

1. `npx vitest run` (from repo root): Exit Code 0. **161/161 tests passing** across 18 test files.
2. `npm run build`: Exit Code 0. All three workspaces compile with zero TypeScript errors.
3. `npm run lint`: Exit Code 0. All workspaces lint cleanly.
4. `npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json`: Exit Code 0. 5/8 OK, 3 invalid rejected, 2586ms total.
5. `git diff --check`: Exit Code 0 (stdout clean; LF→CRLF warnings on stderr are expected on Windows).
6. Two commits created: `1a0dfc7` (M8) and `8a94003` (M9).
7. Live MongoDB + real auth/kit persistence NOT verified — all tests use `mongodb-memory-server`.

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

**Live manual verification + ASSESSMENT.md update (Milestone 10 prep)**

Milestones 8 and 9 are committed (`1a0dfc7`, `8a94003`). The next actions are:

1. Set `MONGODB_URI` and `JWT_SECRET` in `.env`, then start both servers (`npm run dev`).
2. Manually verify the full authenticated flow: register → login → generate a kit → save it → refresh the page → reopen the kit → edit a question → update the saved kit → regenerate a section → delete the kit.
3. Update `docs/ASSESSMENT.md` Section 1 (Auth) entries to `Verified` with live evidence.
4. Push the 6 unpushed commits to `origin/main` once live verification is confirmed.
5. Consider Milestone 10: flashcard confidence tiers (easy/medium/hard), drag-to-reorder questions, and final project audit.
