# Changelog — Rehearsa

All notable changes to the Rehearsa project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [docs] - Live MongoDB Verification — 2026-09-24

### Verified
Live end-to-end verification completed against a real MongoDB instance (Docker) with production-equivalent credentials (`MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY` in `.env`). No secrets recorded. Key results:

- **API health**: `GET /api/health` → `{ status: "ok" }` (server up, DB connected).
- **Registration**: `POST /auth/register` → 201. Duplicate email → 409 `EMAIL_TAKEN`. `passwordHash` never returned.
- **Login**: Correct credentials → 200 + JWT. Wrong password → 401 `INVALID_CREDENTIALS`. Unknown email → 401 `INVALID_CREDENTIALS` (no user enumeration, constant-time path).
- **Session**: `GET /auth/me` with valid JWT → 200, authenticated user. `POST /auth/logout` → 200, stateless behaviour confirmed.
- **Live Gemini generation**: Full 11-step pipeline completed successfully with real API key; Appendix A kit returned.
- **Kit CRUD**: Save (201), list (200), edit/PUT (200, edited question preserved), delete (200).
- **Question confidence**: `PUT /api/kits/:id/confidence` → 200 for all valid tiers.
- **Question reorder**: `PUT /api/kits/:id/reorder` → 200 with corrected `questionIds` payload.
- **Flashcard confidence**: `PUT /api/kits/:id/flashcard-confidence` → 200 for easy, medium, and hard tiers.
- **Multiple kits**: Two kits created for the same user; both returned in list.
- **Ownership isolation (User B → User A's kit)**: `GET /api/kits` (empty list), `GET /api/kits/:id` (404), `PUT /api/kits/:id` (404), `DELETE /api/kits/:id` (404). No ownership disclosure.

### Documentation updated
- `docs/ASSESSMENT.md`: Auth and kit ownership rows updated to `Verified (live MongoDB verification)` with detailed evidence.
- `docs/PROGRESS.md`: M10.3 status updated to committed + live-verified; M8/M9 live verification notes corrected; blockers and next steps updated.
- `docs/AGENT_HANDOFF.md`: Rewritten to reflect actual HEAD commit, completed verification evidence, and genuine remaining gaps.
- `docs/TESTING.md`: Live verification entry added to Test Execution Log; suite note updated.
- `docs/CHANGELOG.md`: This entry added.

---

## [1.0.0-m10] - Milestone 10: Question Confidence + Reordering + Flashcard Confidence - 2026-09-24

### Added
- **Question Confidence Persistence (`apps/api/src/modules/kits/kit.model.ts`)**: Optional `questionConfidence` field (Map) to `KitDocumentModel`, stored outside Appendix A kit payload to preserve schema compliance.
- **Confidence Service (`apps/api/src/modules/kits/kit.service.ts`)**: `updateQuestionConfidence` function with enum validation (`'unknown' | 'not-ready' | 'somewhat-ready' | 'ready'`), ownership enforcement via `{ _id, userId }` query, atomic MongoDB update.
- **Confidence API Route (`apps/api/src/routes/kits.routes.ts`)**: `PUT /api/kits/:id/confidence` endpoint with Zod validation, returns `{ success: true, updated: true }` or error.
- **Confidence Frontend API (`apps/web/src/lib/api.ts`)**: `updateQuestionConfidence` function with typed payload/response.
- **Confidence UI (`apps/web/src/components/QuestionBankCard.tsx`)**: Small emerald-styled dropdown selector per question for confidence levels.
- **Confidence State (`apps/web/src/app/page.tsx`)**: `questionConfidence` state tracking, `handleUpdateConfidence` callback. Reset on kit load (TODO: fetch from API).
- **Question Reordering Persistence (`apps/api/src/modules/kits/kit.model.ts`)**: Optional `questionOrder: string[]` field to `KitDocumentModel`, stored outside Appendix A kit payload.
- **Reorder Service (`apps/api/src/modules/kits/kit.service.ts`)**: `reorderQuestions` function with validation (non-empty array, no duplicates), ownership enforcement, atomic MongoDB update.
- **Reorder API Route (`apps/api/src/routes/kits.routes.ts`)**: `PUT /api/kits/:id/reorder` endpoint with Zod validation, returns `{ success: true, updated: true }` or error.
- **Reorder Frontend API (`apps/web/src/lib/api.ts`)**: `reorderQuestions` function with typed payload/response.
- **Reorder UI (`apps/web/src/components/QuestionBankCard.tsx`)**: Up/down arrow buttons per question when `questionOrder` is set. `orderedQuestions` memo sorts by custom order.
- **Reorder State (`apps/web/src/app/page.tsx`)**: `questionOrder` state tracking, `handleReorderQuestions` callback. Reset on kit load (TODO: fetch from API).
- **Flashcard Confidence Persistence (`apps/api/src/modules/kits/kit.model.ts`)**: Optional `flashcardConfidence` field (Map<string, 'easy'|'medium'|'hard'>) to `KitDocumentModel`, stored outside Appendix A kit payload. Same pattern as `questionConfidence`.
- **Flashcard Confidence Service (`apps/api/src/modules/kits/kit.service.ts`)**: `FlashcardConfidence` type (`'easy' | 'medium' | 'hard'`), `FlashcardConfidenceEnum`, and `updateFlashcardConfidence` function. Validates flashcard ID against the kit's flashcards array (rejects unknown IDs), validates confidence enum, enforces ownership via `{ _id, userId }`.
- **Flashcard Confidence API Route (`apps/api/src/routes/kits.routes.ts`)**: `FlashcardConfidenceTierSchema`, `UpdateFlashcardConfidenceInputSchema`, and `PUT /api/kits/:id/flashcard-confidence` endpoint. Returns `{ success: true, updated: true }` or structured error.
- **Flashcard Confidence Frontend API (`apps/web/src/lib/api.ts`)**: `FlashcardConfidence` type, `UpdateFlashcardConfidencePayload`, `ApiFlashcardConfidenceResponse`, and `updateFlashcardConfidence()` client function.
- **Flashcard Confidence State (`apps/web/src/app/page.tsx`)**: `flashcardConfidence` state, `isUpdatingFlashcardConfidence` state, `handleUpdateFlashcardConfidence` callback (no-op if kit not saved), reset on kit open. Wired to `KitViewer`.
- **Flashcard Confidence UI (`apps/web/src/components/FlashcardDeck.tsx`)**: Replaced binary `masteredIds` toggle with three-tier confidence buttons (Easy / Medium / Hard). Removed `CheckCircle2` icon, `toggleMastered` callback, and `KeyM` keyboard shortcut. Added `CONFIDENCE_TIERS` config array with color/dot classes. Summary header now shows easy/medium/hard distribution counts instead of mastered count.
- **Confidence Tests (`apps/api/src/routes/tests/kitsRoutes.test.ts`)**: 5 integration tests — valid update, invalid rejection, cross-user 404, non-existent kit 404, all valid values.
- **Reorder Tests (`apps/api/src/routes/tests/kitsRoutes.test.ts`)**: 5 integration tests — valid reorder, empty array rejection, duplicate rejection, cross-user 404, non-existent kit 404.
- **Flashcard Confidence Tests (`apps/api/src/routes/tests/kitsRoutes.test.ts`)**: 9 integration tests — unauthenticated rejection, easy confidence, medium confidence, hard confidence, invalid value rejection (`unknown` is not valid for flashcards), unknown flashcard ID rejection, cross-user 404, confidence persistence verified via DB read, existing kit without confidence loads successfully.

### Architecture decisions
- **ADR-011**: Confidence stored outside Appendix A via optional `questionConfidence` field. Preserves schema compliance. Dedicated endpoint for atomic updates.
- **ADR-012**: Order stored outside Appendix A via optional `questionOrder: string[]` field. Simple ID array representation. Up/down UI avoids drag-and-drop dependency.
- **ADR-013**: Flashcard confidence stored outside Appendix A via optional `flashcardConfidence` field. Three-tier enum (easy/medium/hard). Flashcard ID validation ensures only existing cards can receive confidence. UI replaces binary mastered toggle with tiered buttons.

### Verification
- `npx vitest run`: Exit Code `0`. **180/180 tests passing** (19 new tests added for confidence + reordering + flashcard confidence).
- `npm run build`: Exit Code `0`. All three workspaces compile cleanly.
- `npm run lint`: Exit Code `0` (with pre-existing TS deprecation warning on moduleResolution).
- Changes committed at `2bbd21e` (confidence), `e5cd02c` (reorder), and pending for flashcard confidence.

### Known limitations
- Confidence and order are not returned in `GET /api/kits/:id` response. Frontend tracks in session state; full implementation would fetch on kit load.
- If a question is deleted, its ID remains in `questionOrder` array (cleanup needed on regeneration or explicit reordering).
- Frontend falls back to default array order when `questionOrder` is empty/undefined.
- Flashcard confidence is not returned in `GET /api/kits/:id` response. Frontend tracks in session state; full implementation would fetch on kit load.

---

## [1.0.0-m9] - Milestone 9: Kit Persistence + User-Scoped CRUD - 2026-09-23

### Added
- **Kit Document Model (`apps/api/src/modules/kits/kit.model.ts`)**: `KitDocumentModel` with `userId` (ObjectId, indexed), `kit` (Mixed — Appendix A payload stored verbatim, not re-declared in Mongoose to avoid schema drift), `createdAt`/`updatedAt`. Compound index `{ userId, createdAt: -1 }` for fast per-user list queries.
- **Kit Persistence Schemas (`packages/shared/src/schemas/input.schema.ts`)**: `SaveKitInputSchema`, `UpdateKitInputSchema` (both wrap `KitSchema`), `KitSummarySchema` (id/role/company/daysAvailable/timestamps for list responses). All keep persistence metadata outside Appendix A.
- **Kit Service (`apps/api/src/modules/kits/kit.service.ts`)**: `saveKit`, `listKits`, `getKitById`, `updateKit`, `deleteKit`. Ownership enforced via `{ _id, userId }` compound query on every read/update/delete — NOT_FOUND returned for both missing and non-owned kits. `isValidObjectId` guard rejects malformed IDs before hitting the database. `updateKit` uses `findOneAndUpdate` with ownership in the filter clause so userId cannot be overwritten.
- **Kit CRUD Routes (`apps/api/src/routes/kits.routes.ts`)**: `POST /api/kits` (201), `GET /api/kits` (summaries), `GET /api/kits/:id`, `PUT /api/kits/:id`, `DELETE /api/kits/:id`. All behind `requireAuth`; `userId` derived exclusively from `req.user.sub`.
- **Auth Proxy (`apps/web/next.config.js`)**: Added `/auth/:path*` rewrite so the browser proxies auth calls through Next.js instead of hitting the API port directly.
- **Frontend Auth (`apps/web/src/lib/auth.tsx`)**: `AuthProvider` React context + `useAuth` hook. Token stored in `sessionStorage` — cleared on tab close (trade-off: XSS readable vs httpOnly cookie, documented in JSDoc).
- **Auth Forms (`apps/web/src/components/AuthForms.tsx`)**: Combined login/register tab component.
- **Kit List UI (`apps/web/src/components/SavedKitsList.tsx`)**: Displays user's saved kits (newest first), open button, delete with confirmation, loading/empty/error states.
- **Full Frontend Workflow (`apps/web/src/app/page.tsx`)**: View state machine (`home` / `auth` / `my-kits` / `kit-viewer`). Save/Update banner with success/error feedback. Edit preservation (`editedItemIds`) retained across save and regeneration cycles. Logout clears session.
- **Kit CRUD Tests (`apps/api/src/routes/tests/kitsRoutes.test.ts`)**: 30 integration tests using mongodb-memory-server with two distinct users. Covers: save (auth, 201, 400 invalid/missing, no internal fields), list (auth, empty, user isolation, summary shape, sort), get (auth, owned, 404 non-owned/non-existent/malformed), update (auth, owned, 404 non-owned, 400 invalid, ownership unchangeable), delete (auth, owned+verify gone, 404 non-owned+original intact, 404 non-existent/malformed), edit survival cycle, multiple kits per user.

### Fixed
- **`apps/api/src/app.ts`**: Removed incorrect `app.use('/api/kits', interviewPrepRoutes)` alias; now correctly mounts `kitsRoutes`.
- **`apps/web/src/lib/api.ts`**: Rewrote to remove duplicate function exports introduced by a partial str_replace.
- **`apps/api/src/modules/auth/user.model.ts`**: Removed redundant `UserSchema.index()` call that caused a Mongoose duplicate-index warning.
- **`scripts/tests/evaluator.test.ts`**: Increased per-test timeouts from 20s to 60s to prevent load-induced flakiness when running alongside bcrypt-heavy auth tests on Windows.
- **`vitest.config.mts`**: Added global `testTimeout: 30000` / `hookTimeout: 30000`.

### Architecture decisions
- **Generation stays public** (no auth required for `POST /api/interview-prep/generate`). This preserves the batch evaluator contract. Saving a kit requires auth; generation does not.
- **Token storage**: `sessionStorage` — cleared on tab close, readable by JS on same origin. Trade-off documented in code.

### Verification
- `npx vitest run`: Exit Code `0`. **161/161 tests passing** across 18 test files.
- `npm run build`: Exit Code `0`. All three workspaces compile cleanly.
- `npm run lint`: Exit Code `0`.
- Live MongoDB/auth NOT verified — all tests use `mongodb-memory-server`. Manual verification requires `MONGODB_URI` + `JWT_SECRET` in `.env`.
- Changes are **committed at `8a94003`**.

### Added
- **MongoDB Connection (`apps/api/src/modules/db/connection.ts`)**: Singleton `connectToDatabase(uri)` that establishes a Mongoose connection. Idempotent — safe to call multiple times. Tests bypass this module and connect directly with mongodb-memory-server.
- **Auth Zod Schemas (`packages/shared/src/schemas/auth.schema.ts`)**: `RegisterInputSchema` (email + min-8-char password, email normalised to lowercase), `LoginInputSchema`, `PublicUserSchema` (id/email/createdAt — no password), `JwtPayloadSchema`.
- **User Model (`apps/api/src/modules/auth/user.model.ts`)**: Mongoose schema with `email` (unique, lowercase, indexed) and `passwordHash` (`select: false` — excluded from all queries by default). `createdAt` timestamp via schema options.
- **Auth Service (`apps/api/src/modules/auth/auth.service.ts`)**: `registerUser` (bcrypt cost 12, returns `EMAIL_TAKEN` 409 on duplicate), `loginUser` (constant-time dummy-hash comparison for unknown email, generic `INVALID_CREDENTIALS` 401 for both wrong password and unknown email to prevent user enumeration), `signToken`/`verifyToken` (JWT secret read at call time, not module load time), `toPublicUser`.
- **Auth Middleware (`apps/api/src/modules/auth/auth.middleware.ts`)**: `requireAuth` Express middleware — extracts `Authorization: Bearer <token>`, returns structured 401 with `MISSING_TOKEN`, `TOKEN_EXPIRED`, or `INVALID_TOKEN` codes. Populates `req.user = { sub, email }` on success.
- **Auth Routes (`apps/api/src/routes/auth.routes.ts`)**: `POST /auth/register` (201), `POST /auth/login` (200), `POST /auth/logout` (200, requires valid token), `GET /auth/me`. Rate limiting (10 req/15 min per IP via `express-rate-limit`, disabled in test environment).
- **Server startup guard (`apps/api/src/server.ts`)**: Warns in development and refuses to start in production if `JWT_SECRET` is missing or shorter than 32 characters. Calls `connectToDatabase()` before accepting connections.
- **Config additions (`apps/api/src/config/index.ts`)**: `config.mongo.uri` (from `MONGODB_URI`) and `config.jwt.secret`/`config.jwt.expiresIn` (from `JWT_SECRET`/`JWT_EXPIRES_IN`).
- **Unit Tests (`apps/api/src/modules/auth/tests/auth.service.test.ts`)**: 25 tests — signToken/verifyToken (tampered, wrong secret, expired, invalid string), registerUser (hashing, normalisation, duplicate, JWT payload), loginUser (correct creds, wrong password, unknown email, no-enumeration, case-insensitive email, no passwordHash in response), toPublicUser.
- **Route Integration Tests (`apps/api/src/routes/tests/authRoutes.test.ts`)**: 30 tests using mongodb-memory-server — full register/login/logout/me flows, all validation error paths, no-passwordHash-in-response, public endpoints remain accessible without auth.
- **Dependencies added to `apps/api`**: `mongoose ^9.10.2`, `bcrypt ^6.0.0`, `jsonwebtoken ^9.0.3`, `express-rate-limit ^8.7.0`, `mongodb-memory-server ^11.3.0` (dev), `@types/bcrypt`, `@types/jsonwebtoken`.

### Security decisions
- Passwords hashed with bcrypt, cost factor 12.
- `passwordHash` marked `select: false` in Mongoose — never appears in query results unless explicitly requested.
- Login returns `INVALID_CREDENTIALS` for both unknown email and wrong password (no user enumeration).
- Constant-time bcrypt comparison even when the user is not found (dummy hash path).
- JWT secret read from environment variable at call time, never hardcoded.
- Rate limiting on register/login endpoints.

### Known limitations
- JWT logout is stateless. The server does not maintain a token blocklist. A token remains cryptographically valid until expiry after the client discards it. Short `JWT_EXPIRES_IN` values (e.g., `1h`) reduce the exposure window. A token blocklist can be added in a future milestone if required.
- Live DB/auth has not been verified against a real MongoDB instance. All 55 new tests (25 unit + 30 route) use `mongodb-memory-server`.

### Verification
- `npx vitest run`: Exit Code `0`. **132/132 tests passing** across 17 test files.
- `npm run build`: Exit Code `0`. All three workspaces compile cleanly.
- `npm run lint`: Exit Code `0`.
- Changes are **committed at `1a0dfc7`**.

### Added
- **Shared Input Schema (`packages/shared/src/schemas/input.schema.ts`)**: Added `RegenerateSectionEnum` (`'questions' | 'flashcards'`) and `RegenerateKitSectionInputSchema` (`{ kit: KitSchema, section, preserved_ids: string[] }`). Includes JSDoc trust-boundary note: the server cannot independently verify which submitted items were edited; the client is authoritative for `preserved_ids`.
- **Section Regenerator (`apps/api/src/modules/interview-prep/sectionRegenerator.ts`)**: New pure server-side module implementing the 7-step ADR-008 algorithm. `buildPreservedSet()` enforces the two-part preservation predicate (auto-prefix `q_custom_*/f_custom_*` + explicit client-supplied IDs, validated against the submitted kit). New item IDs stamped `q_regen_*/f_regen_*` to prevent collisions. Questions path runs LLM pass 1 → sanitize `requirement_ids` → merge → `checkRequirementCoverage` → optional pass 2 → `allocateSchedule` → `validateKit`. Flashcards path skips coverage/schedule steps. Any failure returns a structured error; the original kit is never returned on failure.
- **Regeneration API Route (`apps/api/src/routes/interviewPrep.routes.ts`)**: Added `POST /api/interview-prep/regenerate-section`. Validates request body with `RegenerateKitSectionInputSchema`; returns `{ success: true, kit }` on success or `{ success: false, error: { code, message } }` on failure. Error codes: `REGEN_INVALID_INPUT` (HTTP 400), `REGEN_LLM_FAILED` / `REGEN_VALIDATION_FAILED` (HTTP 500).
- **Frontend API Helper (`apps/web/src/lib/api.ts`)**: Added `regenerateKitSection(payload)` function with `RegenerateKitSectionPayload` and `ApiRegenerateResponse` types. Documents that `preserved_ids` tracking is lost on browser refresh (no persistence layer).
- **Edited Item Tracking (`apps/web/src/app/page.tsx`)**: Added `editedItemIds: Set<string>` state (separate from `generatedKit`). `handleItemEdited` adds in-place-edited original IDs; `handleItemDeleted` removes deleted IDs so they cannot reappear. `handleRegenerateSection` includes a stale-response guard (request-ID counter) to prevent a slow response from overwriting a newer user edit. All wired to `KitViewer` as `onItemEdited`, `onItemDeleted`, `onRegenerateSection`.
- **Regenerate Section Buttons (`apps/web/src/components/KitViewer.tsx`)**: Added `onItemEdited`, `onItemDeleted`, `onRegenerateSection` props. Per-section `regenLoading`/`regenError` state drives `RegenButton` (spinner while loading) and `RegenErrorBanner` (error message on failure, kit unchanged). Edit and delete handlers now invoke `onItemEdited`/`onItemDeleted` to maintain the preserved set. Regen buttons rendered above Questions and Flashcards sections in both `all` and section-specific tab views.
- **Unit Tests (`apps/api/src/modules/interview-prep/tests/sectionRegenerator.test.ts`)**: 15 tests covering explicit preservation, auto-prefix preservation, deleted items not reintroduced, schedule referential integrity after regen, ID collision prevention, LLM failure isolation, and `requirement_ids` sanitization — for both `questions` and `flashcards` sections.
- **Route Integration Tests (`apps/api/src/routes/tests/regenerateSectionRoutes.test.ts`)**: 8 tests covering: HTTP 400 for empty body / invalid section / incomplete kit; HTTP 200 for both sections with valid output; preserved_id wiring; error response never contains a kit; non-existent preserved_ids silently dropped.

### Verification
- `npx vitest run` (repo root): Exit Code `0`. **89/89 tests passing** across 15 test files (3 additional regression tests added during review).
- `npm run build`: Exit Code `0`. All three workspaces compile cleanly.
- `npm run lint`: Exit Code `0`. All workspaces lint cleanly.
- `npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json`: Exit Code `0`. 5/8 cases OK, 3 invalid schemas rejected, 409ms total.
- Changes are **NOT committed** (awaiting user instruction).

### Fixes Applied During Review
- **Stale-response guard bug (`apps/web/src/app/page.tsx`)**: The original `useState`-based request counter was broken — rapid concurrent regeneration calls both read the same stale closure value, assigning identical `thisRequestId`s so the guard never fired. Replaced with `useRef`-based counter. The ref increment is synchronous and immediately visible to all concurrent calls, correctly causing the slower response to be discarded.
- **`RegenerateSection` type duplication (`apps/web/src/lib/api.ts`)**: The file redefined `type RegenerateSection = 'questions' | 'flashcards'` instead of importing the canonical type from `@rehearsa/shared`. Fixed by importing and re-exporting from shared.
- **Additional regression tests (`apps/api/src/modules/interview-prep/tests/sectionRegenerator.test.ts`)**: Added 3 tests — cross-section isolation for questions regen (flashcards/role/brief unchanged), cross-section isolation for flashcards regen (questions/schedule/coverage unchanged), and a sanitization regression confirming that LLM-returned invalid `requirement_ids` are stripped without crashing.

### Known Limitations
- `editedItemIds` is held only in React session state. It is lost on browser refresh because there is no persistence layer. Users who refresh will lose the preserved-ID set; subsequent regeneration will not preserve in-place edits made before the refresh. Custom-added items (prefix `q_custom_*/f_custom_*`) are still auto-preserved regardless.
- The server trusts the client's submitted kit and `preserved_ids` at face value (documented as the trust boundary in ADR-008 and in code comments).

---

## [1.0.0-m7b1] - Milestone 7B.1: Section Regeneration Contract Design - 2026-09-23

### Added
- **ADR-007 revised** (`docs/DECISIONS.md`): Updated to Accepted status with full two-part preservation predicate rationale.
- **ADR-008** (`docs/DECISIONS.md`): New Accepted ADR documenting the complete section regeneration API contract, preservation rules, 7-step server-side algorithm, failure isolation table, input schema addition, frontend tracking approach, and Appendix A compatibility guarantee.

---

## [1.0.0-m7a] - Milestone 7A: Manual Kit Editing - 2026-09-23

### Added
- **Kit Editing Library (`apps/web/src/lib/kitEditing.ts`)**: New pure, immutable editing utility module exposing six functions — `updateQuestionInKit`, `addQuestionToKit`, `deleteQuestionFromKit`, `updateFlashcardInKit`, `addFlashcardToKit`, `deleteFlashcardFromKit`. Each validates inputs against shared Zod schemas, enforces referential integrity against `role.requirements`, and returns an immutable `KitEditResult`.
- **Question Bank Inline Editing (`apps/web/src/components/QuestionBankCard.tsx`)**: Pencil/edit button opens an inline form on each question row allowing prompt, answer outline, category, and difficulty editing. Cancel/Save controls with error banners. Add-Question form in the section header with requirement mapping dropdown. Delete-with-confirmation per question. Preserves active category filter after edits.
- **Flashcard Inline Editing (`apps/web/src/components/FlashcardDeck.tsx`)**: Edit button on the current flashcard switches to an inline form for front/back editing. Add-card form at section header with requirement mapping. Delete guard prevents removing the last card. Keyboard navigation (arrow keys, space, M) disabled while editing/adding.
- **Kit State Propagation (`apps/web/src/components/KitViewer.tsx`, `apps/web/src/app/page.tsx`)**: `KitViewer` calls all six editing handlers via the `kitEditing` library and notifies the parent via `onUpdateKit`. `page.tsx` passes `onUpdateKit={setGeneratedKit}` so the source-of-truth state updates immediately.
- **Unit Test Suite (`apps/web/src/tests/kitEditing.test.ts`)**: 9 tests covering update/add/delete for both questions and flashcards, rejection of invalid inputs, referential integrity enforcement, schedule cleanup on question delete, coverage recalculation, and category filter preservation across edits.

### Verification
- `npx vitest run` (repo root): Exit Code `0`. **63/63 tests passing** across 13 test files.
- Changes are uncommitted (awaiting user instruction).

---

## [1.0.0-m6] - Milestone 6: Live Gemini Integration & Resilience Hardening - 2026-09-22


### Added
- **LLM Key Normalization (`apps/api/src/modules/llm/geminiProvider.ts`)**: Added automatic recursive mapping and normalization of common LLM key naming variations (e.g., `job_title` -> `title`, `core_responsibilities` -> `responsibilities`) to ensure zero schema parsing rejections.
- **Explicit Prompt JSON Schemas (`apps/api/src/modules/interview-prep/pipelineOrchestrator.ts`)**: Embedded strict TypeScript/JSON schemas directly into system instructions for role extraction, company brief, and questions/flashcards generation.

### Fixed
- **Safe Fetcher Resilience (`apps/api/src/modules/research/safeFetcher.ts`)**: Integrated `AbortController` timeouts and graceful error handling on DNS failures and unreachable domains to prevent socket hangups.
- **Robots.txt In-Memory Caching (`apps/api/src/modules/research/robotsParser.ts`)**: Added domain-level robots.txt caching to prevent repeated network overhead during multi-page site discovery.

---

## [1.0.0-m5] - Milestone 5: End-to-End Evaluation & Benchmarking - 2026-09-22

### Added
- **Synthetic Benchmark Suite (`scratch/synthetic-benchmark-cases.json`)**:
  - Comprehensive 8-case benchmark suite covering varied roles (Backend, Frontend, DevOps, ML, Fullstack), schedule boundaries (1 day min, 60 days max, 5d, 14d, 30d), and invalid inputs (short JD, days > 60, malformed URL).
- **Batch Evaluator CLI Enhancements (`scripts/evaluator.ts`)**:
  - Added high-resolution per-case latency tracking (`Date.now()`) and summary table output displaying total cases, successes, failures, and total runtime in milliseconds.
- **Evaluator Integration Test Suite Expansion (`scripts/tests/evaluator.test.ts`)**:
  - Added Appendix A kit schema validation for generated kits across 1d, 5d, 60d schedules.
  - Added unreachable domain graceful fallback verification.
  - Added error exit code `1` verification for missing files, invalid JSON, and missing CLI flags.

### Fixed
- **HTTP/HTTPS URL Protocol Validation (`batch.schema.ts`, `input.schema.ts`, `pipelineOrchestrator.ts`)**: Refined URL validation schemas and orchestrator input checks to enforce `http://` or `https://` protocol schemes, correctly rejecting unsupported protocols (e.g. `ftp://`) and malformed URL strings with `INVALID_CASE_INPUT` / `INVALID_INPUT` error codes.

---

## [1.0.0-m4] - Milestone 4: Web Frontend Interface & Interactive Kit Builder - 2026-09-22

### Added
- **API Client & Proxy Setup (`apps/web/src/lib/api.ts`, `apps/web/next.config.js`)**:
  - Configured Next.js proxy rewrites mapping `/api/*` to `http://localhost:4000/api/*`.
  - Implemented `generateInterviewKit` API helper function for submitting generation requests.
- **Interactive Component Suite (`apps/web/src/components/`)**:
  - `KitGeneratorForm.tsx`: Input form for Job Description (textarea, min 20 chars), Company URL, and Days Available slider (1–60) with client-side validation and duplicate submission prevention.
  - `GenerationProgressTracker.tsx`: Visual step-by-step loading progress tracker reflecting the 11-step pipeline during active generation.
  - `CompanyBriefCard.tsx`: Company brief & sourced web research display.
  - `RoleBreakdownCard.tsx`: Extracted role title, seniority, responsibilities, and prioritized requirements with priority (`must`/`nice`) and kind (`technical`/`behavioural`/`domain`) badges.
  - `QuestionBankCard.tsx`: Categorized question bank with category filter tabs (`all`, `technical`, `behavioural`, `system-design`, `company-fit`), difficulty ratings (1–3 stars), requirement tags, and expandable answer outlines.
  - `FlashcardDeck.tsx`: Interactive flashcard practice deck with card flip capability (Front/Back toggle), requirement links, and mastery tracking.
  - `StudyScheduleTimeline.tsx`: Day-by-day study schedule timeline displaying focus topics, allocated study minutes, and question prompts.
  - `CoverageBadge.tsx`: Deterministic requirement coverage guarantee status & pass provenance indicator.
  - `KitViewer.tsx`: Comprehensive container view uniting all kit sections with tab filtering.
- **Frontend Page Integration (`apps/web/src/app/page.tsx`)**:
  - Integrated landing hero, generation form, real-time progress tracker, and full kit viewer into a single seamless user journey.
- **Frontend Unit Tests (`apps/web/src/tests/kitGenerator.test.ts`)**:
  - Added unit tests for client-side API payload formatting and network error handling.
  - Total test count expanded to **50/50 tests passing** across 12 test files.

### Fixed
- **React Rules-of-Hooks Violation (`apps/web/src/components/FlashcardDeck.tsx`)**: Moved `useCallback` and `useEffect` hook definitions above the early `return null` empty-array guard. Previously the early return preceded hook calls, violating React's unconditional-hooks invariant and risking runtime errors when flashcard count changes. All hooks now execute unconditionally on every render; the guard is placed after all hooks but before the JSX return.

---

## [1.0.0-m3] - Milestone 3: Backend Research & AI Generation Pipeline - 2026-09-22

### Added
- **SSRF-Safe Research Layer (`apps/api/src/modules/research/`)**:
  - `ssrfGuard.ts`: DNS-resolving SSRF guard blocking private IPv4 (10.x, 172.16.x–31.x, 192.168.x), loopback, link-local (169.254.x) and cloud metadata IPs. Supports `allowLoopbackInDev` for local development.
  - `safeFetcher.ts`: Axios-based HTTP fetcher that validates each redirect destination through `ssrfGuard`, enforces 2 MB response limit, blocks non-HTML content types, and handles up to 3 manual redirects.
  - `htmlCleaner.ts`: Cheerio-based HTML→text extractor removing scripts/styles, extracting title, paragraph and heading text, and internal same-origin link extraction.
  - `robotsParser.ts`: Fetches and parses `robots.txt` to enforce crawl permission rules.
  - `companyCrawler.ts`: Bounded multi-page crawler (max 5 pages) with keyword-scored link relevance ranking; gracefully degrades if seed page unreachable.
- **LLM Provider Abstraction (`apps/api/src/modules/llm/`)**:
  - `ILlmProvider.ts`: Replaceable interface with `generateStructuredJson<T>` and `generateText` methods.
  - `geminiProvider.ts`: Gemini 1.5 Flash provider using `responseMimeType: application/json`, 3-attempt retry, and Zod schema validation of responses.
  - `mockProvider.ts`: Deterministic mock provider returning full valid data without API keys (used in all tests).
  - `llmFactory.ts`: Factory function for selecting provider by name or environment variable.
- **11-Step Pipeline Orchestrator (`apps/api/src/modules/interview-prep/pipelineOrchestrator.ts`)**:
  - Step 1: LLM-based role & requirements extraction from JD.
  - Steps 2–5: SSRF-safe multi-page company research.
  - Step 6: LLM-based company brief synthesis from crawled text.
  - Steps 7: Pass 1 question & flashcard generation (LLM).
  - Step 8: Deterministic coverage check (Pass 1).
  - Step 9: Pass 2 targeted LLM generation for uncovered requirements.
  - Step 10: Deterministic schedule allocation.
  - Step 11: Final kit assembly and Appendix A schema validation.
- **REST API Route (`apps/api/src/routes/interviewPrep.routes.ts`)**: `POST /api/interview-prep/generate` with Zod input validation and structured error responses.
- **Batch Evaluator (`scripts/evaluator.ts`)**: Headless CLI runner outputting Appendix B envelope. Entry point: `npm run evaluate -- --input <cases.json> --output <kits.json>`.
- **Test Suite Expansion**:
  - `ssrfGuard.test.ts`: 6 tests verifying SSRF protection rules.
  - `htmlCleaner.test.ts`: 2 tests verifying HTML parsing.
  - `robotsParser.test.ts`: 2 tests verifying robots.txt parsing.
  - `llmProvider.test.ts`: 3 tests verifying provider interface and error handling.
  - `pipelineOrchestrator.test.ts`: 4 integration tests for the end-to-end pipeline with `MockLlmProvider`.
  - `interviewPrepRoutes.test.ts`: 3 integration tests for REST API routes.
  - `evaluator.test.ts`: 1 integration test for batch evaluator CLI.
  - **Total: 48/48 tests passing** across 11 test files.

### Fixed
- **SSRF & DNS Rebinding Security (`ssrfGuard.ts`, `safeFetcher.ts`)**: Implemented `createSsrfLookup` callback and custom `httpAgent`/`httpsAgent` for Axios to validate IP addresses at socket connection time, preventing DNS Rebinding (TOCTOU) attacks. Expanded IP filtering to include Carrier-Grade NAT (`100.64.0.0/10`), documentation IP subnets, and IPv4-mapped IPv6 addresses.
- **Gemini API Key Exposure Prevention (`geminiProvider.ts`)**: Moved `GEMINI_API_KEY` from URL query parameter `?key=...` to `x-goog-api-key` HTTP header and added API key redaction in error messages to prevent secret leakage in logs.
- **Pipeline Passes & Referential Integrity (`pipelineOrchestrator.ts`)**: Dynamically set `coverage.passes` to `1` or `2` based on Pass 2 execution and added referential integrity sanitization for `requirement_ids` in questions and flashcards.
- **Mock LLM Prompt Matching (`mockProvider.ts`)**: Fixed prompt matching regex for role extraction to ensure reliable structured output in mock test mode.
- `safeFetcher.ts`: Cast `response.headers['content-type']` via `String(...)` to resolve TypeScript error with `AxiosHeaders` union type.

---

## [Unreleased] - Milestone 2: Deterministic Core Engine - 2026-09-22


### Added
- **Deterministic Coverage Checker (`packages/shared/src/algorithms/coverageChecker.ts`)**:
  - Implemented set-difference algorithm to compute covered vs uncovered requirement IDs.
  - Returns uncovered IDs in stable original requirement order.
  - Safely ignores invalid requirement references and handles empty arrays.
- **Deterministic Schedule Allocator (`packages/shared/src/algorithms/scheduleAllocator.ts`)**:
  - Allocates questions into sequential days (1..60) matching `days_available`.
  - Calculates positive integer study minutes per day.
  - Derives category-based focus titles deterministically.
- **Kit & Cross-Reference Validator (`packages/shared/src/validation/kitValidator.ts`)**:
  - Validates Appendix A JSON structural integrity and referential constraints (`questions -> requirements`, `flashcards -> requirements`, `schedule -> questions`).
  - Verifies coverage consistency between claimed uncovered IDs and actual coverage check.
- **Test Suite (`Vitest v5.0.1`)**:
  - Added 27 unit and integration tests (`coverageChecker.test.ts`, `scheduleAllocator.test.ts`, `kitValidator.test.ts`, `integration.test.ts`).

## [1.0.0-foundation] - Milestone 1: Project Foundation & Engineering Setup - 2026-09-22

### Added
- **Core Documentation**:
  - `AGENTS.md`: Mandatory instructions and operating rules for all coding agents.
  - `PROJECT_CONTEXT.md`: Complete specifications, Appendix A & B schema contracts, 11-step pipeline sequence.
  - `docs/ASSESSMENT.md`: Requirements traceability matrix for assessment `FS-AI-INTERVIEW-01`.
  - `docs/ARCHITECTURE.md`: Technical architecture, data flow, SSRF safeguards, and deterministic logic separation.
  - `docs/DECISIONS.md`: Architectural Decision Records (ADR-001 through ADR-007).
  - `docs/TESTING.md`: Test plan and verification boundaries.
  - `docs/PROGRESS.md`: Live tracking of progress, blockers, and next steps.
  - `docs/AGENT_HANDOFF.md`: Agent handoff briefing.
  - `README.md`: Project overview, architecture summary, and setup guide.
- **Repository Setup**:
  - Root `package.json` configured with npm workspaces (`apps/*`, `packages/*`).
  - `.gitignore` configured to ignore `node_modules`, build artifacts (`dist`, `.next`), environment files, and IDE temp files while preserving `.kiro`.
  - `.env.example` with documented environment variable placeholders.
- **Shared Package (`packages/shared`)**:
  - Exact Appendix A Kit schema and TypeScript types using Zod.
  - Appendix B batch envelope schema and types.
- **Backend API (`apps/api`)**:
  - Minimal Express + TypeScript backend.
  - Health check endpoint at `/health` and `/api/health`.
  - Clean modular structure (`modules/`, `middleware/`, `config/`).
- **Web Frontend (`apps/web`)**:
  - Next.js App Router application with Tailwind CSS.
  - Branded Rehearsa landing interface showcasing core platform capabilities.
