# Agent Handoff Briefing — Rehearsa

> **To the Incoming Coding Agent**: Read this document first, along with [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md) and [`PROJECT_CONTEXT.md`](file:///d:/Assignemt/Rehearsa/PROJECT_CONTEXT.md), before modifying any code.

---

## 1. Project Identity & Assessment Reference

* **Project**: Rehearsa — Full-Stack AI-Powered Interview Preparation Platform
* **Assessment ID**: `FS-AI-INTERVIEW-01` (Trao Assessment)
* **Active Milestone**: `Milestone 3 — Backend Research & AI Generation Pipeline` (Completed & Verified)

---

## 2. Latest Known Repository State

* **Branch**: `main`
* **Latest Committed Baseline**: `02c85cd` (`feat: implement deterministic interview prep core`)
* **Working Tree**: Milestone 3 changes are uncommitted (in working tree). Do NOT commit unless explicitly instructed.
* **Workspace Structure**:
  - `packages/shared`: Zod schemas, types, `coverageChecker.ts`, `scheduleAllocator.ts`, `kitValidator.ts`, full test suite.
  - `apps/api/src/modules/research/`: SSRF-safe fetcher, HTML cleaner, robots parser, multi-page crawler.
  - `apps/api/src/modules/llm/`: `ILlmProvider` interface, `GeminiProvider`, `MockLlmProvider`, `llmFactory`.
  - `apps/api/src/modules/interview-prep/`: `pipelineOrchestrator.ts` (11-step pipeline), integration tests.
  - `apps/api/src/routes/interviewPrep.routes.ts`: `POST /api/interview-prep/generate`.
  - `scripts/evaluator.ts`: Headless batch evaluator with Appendix B envelope output.
  - `apps/web`: Next.js 14+ frontend (scaffold only — Milestone 4 target).
  - `docs/`: Complete 7-document permanent project memory.

---

## 3. Verification Evidence

1. `npx vitest run`: Exit Code `0`. **48/48 tests passing** across 11 test files (4 shared + 4 research + 1 LLM + 1 pipeline + 1 routes + 1 evaluator).
2. `npm run build`: Exit Code `0`. All three workspaces (`@rehearsa/shared`, `@rehearsa/api`, `@rehearsa/web`) compiled cleanly.
3. `npm run evaluate`: Exit Code `0`. CLI batch evaluator verified against Appendix B envelope contract.

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
# Verify unit tests and build
npx vitest run
npm run build
```

---

## 6. Exact Next Task / Milestone

**Milestone 4: Web Frontend Interface & Interactive Kit Builder**

1. Build the Next.js web UI at `apps/web/` — full-page kit generation form (job description textarea, company URL input, days slider).
2. Implement real-time generation progress tracking (streaming or polling the API).
3. Build the interactive kit viewer: collapsible sections, in-place question/answer editing, flashcard flip UI.
4. Connect to the `POST /api/interview-prep/generate` endpoint and display the assembled `Kit` object.
5. Ensure mobile-responsive layout and accessible HTML structure.
6. Add a study schedule calendar/timeline view.
