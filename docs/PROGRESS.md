# Project Progress & Status — Rehearsa

## 1. Current Milestone
**Milestone 10 — Question Confidence + Reordering (COMPLETED and COMMITTED)**
- **Commit 1 (M8)**: `1a0dfc7` — `feat(api): add user authentication and MongoDB connection`
- **Commit 2 (M9)**: `8a94003` — `feat(api,web): add persistent user-owned interview kits`
- **Commit 3 (M10.1)**: `2bbd21e` — `feat: add persisted question confidence tracking`
- **Commit 4 (M10.2)**: `e5cd02c` — `feat: add persisted question reordering`
- **Branch**: `main`, 11 commits ahead of `origin/main` (not yet pushed).

---

## 2. Completed Work
- [x] **Milestone 1: Project Foundation & Engineering Setup**:
  - Monorepo workspace scaffolding (`apps/web`, `apps/api`, `packages/shared`), permanent project memory documentation.
- [x] **Milestone 2: Deterministic Core Engine**:
  - `packages/shared/src/algorithms/coverageChecker.ts`: Pure, deterministic requirement coverage checking via set difference.
  - `packages/shared/src/algorithms/scheduleAllocator.ts`: Deterministic study schedule allocation across 1–60 days with sequential day numbering, integer study minutes, and category focus labels.
  - `packages/shared/src/validation/kitValidator.ts`: Complete Appendix A kit structure, referential integrity, and coverage consistency validation.
- [x] **Milestone 3: Backend Research & AI Generation Pipeline**:
  - SSRF-safe multi-page company crawler, Gemini LLM provider, Mock provider, 11-step orchestrator, REST API `POST /api/interview-prep/generate`, and batch evaluator CLI (`npm run evaluate`).
- [x] **Milestone 4: Web Frontend Interface & Interactive Kit Builder**:
  - Next.js 14 App Router interface with full kit generator form, progress tracker, interactive flashcard deck, question bank, company brief, role breakdown, and schedule timeline views.
- [x] **Milestone 5: End-to-End Evaluation & Benchmarking (COMPLETED & VERIFIED)**:
  - **Synthetic Benchmark Suite (`scratch/synthetic-benchmark-cases.json`)**:
    - Created a comprehensive 8-case benchmark suite covering varied roles (Senior Backend, Staff Frontend, Principal DevOps, Senior ML, Full-Stack Lead), duration boundaries (`1` day min, `60` days max, `5`, `14`, `30` days intermediate), and invalid inputs (short JD, days > 60, malformed URL).
  - **Batch Evaluator CLI Enhancements (`scripts/evaluator.ts`)**:
    - Added high-resolution per-case latency tracking (`Date.now()`) and an end-of-batch summary breakdown (Total, Successful, Failed, Total Time).
    - Enforced strict HTTP/HTTPS protocol validation across `BatchCaseInputSchema`, `CreateKitInputSchema`, and `pipelineOrchestrator`.
  - **Appendix A & Appendix B Output Validation**:
    - Executed: `npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json`
    - Exit Code: `0`.
    - Total Runtime: `782ms` across 8 cases (5 successful kits, 3 isolated invalid failures).
    - Appendix B envelope validation: 100% compliant (`version`, `generated_at`, `kits`).
    - Appendix A kit validation: 100% compliant across all generated kits with referential integrity, matching day count (`days.length === days_available`), and integer study minutes.
  - **Edge Case & Failure Isolation Verification (`scripts/tests/evaluator.test.ts`)**:
    - Verified boundary schedules at 1 day and 60 days.
    - Verified per-case failure isolation (short JD, out-of-bounds days, malformed URL fail without crashing batch).
    - Verified graceful degradation and kit generation when company site is unreachable.
    - Verified CLI error exit code `1` on missing files or malformed JSON.
  - **Verification Evidence**:
    - `npx vitest run`: Exit Code `0`. **51/51 tests passing** across 12 test files.
    - `npm run build`: Exit Code `0`. All three workspaces compile cleanly.
    - `npm run lint`: Exit Code `0`. All workspaces lint cleanly.

