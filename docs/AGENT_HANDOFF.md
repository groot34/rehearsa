# Agent Handoff Briefing — Rehearsa

> **To the Incoming Coding Agent**: Read this document first, along with [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md) and [`PROJECT_CONTEXT.md`](file:///d:/Assignemt/Rehearsa/PROJECT_CONTEXT.md), before modifying any code.

---

## 1. Project Identity & Assessment Reference

* **Project**: Rehearsa — Full-Stack AI-Powered Interview Preparation Platform
* **Assessment ID**: `FS-AI-INTERVIEW-01` (Trao Assessment)
* **Active Milestone**: `Milestone 10.3 — Flashcard Confidence Tiers` (Implemented, tested, committed, and live MongoDB verified)

---

## 2. Latest Known Repository State

* **Branch**: `main`
* **HEAD Commit**: `d947b87` — `docs: record flashcard confidence tiers implementation`
* **Sync status**: `main` is synced with `origin/main` (no unpushed commits as of last check; verify with `git status` before proceeding).
* **Commit history (most recent first)**:
  - `d947b87` — `docs: record flashcard confidence tiers implementation` (M10.3 docs)
  - `085cc0f` — `feat: add persisted flashcard confidence tiers` (M10.3 impl)
  - `c2783c2` — `docs: record question confidence and reordering implementation`
  - `e5cd02c` — `feat: add persisted question reordering` (M10.2)
  - `2bbd21e` — `feat: add persisted question confidence tracking` (M10.1)
  - `9c85498` — `docs: record live M8+M9 verification`
  - `9797d33` — `docs: sync post-commit repository status`
  - `e1b7516` — `docs: update project memory to reflect M8+M9 commit hashes`
  - `8a94003` — `feat(api,web): add persistent user-owned interview kits` (M9)
  - `1a0dfc7` — `feat(api): add user authentication and MongoDB connection` (M8)
* **Working Tree**: A documentation-only commit (`docs: record live MongoDB verification`) is pending. After that commit, the working tree should be clean.

---

## 3. Completed Verification Evidence

### Automated Tests (mongodb-memory-server — no real DB required)
- `npm test` → Exit Code `0`. **180/180 tests passing** across 18 test files.
- `npm run build` → Exit Code `0`. All three workspaces compile cleanly.
- `npm run lint` → Exit Code `0`. All workspaces lint cleanly.
- `npm run evaluate -- --input scratch/synthetic-benchmark-cases.json --output scratch/synthetic-benchmark-output.json` → Exit Code `0`. 8 cases: 5 valid kits, 3 isolated invalid, <3s total.

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

1. **Deployment verification**: No production/cloud deployment has been performed or verified. All verification has been local (Docker MongoDB + local API server on port 4000 + local Next.js on port 3000).

2. **Confidence and order not returned in GET response**: `GET /api/kits/:id` does not currently return `questionConfidence`, `questionOrder`, or `flashcardConfidence`. The frontend tracks these in React session state only; they are lost on page refresh. A follow-up milestone should extend the GET response and load these on kit open.

3. **Public interview discussion search (ASSESSMENT.md §2)**: Marked `In progress`. The multi-page crawler fetches about/careers/culture pages but there is no dedicated search-engine integration for external interview discussion sites (e.g. Glassdoor, Blind). This item requires a decision on whether the crawler alone satisfies the requirement or whether a dedicated search integration is needed.

4. **Final project audit**: End-to-end manual walkthrough of the full user journey (register → generate → save → edit → regenerate section → flashcard practice → delete) has not been formally documented as a completed test.

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
- `docs/`: Complete 7-document permanent project memory.
