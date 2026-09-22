# Project Progress & Status — Rehearsa

## 1. Current Milestone
**Milestone 3 — Backend Research & AI Generation Pipeline (COMPLETED & VERIFIED)**
- **Git Baseline**: Latest commit `02c85cd` (`feat: implement deterministic interview prep core`) on branch `main`.

---

## 2. Completed Work
- [x] Initial repository foundation & permanent project memory documentation (Milestone 1).
- [x] **Milestone 2: Deterministic Core Engine**:
  - `packages/shared/src/algorithms/coverageChecker.ts`: Pure, deterministic requirement coverage checking via set difference.
  - `packages/shared/src/algorithms/scheduleAllocator.ts`: Deterministic study schedule allocation across 1–60 days with sequential day numbering, integer study minutes, and category focus labels.
  - `packages/shared/src/validation/kitValidator.ts`: Complete Appendix A kit structure, referential integrity, and coverage consistency validation.
  - Test Suite (`Vitest v5.0.1`): 27 unit & integration tests passing 100% across 4 test suites.
  - Monorepo build (`npm run build`): All packages compiling cleanly with zero errors.
- [x] **Milestone 3 Audit & Security Hardening (COMPLETED & VERIFIED)**:
  - `ssrfGuard.ts`: Enhanced IP validation with Carrier-Grade NAT (`100.64.0.0/10`), documentation IP ranges, and IPv4-mapped IPv6 handling. Created `createSsrfLookup` callback for connection-time socket DNS validation.
  - `safeFetcher.ts`: Configured custom `httpAgent`/`httpsAgent` using `createSsrfLookup` callback in Axios request configuration to prevent DNS Rebinding / Time-of-Check to Time-of-Use (TOCTOU) attacks.
  - `geminiProvider.ts`: Moved `GEMINI_API_KEY` from URL query parameters to `x-goog-api-key` HTTP header and added API key redaction in error messages to prevent secret leakage in logs and stack traces.
  - `pipelineOrchestrator.ts`: Dynamically set `coverage.passes` to `1` or `2` based on Pass 2 execution; sanitized question and flashcard `requirement_ids` against valid extracted role requirements.
  - `mockProvider.ts`: Robust prompt matching for role extraction.
  - **New Test Files Added**:
    - `apps/api/src/modules/research/tests/robotsParser.test.ts` (robots.txt parser unit tests).
    - `apps/api/src/routes/tests/interviewPrepRoutes.test.ts` (REST API route integration tests).
    - `scripts/tests/evaluator.test.ts` (Batch Evaluator CLI integration tests).
  - **Verification Evidence**:
    - `npx vitest run`: Exit Code `0`. **48/48 tests passing** across 11 test files.
    - `npm run build`: Exit Code `0`. Monorepo builds cleanly.
    - `npm run evaluate -- --input scratch/test-cases.json --output scratch/test-output.json`: Exit Code `0`. Output envelope strictly matches Appendix B schema.

---

## 3. Work in Progress
- None. Milestone 3 Audit and Hardening fully completed.

---

## 4. Outstanding Tasks (Next Milestones)
- **Milestone 4**: Web Frontend Interface & Interactive Kit Builder (Next.js UI, generation tracker, in-place editor, flashcards).
- **Milestone 5**: Comprehensive Evaluation & Final Benchmark Runs.

---

## 5. Known Bugs / Issues
* None. All 48 tests pass; build succeeds; batch evaluator CLI verified.

---

## 6. Blockers
* None. All verification checks passing.

---

## 7. Next Recommended Task
Proceed to **Milestone 4**: Implement the Next.js web frontend with kit generation UI, progress tracking, in-place editing, and flashcard viewer.
