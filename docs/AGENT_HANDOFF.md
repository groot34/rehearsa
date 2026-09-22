# Agent Handoff Briefing — Rehearsa

> **To the Incoming Coding Agent**: Read this document first, along with [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md) and [`PROJECT_CONTEXT.md`](file:///d:/Assignemt/Rehearsa/PROJECT_CONTEXT.md), before modifying any code.

---

## 1. Project Identity & Assessment Reference

* **Project**: Rehearsa — Full-Stack AI-Powered Interview Preparation Platform
* **Assessment ID**: `FS-AI-INTERVIEW-01` (Trao Assessment)
* **Active Milestone**: `Milestone 1 — Project Foundation and Engineering Setup` (Completed & Verified)

---

## 2. Latest Known Repository State

* **Git Status**: Git initialized on branch `main`. Initial baseline commit created: `b5c0c9d` (`chore: establish Rehearsa project baseline`). Working tree clean. (Do not force push or rewrite history).
* **Workspace Structure**:
  - `packages/shared`: Shared Zod schemas (Appendix A Kit & Appendix B batch envelope) and static TypeScript types. Built to `dist/`.
  - `apps/api`: Node.js / Express / TypeScript backend with modular architecture and `/health` route. Compiles with `tsc`.
  - `apps/web`: Next.js 14+ / Tailwind CSS frontend with branded Rehearsa landing page. Built with `next build`.
  - `scripts/evaluator.ts`: Headless batch runner supporting `npm run evaluate -- --input <in> --output <out>`.
  - `docs/`: Complete set of 7 permanent documentation files (`ASSESSMENT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `PROGRESS.md`, `AGENT_HANDOFF.md`, `CHANGELOG.md`, `TESTING.md`).
  - `.kiro/`: Pre-existing IDE configuration preserved untouched.

---

## 3. Verification Evidence

1. `npm run build`: Exit Code `0` (Success). Monorepo TypeScript compilation and Next.js static build succeeded with 0 errors.
2. `npm run evaluate -- --input <cases.json> --output <kits.json>`: Exit Code `0` (Success). Produced exact Appendix B envelope contract.

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
# Verify workspace build
npm run build
```

---

## 6. Exact Next Task / Milestone

**Milestone 2: Shared Core Pipeline & Deterministic Services**
1. Implement the deterministic `CoverageChecker` in `packages/shared/src/algorithms/coverageChecker.ts`.
2. Implement the deterministic `ScheduleAllocator` in `packages/shared/src/algorithms/scheduleAllocator.ts`.
3. Add unit test suite for coverage checker, schedule allocator, and Appendix A schema validation.
4. Verify tests pass with 100% boundary coverage.
