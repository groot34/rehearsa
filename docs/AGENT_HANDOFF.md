# Agent Handoff Briefing — Rehearsa

> **To the Incoming Coding Agent**: Read this document first, along with [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md) and [`PROJECT_CONTEXT.md`](file:///d:/Assignemt/Rehearsa/PROJECT_CONTEXT.md), before modifying any code.

---

## 1. Project Identity & Assessment Reference

* **Project**: Rehearsa — Full-Stack AI-Powered Interview Preparation Platform
* **Assessment ID**: `FS-AI-INTERVIEW-01` (Trao Assessment)
* **Active Milestone**: `M12.2: Production Deployment Preparation` (COMMITTED + FINALIZED)

---

## 2. Latest Known Repository State

* **Branch**: `main`
* **HEAD Commit**: `9e92eea` — `docs: finalise production deployment preparation`
* **Sync status**: `main` is 2 ahead of `origin/main`; deployment build compatibility fixes are currently uncommitted.
* **Commit history (most recent first)**:
  - `fbb2564` — `feat: prepare production deployment`
  - `13fa78c` — `docs: sync handoff/progress with final M11 state`
  - `240fdf2` — `docs: final handoff/progress update for M11`
  - `b2a5628` — `docs: update handoff and progress for M11 commit`
  - `342e4fd` — `feat: add public interview discussion search`
  - `a4cbbc0` — `feat: restore persisted kit state on fetch`
  - `54a2b9b` — `docs: record end-to-end journey audit`
  - `1981ab6` — `docs: record live MongoDB verification`
  - `d947b87` — `docs: record flashcard confidence tiers implementation` (M10.3 docs)
  - `085cc0f` — `feat: add persisted flashcard confidence tiers` (M10.3 impl)
* **Working Tree**: Contains the uncommitted deployment build compatibility fix.

---

## 3. Completed Verification Evidence

### Automated Tests (mongodb-memory-server — no real DB required)
- `npm test` → Exit Code `0`. **257/257 tests passing** across 20 test files (11 new M11 tests added).
- `npm run build` → Exit Code `0`. All three workspaces compile cleanly.
- `npm run lint` → Exit Code `0`. All workspaces lint cleanly.
- `npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json` → Exit Code `0`. 8 cases: 5 valid kits, 3 isolated invalid, 1519ms. Mock provider used, no external API calls.

### E2E Journey Audit — completed 2026-09-24
**File**: `apps/api/src/routes/tests/e2eJourney.test.ts` — 59 tests, 30 labelled steps.
All verification is API-level (Express + mongodb-memory-server + MockLlmProvider). No browser/UI verification.

Journey steps covered and passing:
1. Health check — `GET /api/health` → 200 (no auth)
2. Registration (Alice) — `POST /auth/register` → 201, token+user, no passwordHash
3. Duplicate registration → 409 `EMAIL_TAKEN`
4. Registration (Bob) → 201
5. Login (Alice, correct) → 200, fresh JWT
6. Login rejection: wrong password + unknown email both → 401 `INVALID_CREDENTIALS` (no enumeration)
7. `GET /auth/me` with token → 200 identity; without token → 401 `MISSING_TOKEN`
8. Kit list + kit save without token → 401
9. Kit generation (MockLlmProvider, public) → 200, full Appendix A kit
10. Appendix A structure validation (source/role/requirements/questions/flashcards/schedule/coverage/referential integrity — 9 assertions)
11. Save kit → 201, `id` returned, no `userId` in response
12. List kits: Alice sees 1; Bob sees 0
13. Open kit by ID → 200, full payload, no internal fields
14. Edit + update kit → 200, new title returned
15. Reload: edited title persisted
16. Question confidence: all 4 tiers + invalid value rejection
17. Question reorder: reverse order success; empty array rejection; duplicate ID rejection
18. Flashcard confidence: easy/medium/hard success; `unknown` rejection; unknown flashcard ID rejection
19. Section regeneration (questions): valid Appendix A kit returned, schedule rebuilt, day count preserved
20. Section regeneration (flashcards + `preserved_ids`): preserved flashcard present, questions unchanged
21. Second kit saved; Alice sees 2 kits
22–25. Ownership isolation: Bob list=0; Bob GET Alice kit=404; Bob PUT=404; Bob DELETE=404; Alice kit intact after all attempts
26. Delete kit 2 → 200; Alice sees 1
27. Delete kit 1 → 200; Alice sees 0
28. Deleted kit → 404 on GET/PUT/DELETE
29. Logout Alice → 200; logout without token → 401 `MISSING_TOKEN`
30. Logout Bob → 200

### Live MongoDB Verification (real Docker MongoDB, real Gemini API key) — completed 2026-09-24
All items below were verified against a live MongoDB instance (Docker) with `MONGODB_URI` and `JWT_SECRET` set in `.env`. No secrets are recorded here.

**Authentication (M8):**
- `POST /api/health` → `{ status: "ok" }` (server up, DB connected)
- `POST /auth/register` → 201 (registration successful; `passwordHash` never returned)
- `POST /auth/register` (duplicate email) → 409 `EMAIL_TAKEN`
- `POST /auth/login` (correct credentials) → 200, JWT issued
- `POST /auth/login` (wrong password) → 401 `INVALID_CREDENTIALS`
- `POST /auth/login` (unknown email) → 401 `INVALID_CREDENTIALS` (no user enumeration)
- `GET /auth/me` (with valid JWT) → 200, authenticated user returned
- `POST /auth/logout` (with valid JWT) → 200, stateless behaviour documented

**Kit Persistence & Ownership Isolation (M9):**
- Live Gemini generation → kit created successfully (full 11-step pipeline)
- `POST /api/kits` → 201, kit saved with `_id`
- `GET /api/kits` → 200, list returned for authenticated user
- `PUT /api/kits/:id` → 200, kit updated; edited question preserved
- `PUT /api/kits/:id/confidence` → 200, question confidence updated
- `PUT /api/kits/:id/reorder` (corrected payload: `{ questionIds: [...] }`) → 200, order persisted
- `PUT /api/kits/:id/flashcard-confidence` (easy, medium, hard) → 200 each
- Multiple kits for same user → both appear in `GET /api/kits` list
- `DELETE /api/kits/:id` → 204/200, kit removed
- **Cross-user isolation (User B cannot access User A's kit):**
  - `GET /api/kits` → empty list (User A's kit not visible)
  - `GET /api/kits/:id` → 404 NOT_FOUND
  - `PUT /api/kits/:id` → 404 NOT_FOUND
  - `DELETE /api/kits/:id` → 404 NOT_FOUND

---

## 4. Important Invariants & Constraints to Uphold

1. **Exact Appendix A Schema**: Do not rename, remove, or alter field types in `KitSchema`.
2. **Deterministic vs. Probabilistic Separation**: Coverage checking and schedule allocation must remain deterministic application code — never delegated to the LLM.
3. **Preservation of Manual Edits**: When regenerating sections (M7B), manually edited questions/flashcards must be preserved without loss.
4. **Security**: All URL crawling is protected via `ssrfGuard.ts`. Never commit API keys or secrets.
5. **Batch Evaluation Command**: `npm run evaluate -- --input <cases.json> --output <kits.json>` — must remain functional at all times.
6. **Generation stays public**: `POST /api/interview-prep/generate` does not require auth (preserves batch evaluator contract). Kit saving requires auth.

---

## 5. Commands to Run Before Modifying Code

```bash
npm test
npm run build
npm run lint
npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json
git status --short --branch
git log -n 5 --oneline --decorate
```

---

## 6. Remaining Gaps / Next Steps

The following items are genuinely outstanding as of 2026-09-24:

1. **Production deployment verification**: No production/cloud deployment has been performed or verified. All verification has been local (Docker MongoDB + local API server on port 4000 + local Next.js on port 3000). **Deployment preparation completed (M12.2)** — see `docs/PROGRESS.md` for deployment configuration files (`render.yaml`), environment variable requirements, and deployment architecture (Vercel + Render + MongoDB Atlas). Repository is ready for deployment but actual deployment and verification have not been performed.

2. **Live Google Custom Search verification**: `IPublicInterviewSearchProvider` abstraction with `MockPublicInterviewSearchProvider` for tests and `GoogleCustomSearchProvider` for production. Mock provider used by default; graceful degradation if provider unavailable. Live external search (Google Custom Search with real API key) not yet verified — requires real credentials and Custom Search Engine ID configuration.

3. ~~**Confidence and order not returned in GET response**~~: **Resolved** — `GET /api/kits/:id` now returns `questionConfidence`, `questionOrder`, and `flashcardConfidence` as optional fields. Frontend restores state on kit open. See ADR-014.

4. ~~**Final project audit**~~: **Resolved** — `apps/api/src/routes/tests/e2eJourney.test.ts` provides a 59-test API-level sequential journey audit covering all 16 documented journey steps.

---

## 7. Workspace Structure

- `packages/shared`: Zod schemas, types, `coverageChecker.ts`, `scheduleAllocator.ts`, `kitValidator.ts`, full test suite.
- `apps/api/src/modules/research/`: SSRF-safe fetcher, HTML cleaner, robots parser, multi-page crawler.
- `apps/api/src/modules/llm/`: `ILlmProvider` interface, `GeminiProvider`, `MockLlmProvider`, `llmFactory`.
- `apps/api/src/modules/interview-prep/`: `pipelineOrchestrator.ts` (11-step pipeline), `sectionRegenerator.ts`, integration tests.
- `apps/api/src/modules/auth/`: `auth.service.ts`, `auth.middleware.ts`, `user.model.ts`, tests.
- `apps/api/src/modules/kits/`: `kit.model.ts`, `kit.service.ts`, tests.
- `apps/api/src/routes/`: `auth.routes.ts`, `kits.routes.ts`, `interviewPrep.routes.ts`, route tests.
- `scripts/evaluator.ts`: Headless batch evaluator with Appendix B envelope output.
- `apps/web/src/lib/kitEditing.ts`: Pure immutable editing functions for questions & flashcards.
- `apps/web/src/lib/auth.tsx`: `AuthProvider` + `useAuth` hook.
- `apps/web/src/components/`: Full kit UI (generator form, progress tracker, interactive flashcard deck, question bank with confidence/reorder, company brief, role breakdown, schedule timeline, saved kits list).
- `render.yaml`: Render deployment configuration for Express API backend.
- `docs/`: Complete 7-document permanent project memory.