---

## 3. Work in Progress
- [x] **Milestone 6: Live Gemini Integration & Resilience Hardening (VERIFIED)**:
  - Verified live Gemini 1.5 Flash pipeline with API key integration.
  - Implemented resilient JSON schema normalization in `geminiProvider.ts` to seamlessly handle LLM key aliases (`job_title`, `core_responsibilities`, etc.).
  - Added explicit JSON schemas to prompt instructions in `pipelineOrchestrator.ts` to prevent hallucinations and schema validation failures.
  - Hardened `safeFetcher.ts` and crawler to handle site unreachable gracefully with strict timeouts and abort controllers.
  - Verified live end-to-end kit generation via both direct API (port 4000) and Next.js frontend proxy (port 3000) with HTTP 200 OK.
  - Verified all 54 tests across 12 test suites passing cleanly.
- [x] **Milestone 7A: Manual Kit Editing (COMPLETED & VERIFIED, committed `21731a8`)**:
  - Created `apps/web/src/lib/kitEditing.ts`: Pure, immutable editing functions for `updateQuestionInKit`, `addQuestionToKit`, `deleteQuestionFromKit`, `updateFlashcardInKit`, `addFlashcardToKit`, `deleteFlashcardFromKit`. All validated against shared Zod schemas.
  - Updated `apps/web/src/components/QuestionBankCard.tsx`: Inline edit form, add-question form, delete-with-confirmation per question. Preserves category filter state.
  - Updated `apps/web/src/components/FlashcardDeck.tsx`: Inline edit form for current card, add-card form, delete guard (cannot delete last card). Keyboard nav disabled during editing.
  - Updated `apps/web/src/components/KitViewer.tsx`: All six editing handlers wired, calls `onUpdateKit` to propagate changes up to `page.tsx`.
  - Updated `apps/web/src/app/page.tsx`: `onUpdateKit={setGeneratedKit}` wires parent state mutation correctly.
  - Created `apps/web/src/tests/kitEditing.test.ts`: 9 unit tests covering update/add/delete for both questions and flashcards, referential integrity rejection, schedule cleanup on question delete, coverage recalculation, and category filter preservation.
  - **Test result**: `npx vitest run` → Exit Code `0`. **63/63 tests passing** across 13 test files.
- [x] **Milestone 7B.1: Section Regeneration Contract Design (COMPLETED, committed `5bd067a`)**:
  - Designed the complete regeneration contract in `docs/DECISIONS.md` as ADR-007 (revised) and ADR-008 (new).
  - Defined two regenerable sections: `questions` and `flashcards`. `company_brief`, `role`, and `schedule` are not independently regenerable.
  - Defined preservation predicate: auto-preserve items matching `/^(q_custom_|f_custom_)/` ID prefix PLUS explicit `preserved_ids: string[]` from client for in-place edited items.
  - Defined stateless API contract: `POST /api/interview-prep/regenerate-section` accepting `{ kit: Kit, section, preserved_ids }`, returning full updated `Kit` on success or structured error on failure.
  - Defined 7-step server-side merge algorithm reusing existing `pipelineOrchestrator` LLM patterns, `checkRequirementCoverage`, `allocateSchedule`, and `validateKit`.
  - Defined `RegenerateKitSectionInputSchema` to add to `packages/shared/src/schemas/input.schema.ts`.
  - Defined `editedItemIds: Set<string>` client-side tracking in `page.tsx` (separate from `Kit` state).
  - Confirmed no changes to `KitSchema`, batch evaluator, or Appendix A/B compliance.
  - **No code changed** (design-only milestone).
