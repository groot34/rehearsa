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
| `npm run lint` | Monorepo root | Runs linter across all workspaces | Verified |
| `npm run build` | Monorepo root | TypeScript compilation across packages & Next.js build | Verified |
| `npm test` or `npx vitest run` | Monorepo root | Runs Vitest unit & integration test suite | Verified (239/239 passing) |
| `npm run evaluate -- --input <cases.json> --output <kits.json>` | Monorepo root | Runs batch evaluator CLI with Appendix B output | Verified (8 cases, 782ms) |

**Note**: Auth and kit CRUD tests use `mongodb-memory-server` — no real MongoDB connection required.

### Test Suite Breakdown (`Vitest v5.0.1` — 19 test files, 239 tests)
- `packages/shared/src/tests/coverageChecker.test.ts`: 7 tests — coverage set difference, partial coverage, empty arrays, invalid refs, duplicates, stable ordering.
- `packages/shared/src/tests/scheduleAllocator.test.ts`: 6 tests — 1-day, multi-day, 0 questions, contiguous block, deterministic reproducibility, error handling.
- `packages/shared/src/tests/kitValidator.test.ts`: 13 tests — Appendix A valid kit, missing fields, enum errors, difficulty limits, invalid refs, duplicate IDs, coverage consistency.
- `packages/shared/src/tests/integration.test.ts`: 1 test — end-to-end pipeline: requirements → Pass 1 → Coverage → Pass 2 → Schedule → Kit Validation.
- `apps/api/src/modules/research/tests/ssrfGuard.test.ts`: 6 tests — SSRF protection, private IP blocking, DNS rebinding, loopback dev override.
- `apps/api/src/modules/research/tests/htmlCleaner.test.ts`: 2 tests — script stripping, clean text extraction, link discovery.
- `apps/api/src/modules/research/tests/robotsParser.test.ts`: 2 tests — robots.txt parsing and allow/disallow rule enforcement.
- `apps/api/src/modules/llm/tests/llmProvider.test.ts`: 6 tests — provider interface, mock generation, key normalisation, missing key handling.
- `apps/api/src/modules/interview-prep/tests/pipelineOrchestrator.test.ts`: 4 tests — end-to-end pipeline with MockLlmProvider, SSRF rejection.
- `apps/api/src/modules/interview-prep/tests/sectionRegenerator.test.ts`: 18 tests — preservation, cross-section isolation, ID collision prevention, LLM failure, sanitisation.
- `apps/api/src/modules/auth/tests/auth.service.test.ts`: 25 tests **(NEW — Milestone 8)** — signToken/verifyToken (tampered, wrong secret, expired, invalid), registerUser (hashing, normalisation, duplicate, JWT payload), loginUser (correct creds, wrong password, unknown email, no user enumeration, case-insensitive email, no passwordHash in response), toPublicUser.
- `apps/api/src/routes/tests/interviewPrepRoutes.test.ts`: 3 tests — Express REST API endpoints, validation errors, success payloads.
- `apps/api/src/routes/tests/regenerateSectionRoutes.test.ts`: 8 tests — section regeneration input validation, happy paths, preserved IDs, error response shape.
- `apps/api/src/routes/tests/authRoutes.test.ts`: 30 tests **(NEW — Milestone 8)** — register, login, logout, /me endpoints; all validation error paths; no-passwordHash-in-response; public endpoint accessibility without auth.
- `apps/api/src/routes/tests/kitsRoutes.test.ts`: 40 tests — POST save (auth, 201, 400 invalid/missing, no internal fields), GET list (auth, empty, per-user isolation, summary shape, sort), GET :id (auth, owned, 404 non-owned/non-existent/malformed, no userId), PUT :id (auth, update owned, 404 non-owned, 400 invalid, ownership not changeable), DELETE :id (auth, owned+verify gone, 404 non-owned+original intact, 404 non-existent/malformed), edit survival cycle, multiple kits per user, question confidence tracking (5 tests), question reordering (5 tests).
- `apps/web/src/tests/kitGenerator.test.ts`: 2 tests — frontend API client request formatting and error propagation.
- `apps/web/src/tests/kitEditing.test.ts`: 9 tests — update/add/delete questions and flashcards, referential integrity, schedule cleanup, coverage recalculation.
- `scripts/tests/evaluator.test.ts`: 2 tests — CLI batch evaluation, Appendix B envelope formatting, per-case failure isolation, error exit codes.
- `apps/api/src/routes/tests/e2eJourney.test.ts`: **59 tests (NEW — E2E Journey Audit)** — Full sequential user journey: health check, registration, duplicate-email rejection, second-user registration, login, wrong-password/unknown-email rejection (no enumeration), authenticated session (`/auth/me`), unauthenticated rejection, kit generation (MockLlmProvider), Appendix A structure validation (source/role/questions/flashcards/schedule/coverage/referential integrity), save kit, list kits, open kit by ID, edit+update kit, verify edit persisted, question confidence (all 4 tiers + invalid rejection), question reorder (reverse + empty rejection + duplicate rejection), flashcard confidence (easy/medium/hard + `unknown` rejection + unknown ID rejection), section regeneration (questions), section regeneration (flashcards + preserved_ids), multiple kits, ownership isolation (Bob cannot list/GET/PUT/DELETE Alice's kits), delete kit 2, delete kit 1, access deleted kit returns 404, logout Alice, logout Bob.

Automated auth and kit persistence tests use `mongodb-memory-server`; they do not verify connectivity to a real MongoDB deployment. Live MongoDB verification was completed on 2026-09-24 against a Docker MongoDB instance with real credentials — results are recorded in the Test Execution Log above. Deployment verification (production cloud environment) has not been performed.

---

## 4. Test Execution Log

| Date | Suite | Command | Outcome | Details / Evidence |
|---|---|---|---|---|
| 2026-09-22 | Workspace Init | `npm run build` | Passed | Monorepo build succeeded cleanly |
| 2026-09-22 | Milestone 2 Core | `npx vitest run` | Passed | 4 test files, 27/27 unit & integration tests passing |
| 2026-09-22 | Milestone 3 Pipeline | `npx vitest run` | Passed | 11 test files, 48/48 tests passing |
| 2026-09-22 | Milestone 4 Frontend | `npx vitest run` | Passed | 12 test files, 50/50 tests passing |
| 2026-09-22 | Milestone 5 Evaluator | `npx vitest run` | Passed | 12 test files, 51/51 tests passing |
| 2026-09-22 | Milestone 5 Benchmark | `npm run evaluate` | Passed | 8 benchmark cases evaluated in 782ms; Appendix A/B verified |
| 2026-09-23 | Milestone 7A Editing | `npx vitest run` | Passed | 13 test files, 63/63 tests passing |
| 2026-09-23 | Milestone 7B.2 Regen | `npx vitest run` | Passed | 15 test files, 89/89 tests passing |
| 2026-09-23 | Milestone 8 Auth+DB | `npx vitest run` | Passed | 17 test files, **132/132 tests passing** (mongodb-memory-server) |
| 2026-09-23 | Milestone 8 Build | `npm run build` | Passed | All three workspaces compile cleanly |
| 2026-09-23 | Milestone 8 Lint | `npm run lint` | Passed | All workspaces lint cleanly |
| 2026-09-23 | Milestone 9 Kit CRUD | `npx vitest run` | Passed | 18 test files, **161/161 tests passing** |
| 2026-09-23 | Milestone 9 Build | `npm run build` | Passed | All three workspaces compile cleanly |
| 2026-09-23 | Milestone 9 Lint | `npm run lint` | Passed | All workspaces lint cleanly |
| 2026-09-23 | M8+M9 review | `npm test` | Passed | 18 test files, 161/161 tests passing |
| 2026-09-23 | M8+M9 review | `npm run build` | Passed | Shared, API, and Next.js builds completed successfully |
| 2026-09-23 | M8+M9 review | `npm run lint` | Passed | Workspace lint scripts exited successfully |
| 2026-09-23 | M8+M9 review | `npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json` | Passed | 8 cases: 5 valid kits, 3 isolated invalid cases, 874ms |
| 2026-09-23 | M8+M9 review | Local Mongo readiness check | Not available | `.env` has no `MONGODB_URI` or `JWT_SECRET`; no live database attempt was possible |
| 2026-09-24 | M8+M9 final pre-commit | `npm test` | Passed | 18 test files, **161/161 tests passing** (Exit Code 0) |
| 2026-09-24 | M8+M9 final pre-commit | `npm run build` | Passed | All three workspaces compile cleanly (Exit Code 0) |
| 2026-09-24 | M8+M9 final pre-commit | `npm run lint` | Passed | All workspaces lint cleanly (Exit Code 0) |
| 2026-09-24 | M8+M9 final pre-commit | `npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json` | Passed | 8 cases: 5 valid kits, 3 isolated invalid, 2586ms (Exit Code 0) |
| 2026-09-24 | M8+M9 final pre-commit | `git diff --check` | Passed | Exit Code 0, stdout clean; LF→CRLF warnings on stderr are expected on Windows |
| 2026-09-24 | M8+M9 commit | git commit | Passed | Commit 1 `1a0dfc7` (M8, 19 files); Commit 2 `8a94003` (M9, 22 files); working tree clean |
| 2026-09-24 | M10.1 confidence | `npx vitest run` | Passed | 18 test files, **166/166 tests passing** (Exit Code 0) |
| 2026-09-24 | M10.1 confidence | `npm run build` | Passed | All three workspaces compile cleanly (Exit Code 0) |
| 2026-09-24 | M10.1 confidence | `npm run lint` | Passed | All workspaces lint cleanly (Exit Code 0) |
| 2026-09-24 | M10.1 confidence | git commit | Passed | Commit `2bbd21e` (8 files) |
| 2026-09-24 | M10.2 reorder | `npx vitest run` | Passed | 18 test files, **171/171 tests passing** (Exit Code 0) |
| 2026-09-24 | M10.2 reorder | `npm run build` | Passed | All three workspaces compile cleanly (Exit Code 0) |
| 2026-09-24 | M10.2 reorder | `npm run lint` | Passed | All workspaces lint cleanly (Exit Code 0) |
| 2026-09-24 | M10.2 reorder | git commit | Passed | Commit `e5cd02c` (8 files) |
| 2026-09-24 | M10.3 flashcard confidence | npx vitest run | Passed | 18 test files, **180/180 tests passing** (Exit Code 0) |
| 2026-09-24 | M10.3 flashcard confidence | npm run build | Passed | All three workspaces compile cleanly (Exit Code 0) |
| 2026-09-24 | M10.3 flashcard confidence | npm run lint | Passed | All workspaces lint cleanly (Exit Code 0) |
| 2026-09-24 | M10.3 flashcard confidence | git commit | Passed | Commit `085cc0f` (impl, 8 files); Commit `d947b87` (docs, 5 files) |
| 2026-09-24 | Live MongoDB verification | Manual — Docker MongoDB + real Gemini API key | Passed | Full live verification against real MongoDB (Docker). Auth: registration (201), duplicate rejected (409 EMAIL_TAKEN), login correct creds (200 + JWT), login wrong password (401 INVALID_CREDENTIALS), login unknown email (401 INVALID_CREDENTIALS, no enumeration), GET /auth/me (200 user), logout (200 stateless). Kit CRUD: live Gemini generation succeeded, POST /api/kits (201), GET /api/kits (200), PUT /api/kits/:id (200, edit preserved), PUT /api/kits/:id/confidence (200), PUT /api/kits/:id/reorder (200), PUT /api/kits/:id/flashcard-confidence easy/medium/hard (200 each), multiple kits listed correctly, DELETE (200). Ownership isolation: User B GET/PUT/DELETE on User A's kit all returned 404 NOT_FOUND; User A's kits not visible in User B's list. No secrets recorded in documentation. |
| 2026-09-24 | E2E Journey Audit | `npx vitest run apps/api/src/routes/tests/e2eJourney.test.ts` | Passed | **59/59 tests passing** — API-level sequential journey: health check, registration (Alice+Bob), duplicate rejection (409 EMAIL_TAKEN), login (200+JWT), wrong-password/unknown-email rejection (401 INVALID_CREDENTIALS, no enumeration), GET /auth/me (200), unauthenticated rejection (401), kit generation with MockLlmProvider (200), Appendix A structure validation (source/role/questions/flashcards/schedule/coverage/referential integrity), save kit (201), list kits (1 kit), open kit by ID (200), edit+update (200), edit persisted on reload, question confidence all 4 tiers + invalid rejection, question reorder (reverse order + empty rejection + duplicate rejection), flashcard confidence easy/medium/hard + `unknown` rejection + unknown ID rejection, section regen questions (200, schedule rebuilt), section regen flashcards + preserved_ids (200, preserved card present), multiple kits (Alice 2, Bob 0), ownership isolation (Bob: 404 on GET/PUT/DELETE Alice's kit), delete kit 2 (200, Alice sees 1), delete kit 1 (200, Alice sees 0), deleted kit 404 on GET/PUT/DELETE, logout Alice (200), logout Bob (200). No browser/UI verification performed. |
| 2026-09-24 | E2E Journey Audit — full suite | `npm test` | Passed | **239/239 tests passing** across 19 test files (Exit Code 0) |
| 2026-09-24 | E2E Journey Audit — build | `npm run build` | Passed | All three workspaces compile cleanly (Exit Code 0) |
| 2026-09-24 | E2E Journey Audit — lint | `npm run lint` | Passed | All workspaces lint cleanly (Exit Code 0) |
| 2026-09-24 | E2E Journey Audit — evaluator | `npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json` | Passed | 8 cases: 5 valid kits, 3 isolated invalid, 572ms (Exit Code 0) |
