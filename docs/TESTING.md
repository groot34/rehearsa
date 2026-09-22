# Rehearsa — Testing & Quality Assurance Strategy

This document outlines the testing architecture, test boundaries, verification workflows, and execution status across the Rehearsa project.

---

## 1. Testing Philosophy & Boundaries

Testing is organized into three distinct tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                    E2E & Batch Tests                        │
│  - Batch Evaluator (Appendix B contract with mock sites)    │
│  - Full User Journey (Auth -> Generation -> Edit -> Flip)   │
├─────────────────────────────────────────────────────────────┤
│                   Integration Tests                         │
│  - SSRF-Safe Crawler against mock HTTP fixtures             │
│  - Generation Orchestrator with mocked LLM responses        │
│  - Express REST API endpoints & Auth middleware             │
├─────────────────────────────────────────────────────────────┤
│                      Unit Tests                             │
│  - Deterministic Coverage Checker (Set difference math)     │
│  - Deterministic Schedule Allocator (1..60 days allocation) │
│  - Appendix A Schema Validation (Zod boundary cases)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Critical Unit Test Areas & Invariants

### 2.1. Deterministic Coverage Checker (`coverageChecker.test.ts`)
Must verify:
- Complete coverage: All requirement IDs (`r1..rn`) present in questions -> `uncovered_requirement_ids: []`.
- Partial coverage: Requirements without corresponding question references are correctly identified.
- Disjoint requirement IDs: Multi-requirement mapped questions are tracked properly.
- Empty requirements edge case: Handles 0 requirements cleanly.

### 2.2. Deterministic Schedule Allocator (`scheduleAllocator.test.ts`)
Must verify:
- Day boundary conditions: Exactly `1` day, `5` days, `30` days, and `60` days available.
- `days.length === days_available` exact match invariant.
- All question IDs scheduled refer to valid question IDs in the kit.
- Daily minutes calculated as positive integers without NaN.
- Even distribution of questions across categories and days.

### 2.3. Appendix A Schema Validator (`kitSchema.test.ts`)
Must verify:
- Rejection of invalid requirement kinds (only `technical`, `behavioural`, `domain`).
- Rejection of invalid requirement priorities (only `must`, `nice`).
- Rejection of invalid question categories (only `technical`, `behavioural`, `system-design`, `company-fit`).
- Rejection of difficulty ratings outside `1..3`.
- Rejection of kits with dangling requirement references in questions or flashcards.

---

## 3. Test Commands

### Currently Available Commands `[VERIFIED / ACTIVE]`
| Command | Target | Purpose | Status |
|---|---|---|---|
| `npm run lint` | Monorepo root | Runs linter across all workspaces | Configured |
| `npm run build` | Monorepo root | TypeScript compilation across packages & Next.js build | Verified |
| `npm test` or `npx vitest run` | Monorepo root | Runs Vitest unit & integration test suite | Verified (27/27 passing) |

### Test Suite Breakdown (`Vitest v5.0.1`)
- `packages/shared/src/tests/coverageChecker.test.ts`: 7 tests verifying all covered, partial covered, empty arrays, invalid references, duplicate requirement IDs, and stable ordering.
- `packages/shared/src/tests/scheduleAllocator.test.ts`: 6 tests verifying 1-day, multi-day (5, 10), 0 questions, contiguous block allocation, deterministic reproducibility, and error handling.
- `packages/shared/src/tests/kitValidator.test.ts`: 13 tests verifying complete Appendix A valid kit, missing fields, enum errors, difficulty limits, invalid references, duplicate IDs, and coverage consistency.
- `packages/shared/src/tests/integration.test.ts`: 1 test executing end-to-end pipeline: requirements -> Pass 1 -> Coverage -> Pass 2 -> Schedule -> Kit Validation.

---

## 4. Test Execution Log

| Date | Suite | Command | Outcome | Details / Evidence |
|---|---|---|---|---|
| 2026-09-22 | Workspace Init | `npm run build` | Passed | Workspace build succeeded cleanly |
| 2026-09-22 | Milestone 2 Core | `npx vitest run` | Passed | 4 test files, 27/27 unit & integration tests passing |