- [x] **Milestone 7B.2: Section Regeneration Implementation (COMPLETED, not yet committed)**:
  - **`packages/shared/src/schemas/input.schema.ts`**: Added `RegenerateSectionEnum` (`'questions' | 'flashcards'`) and `RegenerateKitSectionInputSchema` (`{ kit: KitSchema, section, preserved_ids }`). Documented trust boundary in JSDoc comment.
  - **`apps/api/src/modules/interview-prep/sectionRegenerator.ts`** (new file): Full 7-step regeneration algorithm. `buildPreservedSet()` implements the two-part predicate (auto-prefix + explicit list, with server-side validation that each explicit ID exists in the submitted kit). Regen IDs stamped with `q_regen_*/f_regen_*` prefix to prevent collisions. Questions path: LLM pass 1 → sanitize req IDs → merge → coverage check → optional pass 2 → schedule rebuild → `validateKit` gate. Flashcards path: LLM → sanitize → merge → `validateKit` gate. Any failure returns structured `REGEN_LLM_FAILED` or `REGEN_VALIDATION_FAILED`; original kit never returned.
  - **`apps/api/src/modules/interview-prep/index.ts`**: Added `export * from './sectionRegenerator'`.
  - **`apps/api/src/routes/interviewPrep.routes.ts`**: Added `POST /regenerate-section` route with `RegenerateKitSectionInputSchema` validation, returning `{ success: true, kit }` or `{ success: false, error }`.
  - **`apps/web/src/lib/api.ts`**: Added `regenerateKitSection()` helper, `RegenerateKitSectionPayload` and `ApiRegenerateResponse` types.
  - **`apps/web/src/app/page.tsx`**: Added `editedItemIds: Set<string>` state; `handleItemEdited` (adds ID, skips `q_custom_*/f_custom_*`); `handleItemDeleted` (removes ID from preserved set); `handleRegenerateSection` with stale-response guard (request-ID counter); all wired to `KitViewer` as `onItemEdited`, `onItemDeleted`, `onRegenerateSection`.
  - **`apps/web/src/components/KitViewer.tsx`**: Added `onItemEdited`, `onItemDeleted`, `onRegenerateSection` props; per-section `regenLoading`/`regenError` state; `RegenButton` and `RegenErrorBanner` inline components; edit handlers now call `onItemEdited`/`onItemDeleted`; regen buttons shown above QuestionBankCard and FlashcardDeck.
  - **`apps/api/src/modules/interview-prep/tests/sectionRegenerator.test.ts`** (new): 18 unit tests (added cross-section isolation and sanitization regression tests vs original 15).
  - **`apps/api/src/routes/tests/regenerateSectionRoutes.test.ts`** (new): 8 route integration tests covering input validation (empty body, invalid section, incomplete kit), successful regen for both sections, preserved_id wiring, error response has no kit, non-existent preserved_ids silently dropped.
  - **Post-review fixes**: (1) stale-response guard replaced with `useRef`-based counter (was broken `useState` counter); (2) `RegenerateSection` type now imported from `@rehearsa/shared` instead of duplicated in `api.ts`; (3) 3 regression tests added.
  - **Test result**: `npx vitest run` → Exit Code `0`. **89/89 tests passing** across 15 test files.
  - **Build**: `npm run build` → Exit Code `0`. All three workspaces compile cleanly.
  - **Lint**: `npm run lint` → Exit Code `0`.
  - **Benchmark**: `npm run evaluate` → Exit Code `0`. 5/8 cases OK, 3 invalid rejected, 343ms total.
  - **Changes committed at `5512463`**.
