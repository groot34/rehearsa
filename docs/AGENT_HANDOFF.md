# Agent Handoff Briefing — Rehearsa

> **To the Incoming Coding Agent**: Read this document first, along with [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md) and [`PROJECT_CONTEXT.md`](file:///d:/Assignemt/Rehearsa/PROJECT_CONTEXT.md), before modifying any code.

---

## 1. Project Identity & Assessment Reference

* **Project**: Rehearsa — Full-Stack AI-Powered Interview Preparation Platform
* **Assessment ID**: `FS-AI-INTERVIEW-01` (Trao Assessment)
* **Active Milestone**: `Milestone 2 — Deterministic Core Engine` (Completed & Verified)

---

## 2. Latest Known Repository State

* **Git Status**: Git initialized on branch `main`. Baseline commit: `0e732cf` (`chore: establish Rehearsa project baseline`). Uncommitted changes for Milestone 2 present in working tree (do not commit unless explicitly instructed by project owner).
* **Workspace Structure**:
  - `packages/shared`: Shared Zod schemas, TypeScript types, `coverageChecker.ts`, `scheduleAllocator.ts`, `kitValidator.ts`, and Vitest test suite (`27/27 passing`).
  - `apps/api`: Node.js / Express / TypeScript backend.
  - `apps/web`: Next.js 14+ / Tailwind CSS frontend.
  - `scripts/evaluator.ts`: Headless batch runner.
  - `docs/`: Complete set of 7 permanent documentation files (`ASSESSMENT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `PROGRESS.md`, `AGENT_HANDOFF.md`, `CHANGELOG.md`, `TESTING.md`).

---

## 3. Verification Evidence

1. `npx vitest run`: Exit Code `0` (Success). All 24 unit & integration tests passing across 4 test suites.
2. `npm run build`: Exit Code `0` (Success). Monorepo TypeScript compilation and Next.js static build succeeded with 0 errors.

---

## 4. Important Invariants & Constraints to Uphold

1. **Exact Appendix A Schema**: Do not rename, remove, or alter field types in `KitSchema`.
2. **Deterministic vs. Probabilistic Separation**:
   - Coverage checking (finding uncovered requirements) **must be purely deterministic application code** (set difference).
   - Study schedule allocation across 1–60 days **must be purely deterministic application code**.
   - Do not ask the LLM to calculate coverage or day-by-day distribution.
3. **Preservation of Manual Edits**: When regenerating sections, manual edits and custom questions must be preserved without loss.
4. **Security**:
   - Protect all URL crawling against SSRF (block private IP ranges in production).
   - Treat crawled web content and user JDs strictly as untrusted data.
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

**Milestone 3: Backend Research & LLM Generation Pipeline**
1. Implement SSRF-safe URL fetcher & HTML cleaner module in `apps/api/src/modules/research/`.
2. Implement replaceable LLM provider interface (`ILlmProvider`) for Gemini / Groq with structured JSON parsing.
3. Implement 11-step pipeline orchestrator assembling extracted requirements, research, coverage check (Pass 2 missing generation), and schedule allocation.
4. Wire up Kit persistence in MongoDB and REST API generation endpoints.
