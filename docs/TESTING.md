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
| `npm run build` | Monorepo root | TypeScript compilation across packages | Configured |
| `npm test` | Monorepo root | Runs unit test suite via Vitest / Jest | Configured |

### Planned Commands `[PROPOSED]`
| Command | Target | Purpose | Target Milestone |
|---|---|---|---|
| `npm run test:unit` | Monorepo | Runs unit tests only | Milestone 2 |
| `npm run test:integration` | Monorepo | Runs integration tests with mock services | Milestone 3 |
| `npm run test:e2e` | Monorepo | Playwright browser tests for web app | Milestone 4 |
| `npm run evaluate -- --input <in> --output <out>` | Monorepo | Batch evaluation CLI | Milestone 4 |

---

## 4. Test Execution Log

| Date | Suite | Command | Outcome | Details / Evidence |
|---|---|---|---|---|
| 2026-09-22 | Workspace Init | `npm run build` | Pending | Foundation verification in Milestone 1 |