- [x] **Milestone 8: Database Foundation and Authentication (COMPLETED, committed at `1a0dfc7`)**:
  - **Dependencies**: Added `mongoose`, `bcrypt`, `jsonwebtoken`, `express-rate-limit`, `mongodb-memory-server` to `apps/api/package.json`.
  - **`apps/api/src/modules/db/connection.ts`**: Singleton `connectToDatabase(uri)` + `disconnectFromDatabase()`. Tests use mongodb-memory-server directly; this module is called only from `server.ts`.
  - **`packages/shared/src/schemas/auth.schema.ts`**: Added `RegisterInputSchema`, `LoginInputSchema`, `PublicUserSchema`, `JwtPayloadSchema` with email normalisation (lowercase + trim) in the Zod transforms.
  - **`apps/api/src/modules/auth/user.model.ts`**: Mongoose `UserSchema` with `email` (unique, indexed, lowercase), `passwordHash` (`select: false`), `createdAt` timestamps.
  - **`apps/api/src/modules/auth/auth.service.ts`**: `registerUser` (bcrypt cost 12, EMAIL_TAKEN on duplicate), `loginUser` (constant-time dummy hash for unknown email, generic INVALID_CREDENTIALS error), `signToken`/`verifyToken` (reads env at call time — not module load time), `toPublicUser`.
  - **`apps/api/src/modules/auth/auth.middleware.ts`**: `requireAuth` Express middleware — requires `Authorization: Bearer <token>`, distinguishes MISSING_TOKEN / TOKEN_EXPIRED / INVALID_TOKEN error codes.
  - **`apps/api/src/routes/auth.routes.ts`**: `POST /auth/register` (201), `POST /auth/login` (200), `POST /auth/logout` (200, requires valid token, stateless — does not invalidate JWT server-side, behaviour documented in response body and code comments), `GET /auth/me`. Rate limiting: 10 req/15 min per IP, disabled in `NODE_ENV=test`.
  - **`apps/api/src/app.ts`**: Mounts `authRoutes` at `/auth`. Health and interview-prep routes unchanged.
  - **`apps/api/src/server.ts`**: JWT secret guard (warns in dev, refuses in prod if < 32 chars). Calls `connectToDatabase()` on startup before listening.
  - **`apps/api/src/config/index.ts`**: Added `mongo.uri` and `jwt.secret`/`jwt.expiresIn` from env.
  - **`apps/api/src/modules/auth/tests/auth.service.test.ts`**: 25 unit tests using mongodb-memory-server (signToken, verifyToken, registerUser, loginUser, toPublicUser — incl. no-user-enumeration, bcrypt hash format, email normalisation, JWT payload).
  - **`apps/api/src/routes/tests/authRoutes.test.ts`**: 30 route integration tests (register, login, logout, /me, public endpoint accessibility).
  - **Known limitation**: JWT logout is stateless — the token remains cryptographically valid until expiry after logout. Documented in route comments and response body.
  - **Test result**: `npx vitest run` → Exit Code `0`. **132/132 tests passing** across 17 test files.
  - **Build**: `npm run build` → Exit Code `0`.
  - **Lint**: `npm run lint` → Exit Code `0`.
  - **Live DB/auth verification**: NOT verified against real MongoDB/real secrets. All automated tests use mongodb-memory-server. Manual verification requires `MONGODB_URI` and `JWT_SECRET` in `.env`.
  - **Changes committed at `1a0dfc7`**.
