# Agent Handoff Briefing — Rehearsa

> **To the Incoming Coding Agent**: Read this document first, along with [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md) and [`PROJECT_CONTEXT.md`](file:///d:/Assignemt/Rehearsa/PROJECT_CONTEXT.md), before modifying any code.

---

## 1. Project Identity & Assessment Reference

* **Project**: Rehearsa — Full-Stack AI-Powered Interview Preparation Platform
* **Assessment ID**: `FS-AI-INTERVIEW-01` (Trao Assessment)
* **Active Milestone**: `Milestone 5 — End-to-End Evaluation & Benchmarking` (Completed & Verified)

---

## 2. Latest Known Repository State

* **Branch**: `main`
* **Latest Committed Baseline**: `b0dca7b` (`feat: build interview prep frontend`)
* **Working Tree**: Milestone 5 changes are in working tree (uncommitted — awaiting explicit instruction).
  - Modified: `apps/api/src/modules/interview-prep/pipelineOrchestrator.ts`, `packages/shared/src/schemas/batch.schema.ts`, `packages/shared/src/schemas/input.schema.ts`, `scripts/evaluator.ts`, `scripts/tests/evaluator.test.ts`, `docs/AGENT_HANDOFF.md`, `docs/ASSESSMENT.md`, `docs/CHANGELOG.md`, `docs/PROGRESS.md`, `docs/TESTING.md`
  - Synthetic benchmark artifacts stored in `scratch/` (ignored by Git): `scratch/synthetic-benchmark-cases.json`, `scratch/synthetic-benchmark-output.json`
* **Workspace Structure**:
  - `packages/shared`: Zod schemas, types, `coverageChecker.ts`, `scheduleAllocator.ts`, `kitValidator.ts`, full test suite.
  - `apps/api/src/modules/research/`: SSRF-safe fetcher, HTML cleaner, robots parser, multi-page crawler.
  - `apps/api/src/modules/llm/`: `ILlmProvider` interface, `GeminiProvider`, `MockLlmProvider`, `llmFactory`.
  - `apps/api/src/modules/interview-prep/`: `pipelineOrchestrator.ts` (11-step pipeline), integration tests.
  - `apps/api/src/routes/interviewPrep.routes.ts`: `POST /api/interview-prep/generate`.
  - `scripts/evaluator.ts`: Headless batch evaluator with Appendix B envelope output.
  - `apps/web`: Next.js 14 App Router interface with full kit generator form, progress tracker, interactive flashcard deck, question bank, company brief, role breakdown, and schedule timeline views.
  - `docs/`: Complete 7-document permanent project memory.

---

## 3. Verification Evidence

1. `npx vitest run`: Exit Code `0`. **51/51 tests passing** across 12 test files (4 shared + 4 research + 1 LLM + 1 pipeline + 1 routes + 1 evaluator CLI + 1 web).
2. `npm run build`: Exit Code `0`. All three workspaces (`@rehearsa/shared`, `@rehearsa/api`, `@rehearsa/web`) compile with zero TypeScript errors.
3. `npm run lint`: Exit Code `0`. All workspaces lint cleanly.
4. `npm run evaluate`: Exit Code `0`. Full batch benchmark execution across 8 cases (5 valid, 3 invalid) completed in 782ms (< 1s), verified against Appendix A and Appendix B contracts.

---

## 4. Important Invariants & Constraints to Uphold

1. **Exact Appendix A Schema**: Do not rename, remove, or alter field types in `KitSchema`.
2. **Deterministic vs. Probabilistic Separation**:
   - Coverage checking (finding uncovered requirements) **must be purely deterministic application code** (set difference).
   - Study schedule allocation across 1–60 days **must be purely deterministic application code**.
   - Do not ask the LLM to calculate coverage or day-by-day distribution.
3. **Preservation of Manual Edits**: When regenerating sections, manual edits and custom questions must be preserved without loss.
4. **Security**:
   - All URL crawling is protected via `ssrfGuard.ts` (DNS-resolving, blocks private IPs).
   - Crawled web content and user JDs are passed as `<untrusted_...>` tagged context to LLM, never as instructions.
   - Never commit API keys or real secrets.
5. **Batch Evaluation Command**: The CLI contract is strictly:
   ```bash
   npm run evaluate -- --input <cases.json> --output <kits.json>
   ```

---

## 5. Commands to Run Before Modifying Code

```bash
# Verify unit tests, build, lint, and evaluator
npx vitest run
npm run build
npm run lint
npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json
```

---

## 6. Exact Next Task / Milestone

**Project Final Review & User Acceptance**

1. Present final Milestone 5 evaluation report to the user.
2. Await user review, audit confirmation, or explicit commit instruction.
