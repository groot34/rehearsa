# Agent Handoff Briefing — Rehearsa

> **To the Incoming Coding Agent**: Read this document first, along with [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md) and [`PROJECT_CONTEXT.md`](file:///d:/Assignemt/Rehearsa/PROJECT_CONTEXT.md), before modifying any code.

---

## 1. Project Identity & Assessment Reference

* **Project**: Rehearsa — Full-Stack AI-Powered Interview Preparation Platform
* **Assessment ID**: `FS-AI-INTERVIEW-01` (Trao Assessment)
* **Active Milestone**: `Milestone 4 — Web Frontend Interface & Interactive Kit Builder` (Completed, Audited & Ready for Commit)

---

## 2. Latest Known Repository State

* **Branch**: `main`
* **Latest Committed Baseline**: `754a534` (`feat: implement research and AI generation pipeline`)
* **Working Tree**: Milestone 4 changes are in working tree (uncommitted — awaiting explicit commit instruction).
  - Modified: `apps/web/next.config.js`, `apps/web/src/app/page.tsx`, `vitest.config.mts`, `docs/AGENT_HANDOFF.md`, `docs/ASSESSMENT.md`, `docs/CHANGELOG.md`, `docs/PROGRESS.md`
  - Untracked (new): `apps/web/src/components/` (9 components), `apps/web/src/lib/api.ts`, `apps/web/src/tests/kitGenerator.test.ts`
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

1. `npx vitest run`: Exit Code `0`. **50/50 tests passing** across 12 test files (4 shared + 4 research + 1 LLM + 1 pipeline + 1 routes + 1 evaluator + 1 web).
2. `npm run build` (web workspace): Exit Code `0`. Next.js production build: `✓ Compiled successfully`, zero TypeScript errors.
3. `npm run lint`: Exit Code `0`. All workspaces lint cleanly.
4. `npm run evaluate`: Exit Code `0`. CLI batch evaluator verified against Appendix B envelope contract.

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
npm run lint
```

---

## 6. Exact Next Task / Milestone

**Milestone 5: End-to-End System Evaluation & Benchmark Verification**

1. Execute full evaluation benchmark run (`npm run evaluate -- --input <benchmark-cases.json> --output <results.json>`).
2. Verify system performance across multiple roles and preparation timeframes (1–60 days).
3. Validate Appendix B envelope formatting and error isolation under stress test scenarios.
4. Complete final project documentation review and user acceptance verification.