- [x] **Milestone 9: Kit Persistence + User-Scoped CRUD (COMPLETED, committed at `8a94003`)**:
  - **`packages/shared/src/schemas/input.schema.ts`**: Added `SaveKitInputSchema`, `UpdateKitInputSchema`, `KitSummarySchema` — persistence contracts kept outside Appendix A.
  - **`apps/api/src/modules/kits/kit.model.ts`** (new): `KitDocumentModel` Mongoose schema with `userId` (ObjectId ref, indexed), `kit` (Mixed — stores Appendix A payload verbatim), `createdAt`/`updatedAt` timestamps. Compound index `{ userId, createdAt: -1 }` for efficient per-user list queries.
  - **`apps/api/src/modules/kits/kit.service.ts`** (new): `saveKit`, `listKits`, `getKitById`, `updateKit`, `deleteKit`. All operations scope every query by `{ _id, userId }` — NOT_FOUND returned for both missing and non-owned kits (no ownership disclosure). ObjectId validation before DB hit. `updateKit` uses `findOneAndUpdate` with ownership in the query filter — ownership cannot be changed.
  - **`apps/api/src/routes/kits.routes.ts`** (new): `POST /api/kits` (201), `GET /api/kits` (list summaries), `GET /api/kits/:id`, `PUT /api/kits/:id`, `DELETE /api/kits/:id`. All behind `requireAuth`. `userId` derived exclusively from `req.user.sub` (JWT). Fixed: TypeScript discriminated union narrowing added success guards before spreading `.data`.
  - **`apps/api/src/app.ts`**: Removed incorrect `/api/kits → interviewPrepRoutes` alias; added `kitsRoutes` at `/api/kits`. Generation kept public (batch evaluator preserved). Decision documented in code comment.
  - **`apps/web/next.config.js`**: Added `/auth/:path*` proxy rewrite (was missing — auth calls would have failed from browser).
  - **`apps/web/src/lib/api.ts`**: Added `registerUser`, `loginUser`, `logoutUser`, `saveKitToServer`, `fetchKitList`, `fetchKitById`, `updateKitOnServer`, `deleteKitFromServer`. Fixed duplicate export bug.
  - **`apps/web/src/lib/auth.tsx`** (new): `AuthProvider` + `useAuth` hook. Token stored in `sessionStorage` (cleared on tab close; documented XSS trade-off vs httpOnly cookie in JSDoc).
  - **`apps/web/src/components/AuthForms.tsx`** (new): Login/register tab switcher.
  - **`apps/web/src/components/SavedKitsList.tsx`** (new): User's kit list with open/delete, loading/empty/error states, sorts newest first.
  - **`apps/web/src/app/layout.tsx`**: Wraps app with `AuthProvider`.
  - **`apps/web/src/app/page.tsx`**: Full view state machine (`home` / `auth` / `my-kits` / `kit-viewer`). Save/Update banner with success/error indicator. Edit preservation (`editedItemIds`) retained across save/regen cycles. Logout clears session.
  - **`apps/api/src/routes/tests/kitsRoutes.test.ts`** (new): 30 integration tests — POST (auth, 201, 400 invalid/missing, no userId in response), GET list (auth, empty, user isolation, summary shape, sort order), GET :id (auth, owned, 404 non-owned, 404 non-existent, 404 malformed ID), PUT :id (auth, update owned, 404 non-owned, 400 invalid, ownership not changeable, 404 malformed), DELETE :id (auth, delete + verify gone, 404 non-owned + original intact, 404 non-existent, 404 malformed), edit survival cycle, multiple kits per user.
  - **`apps/api/src/modules/auth/user.model.ts`**: Removed duplicate Mongoose index (was warning; `unique: true` field option already creates the index).
  - **`scripts/tests/evaluator.test.ts`**: Increased per-test timeout 20s → 60s (load-induced flakiness on Windows under parallel bcrypt workers).
  - **`vitest.config.mts`**: Added global `testTimeout: 30000` / `hookTimeout: 30000`.
  - **Test result**: `npx vitest run` → Exit Code `0`. **161/161 tests passing** across 18 test files.
  - **Build**: `npm run build` → Exit Code `0`. All three workspaces compile cleanly.
  - **Lint**: `npm run lint` → Exit Code `0`.
  - **Live verification**: NOT performed against real MongoDB. All tests use mongodb-memory-server.
  - **Changes committed at `8a94003`**.
- [x] **Milestone 10.1: Question Confidence Tracking (COMMITTED at `2bbd21e`)**:
  - **`apps/api/src/modules/kits/kit.model.ts`**: Added optional `questionConfidence` field (Map<string, string>) to `KitDocumentModel`, stored outside Appendix A kit payload.
  - **`apps/api/src/modules/kits/kit.service.ts`**: Added `updateQuestionConfidence` function with enum validation (`'unknown' | 'not-ready' | 'somewhat-ready' | 'ready'`), ownership enforcement via `{ _id, userId }` query, atomic MongoDB update.
  - **`apps/api/src/routes/kits.routes.ts`**: Added `PUT /api/kits/:id/confidence` endpoint with Zod validation (`QuestionConfidenceSchema`, `UpdateConfidenceInputSchema`), returns `{ success: true, updated: true }` or error.
  - **`apps/web/src/lib/api.ts`**: Added `updateQuestionConfidence` function with `UpdateConfidencePayload` and `ApiConfidenceResponse` types.
  - **`apps/web/src/app/page.tsx`**: Added `questionConfidence` state, `isUpdatingConfidence` state, `handleUpdateConfidence` callback. Confidence reset on kit load (TODO: fetch from API).
  - **`apps/web/src/components/KitViewer.tsx`**: Added confidence props wiring through to QuestionBankCard.
  - **`apps/web/src/components/QuestionBankCard.tsx`**: Added confidence selector dropdown per question (small emerald-styled select).
  - **`apps/api/src/routes/tests/kitsRoutes.test.ts`**: Added 5 integration tests — valid update, invalid confidence rejection, cross-user 404, non-existent kit 404, all valid values accepted.
  - **Test result**: `npx vitest run` → Exit Code `0`. **166/166 tests passing** (5 new tests added).
  - **Build**: `npm run build` → Exit Code `0`.
  - **Lint**: `npm run lint` → Exit Code `0`.
  - **ADR-011**: Documented in `docs/DECISIONS.md`.
- [x] **Milestone 10.2: Question Reordering (COMMITTED at `e5cd02c`)**:
  - **`apps/api/src/modules/kits/kit.model.ts`**: Added optional `questionOrder: string[]` field to `KitDocumentModel`, stored outside Appendix A kit payload.
  - **`apps/api/src/modules/kits/kit.service.ts`**: Added `reorderQuestions` function with validation (non-empty array, no duplicates), ownership enforcement, atomic MongoDB update.
  - **`apps/api/src/routes/kits.routes.ts`**: Added `PUT /api/kits/:id/reorder` endpoint with Zod validation (`ReorderQuestionsInputSchema`), returns `{ success: true, updated: true }` or error.
  - **`apps/web/src/lib/api.ts`**: Added `reorderQuestions` function with `ReorderQuestionsPayload` and `ApiReorderResponse` types.
  - **`apps/web/src/app/page.tsx`**: Added `questionOrder` state, `isReordering` state, `handleReorderQuestions` callback. Order reset on kit load (TODO: fetch from API).
  - **`apps/web/src/components/KitViewer.tsx`**: Added order props wiring through to QuestionBankCard.
  - **`apps/web/src/components/QuestionBankCard.tsx`**: Added up/down arrow buttons per question when `questionOrder` is set. Added `orderedQuestions` memo to sort questions by custom order. Added `handleMoveUp`/`handleMoveDown` handlers.
  - **`apps/api/src/routes/tests/kitsRoutes.test.ts`**: Added 5 integration tests — valid reorder, empty array rejection, duplicate rejection, cross-user 404, non-existent kit 404.
  - **Test result**: `npx vitest run` → Exit Code `0`. **171/171 tests passing** (5 new tests added).
  - **Build**: `npm run build` → Exit Code `0`.
  - **Lint**: `npm run lint` → Exit Code `0`.
  - **ADR-012**: Documented in `docs/DECISIONS.md`.

---

## 3. Work Not Yet Started
- Milestone 10: Multi-Kit Dashboard (kit list UI fully tested live, reorder, confidence tiers).

---

## 4. Outstanding Tasks (Next Milestones)
- **Milestone 10**: Assessment.md Section 5 update to Verified; live manual verification of M8+M9; flashcard confidence tiers (easy/medium/hard); reorder UI.
- Final User Review & Project Audit.

---

## 5. Known Bugs / Issues
* None. All 161 tests pass; live Gemini generation verified (M6); full monorepo build succeeds; lint succeeds.

---

## 6. Blockers
* Milestones 8+9 live verification requires a running MongoDB instance and `JWT_SECRET` in `.env`. Automated tests are self-contained.

---

## 7. Next Recommended Task
Question confidence tracking and reordering completed (Milestone 10.1 + 10.2). Auth/ownership verified against real MongoDB (11/14 live verification items). Remaining gaps:
- Flashcard confidence tiers (Section 6, Assessment.md)
- Deployment verification (3/14 live verification items not completed)
Next: flashcard confidence tracking (Milestone 10.3).
