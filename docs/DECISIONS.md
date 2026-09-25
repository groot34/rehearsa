# Architectural Decision Records (ADR) — Rehearsa

This document records the architectural and engineering decisions made for the Rehearsa project.

---

## Decision Index

| ID | Title | Status | Date |
|---|---|---|---|
| [ADR-001](#adr-001-npm-workspaces-monorepo-structure) | Monorepo Structure with npm Workspaces | Accepted | 2026-09-22 |
| [ADR-002](#adr-002-end-to-end-typescript-architecture) | End-to-End TypeScript Architecture | Accepted | 2026-09-22 |
| [ADR-003](#adr-003-canonical-appendix-a--b-validation-via-zod) | Canonical Appendix A & B Validation via Zod | Proposed | 2026-09-22 |
| [ADR-004](#adr-004-deterministic-coverage-and-schedule-algorithms) | Deterministic Coverage and Schedule Algorithms | Accepted | 2026-09-22 |
| [ADR-005](#adr-005-replaceable-llm-provider-abstraction) | Replaceable LLM Provider Abstraction | Proposed | 2026-09-22 |
| [ADR-006](#adr-006-ssrf-mitigation-and-untrusted-content-sanitization) | SSRF Mitigation and Untrusted Content Sanitization | Proposed | 2026-09-22 |
| [ADR-007](#adr-007-manual-edit-preservation-strategy-during-regeneration) | Manual Edit Preservation Strategy During Regeneration | Accepted | 2026-09-23 |
| [ADR-008](#adr-008-section-regeneration-api-contract) | Section Regeneration API Contract | Accepted | 2026-09-23 |
| [ADR-009](#adr-009-authentication-and-database-architecture) | Authentication and Database Architecture | Accepted | 2026-09-23 |
| [ADR-010](#adr-010-kit-persistence-ownership-and-generation-auth-strategy) | Kit Persistence, Ownership, and Generation Auth Strategy | Accepted | 2026-09-23 |
| [ADR-011](#adr-011-question-confidence-tracking-persistence) | Question Confidence Tracking Persistence | Accepted | 2026-09-24 |
| [ADR-012](#adr-012-question-reordering-persistence) | Question Reordering Persistence | Accepted | 2026-09-24 |
| [ADR-013](#adr-013-flashcard-confidence-tiers-persistence) | Flashcard Confidence Tiers Persistence | Accepted | 2026-09-24 |
| [ADR-014](#adr-014-return-m10-persistence-metadata-in-get-apikitsid-response) | Return M10 Persistence Metadata in GET /api/kits/:id Response | Accepted | 2026-09-24 |
| [ADR-015](#adr-015-public-interview-discussion-search-provider-abstraction) | Public Interview Discussion Search Provider Abstraction | Accepted | 2026-09-24 |
| [ADR-016](#adr-016-production-deployment-architecture) | Production Deployment Architecture | Accepted | 2026-09-24 |
| [ADR-017](#adr-017-production-build-toolchain-compatibility) | Production Build Toolchain Compatibility | Accepted | 2026-09-25 |
| [ADR-018](#adr-018-declare-api-runtime-type-dependencies) | Declare API Runtime Type Dependencies | Accepted | 2026-09-25 |
| [ADR-019](#adr-019-llm-requirement-kind-robustness-and-normalization) | LLM Requirement Kind Robustness and Normalization | Accepted | 2026-09-25 |
| [ADR-020](#adr-020-tavily-search-provider-for-public-interview-discussions) | Tavily Search Provider for Public Interview Discussions | Accepted | 2026-09-25 |
| [ADR-021](#adr-021-express-trust-proxy-for-render-reverse-proxy-deployment) | Express Trust Proxy for Render Reverse-Proxy Deployment | Accepted | 2026-09-25 |

---

### ADR-001: Monorepo Structure with npm Workspaces

* **Status**: Accepted
* **Date**: 2026-09-22
* **Context**:
  Rehearsa requires a web frontend (`apps/web`), an API backend (`apps/api`), shared schemas/types (`packages/shared`), and a standalone batch evaluation CLI (`scripts/evaluator.ts`). Managing disparate repos would introduce schema sync issues and complex cross-dependency management during evaluation.
* **Alternatives Considered**:
  - Polyrepo (separate frontend and backend repositories).
  - Single monolithic Express app serving server-side rendered HTML (e.g. EJS).
  - Next.js full-stack app (API routes inside Next.js).
* **Decision**:
  Adopt an npm workspaces monorepo structure (`apps/web`, `apps/api`, `packages/shared`).
* **Reasoning**:
  - npm workspaces is natively supported by Node.js/npm without needing external tools like Turbo or Nx.
  - Keeps frontend presentation separated from backend orchestration as required by assessment guidelines.
  - Allows the batch CLI (`npm run evaluate`) to import core shared pipeline modules directly.
* **Trade-offs**:
  - Slightly more initial setup overhead than a single-directory repo.

---

### ADR-002: End-to-End TypeScript Architecture

* **Status**: Accepted
* **Date**: 2026-09-22
* **Context**:
  The assessment allows JavaScript or TypeScript. The data structures defined in Appendix A and B have strict structural constraints and referential integrity requirements.
* **Alternatives Considered**:
  - Plain JavaScript with JSDoc annotations.
* **Decision**:
  Use TypeScript across all packages (`apps/web`, `apps/api`, `packages/shared`, and `scripts/`).
* **Reasoning**:
  - Provides compile-time safety across frontend, backend, and batch scripts.
  - Guarantees exact conformity to Appendix A and B schemas without runtime guessing.
  - Prevents common bugs in referential integrity (`requirement_ids` matching `role.requirements`).
* **Trade-offs**:
  - Requires build/transpilation step via `tsc` or `tsx` during development.

---

### ADR-003: Canonical Appendix A & B Validation via Zod

* **Status**: Proposed
* **Date**: 2026-09-22
* **Context**:
  Every generated prep kit must pass strict validation against the Appendix A schema, and batch outputs must conform to Appendix B.
* **Alternatives Considered**:
  - Hand-crafted manual JSON validator functions.
  - JSON Schema with Ajv.
* **Decision**:
  Use `zod` in `packages/shared` to define the single source of truth for both runtime validation and TypeScript static type inference.
* **Reasoning**:
  - Type inference (`z.infer<typeof KitSchema>`) guarantees static types and runtime validation never drift.
  - Zod provides clear, structured validation error messages for debugging malformed LLM outputs.
* **Trade-offs**:
  - Adds `zod` as a lightweight dependency.

---

### ADR-004: Deterministic Coverage and Schedule Algorithms

* **Status**: Accepted
* **Date**: 2026-09-22
* **Context**:
  The assessment explicitly forbids delegating coverage checking and study schedule distribution to the LLM.
* **Alternatives Considered**:
  - Asking the LLM in the prompt to summarize which requirements were missed and create a daily schedule.
* **Decision**:
  Implement deterministic algorithms in application code:
  - **Coverage Checker**: Set difference between `role.requirements[].id` and all `questions[].requirement_ids`.
  - **Schedule Allocator**: Multi-day bin-packing distributing questions evenly across the user's `days_available` (1–60) while clustering topics and calculating daily study minutes.
* **Reasoning**:
  - Fulfills the explicit assessment requirement (Pipeline steps 8 and 10).
  - Guarantees 100% mathematical reliability without LLM hallucinations or day count drift.
* **Trade-offs**:
  - Requires dedicated algorithmic unit tests for boundary conditions (e.g., 1 day vs 60 days, 0 questions, uneven categories).

---

### ADR-005: Replaceable LLM Provider Abstraction

* **Status**: Proposed
* **Date**: 2026-09-22
* **Context**:
  The assessment specifies using an LLM provider with a genuine free tier, keeping the provider replaceable, and never assuming unlimited credits.
* **Alternatives Considered**:
  - Hard-coding direct OpenAI SDK calls.
  - Direct LangChain/LlamaIndex dependency.
* **Decision**:
  Define a minimal `ILlmProvider` interface in `apps/api/src/modules/llm/` supporting structured JSON generation. Provide adapters for Google Gemini (`@google/genai` or REST API) and Groq / OpenAI-compatible endpoints.
* **Reasoning**:
  - Enables effortless switching between free-tier providers without touching the 11-step pipeline orchestration logic.
  - Avoids heavy orchestration frameworks while maintaining full control over prompts and error handling.
* **Trade-offs**:
  - Custom retry and exponential backoff logic must be maintained.

---

### ADR-006: SSRF Mitigation and Untrusted Content Sanitization

* **Status**: Proposed
* **Date**: 2026-09-22
* **Context**:
  The application crawls arbitrary user-submitted company URLs. This presents a high risk of SSRF (accessing internal clouds/loopback), DoS via oversized downloads, and prompt injection attacks.
* **Alternatives Considered**:
  - Plain `fetch()` with no DNS or size checks.
  - Third-party crawling API (e.g. Firecrawl, Apify) - rejected due to paid/credit requirements.
* **Decision**:
  Build a dedicated `SafeFetcher` module:
  - Validates URL syntax and protocol (`http:` / `https:`).
  - Resolves DNS and blocks private/loopback IP ranges in production (while allowing mock servers in local test mode).
  - Caps streamed response size to 2MB.
  - Respects `robots.txt` disallow paths.
  - Wraps crawled HTML/text in prompt isolation tags (`<untrusted_content>`).
* **Reasoning**:
  - Prevents severe security vulnerabilities and complies directly with assessment security criteria.
* **Trade-offs**:
  - Requires DNS pre-resolution step before establishing HTTP connection.

---

### ADR-007: Manual Edit Preservation Strategy During Regeneration

* **Status**: Accepted (superseded by ADR-008 for implementation detail)
* **Date**: 2026-09-22 (revised 2026-09-23)
* **Context**:
  Users can manually edit, add, or delete questions and flashcards via the M7A kitEditing library. When regenerating a section, those edits must survive. The kit's canonical Appendix A schema (`KitSchema`) must remain unmodified — adding tracking flags directly to `KitSchema` would violate the schema contract and break batch evaluation.
* **Alternatives Considered**:
  - Storing a separate shadow copy of original vs user-edited kits (too complex, requires persistence).
  - Embedding `is_custom`/`is_edited` flags inside `KitSchema` fields (breaks Appendix A compliance).
  - Trusting ID prefix alone (`q_custom_*` / `f_custom_*`) without an explicit client-supplied list (misses in-place edits that retain their original IDs like `q1`).
* **Decision**:
  Use a **two-part preservation predicate** evaluated at request time, outside the `KitSchema`:
  1. **Auto-preserved by ID prefix**: Any item whose `id` matches `/^(q_custom_|f_custom_)/` is always preserved — these were added by the user via `addQuestionToKit` / `addFlashcardToKit`.
  2. **Explicitly preserved by client list**: The request carries a `preserved_ids: string[]` array. The client frontend tracks which original-ID items (e.g. `q1`, `f2`) the user has edited, and includes them here.
  
  `KitSchema` is never modified. The `preserved_ids` parameter is a request input, not kit state.
* **Reasoning**:
  - Keeps Appendix A schema clean and batch-evaluation-compatible.
  - The two-part predicate covers both user-added items (identified by prefix) and user-edited items (identified by explicit list), with no schema pollution.
  - Stateless by design: the client holds the source of truth (React state) and sends the full current kit plus its preservation intent on each request.
* **Trade-offs**:
  - The client must maintain a `Set<string>` of edited item IDs in React state. This is a small addition to `page.tsx` / `KitViewer.tsx` state management.
  - If the user refreshes their browser, edited-ID tracking is lost. However, since there is no persistence layer in scope, this is acceptable — the user would need to regenerate from scratch anyway.

---

### ADR-008: Section Regeneration API Contract

* **Status**: Accepted
* **Date**: 2026-09-23
* **Context**:
  Milestone 7B requires a backend endpoint to regenerate individual kit sections (questions or flashcards) without rebuilding the entire kit, while preserving manual edits. The design must be consistent with the existing stateless architecture, the 11-step pipeline reuse strategy, and Appendix A compliance.

---

#### 1. Regenerable Sections

Only two sections can be independently regenerated without re-running the full 11-step pipeline:

| Section | Regenerable? | Reason |
|---|---|---|
| `questions` | **Yes** | Self-contained LLM generation step (pipeline step 6/9), all inputs (role, company brief) already exist in the kit |
| `flashcards` | **Yes** | Self-contained LLM generation step (pipeline step 7), same inputs available |
| `company_brief` | **No** | Requires re-crawling the company URL (network I/O, not just LLM) — out of scope for M7B |
| `role` | **No** | Re-extraction changes requirement IDs, invalidating all existing questions/flashcards/schedule |
| `schedule` | **No** | Fully deterministic from questions — automatically recalculated after question regeneration, not independently regenerable |

---

#### 2. API Endpoint

```
POST /api/interview-prep/regenerate-section
Content-Type: application/json
```

**Request body** (validated via `RegenerateKitSectionInputSchema` in `packages/shared/src/schemas/input.schema.ts`):

```typescript
{
  kit: Kit;                        // Full current Appendix A kit (client-owned state)
  section: 'questions' | 'flashcards';
  preserved_ids: string[];         // IDs of items the client wants preserved through regen
}
```

**Success response** (`HTTP 200`):

```typescript
{
  success: true;
  kit: Kit;   // Full updated Appendix A kit — replaces client's in-memory state
}
```

**Failure response** (`HTTP 400` or `HTTP 500`):

```typescript
{
  success: false;
  error: {
    code: 'REGEN_INVALID_INPUT' | 'REGEN_LLM_FAILED' | 'REGEN_VALIDATION_FAILED';
    message: string;
    details?: unknown;
  };
}
```

On failure, the client retains its existing kit unchanged. The server never mutates the client's kit — it returns a new one or an error.

---

#### 3. Preservation Rules

The **effective preserved set** for a regeneration request is:

```
preserved = { id | id ∈ preserved_ids }
           ∪ { id | id.startsWith('q_custom_') || id.startsWith('f_custom_') }
```

Applied per section:
- **questions regeneration**: Items in `kit.questions` whose `id` is in `preserved` are carried forward unchanged. All other questions are discarded and replaced by new LLM-generated content.
- **flashcards regeneration**: Same logic applied to `kit.flashcards`.
- Items in the **other section** (not being regenerated) are never touched.

---

#### 4. Server-Side Regeneration Algorithm (7 steps)

For `section = 'questions'`:

1. **Extract preserved questions**: `preservedQuestions = kit.questions.filter(q => preserved.has(q.id))`
2. **LLM generation**: Call `provider.generateStructuredJson` with the same Pass 1 prompt pattern from `pipelineOrchestrator.ts`, passing `kit.role.requirements` and `kit.company_brief.summary` as context. De-duplicate IDs against `preservedQuestions`.
3. **Sanitize**: Strip any `requirement_ids` referencing IDs not in `kit.role.requirements`.
4. **Merge**: `mergedQuestions = [...preservedQuestions, ...newQuestions]`
5. **Deterministic coverage check**: `checkRequirementCoverage(kit.role.requirements, mergedQuestions)`. If uncovered requirements remain, run a Pass 2 targeted LLM call for them (same pattern as pipeline step 9).
6. **Deterministic schedule reallocation**: `allocateSchedule({ days_available: kit.schedule.days_available, questions: mergedQuestions, role_title: kit.role.title })`. This always runs after question regeneration to keep `schedule.days[].question_ids` referentially valid.
7. **Full kit validation**: `validateKit(candidateKit)`. If it fails, return `REGEN_VALIDATION_FAILED` — do **not** return a partially invalid kit.

For `section = 'flashcards'`:

Steps 1–4 are identical (applied to flashcards). Steps 5–6 are skipped (flashcards don't affect coverage or schedule). Step 7 still runs.

---

#### 5. Referential Integrity Guarantees

- New LLM-generated item IDs use a prefix scheme (`q_regen_<timestamp>_<rand>` / `f_regen_<timestamp>_<rand>`) to avoid colliding with preserved IDs.
- All `requirement_ids` in new items are sanitized against `kit.role.requirements` before merge (same pattern as `pipelineOrchestrator.ts` step 4).
- The schedule is fully recomputed from the merged question array — no stale `question_ids` references can survive.
- `validateKit()` enforces all Appendix A referential integrity rules as a final gate before returning.

---

#### 6. Failure Isolation

| Failure scenario | Behaviour |
|---|---|
| LLM call fails or returns unparseable JSON | Return `REGEN_LLM_FAILED`; client keeps existing kit |
| LLM generates items with all-invalid `requirement_ids` | Sanitization produces empty `requirement_ids`; Pass 2 runs for uncovered reqs; kit may still be valid |
| Merged kit fails `validateKit()` | Return `REGEN_VALIDATION_FAILED`; client keeps existing kit |
| Invalid request body | Return `REGEN_INVALID_INPUT` with validation detail |
| Preserved items have IDs not found in the sent kit | Silently ignored — only items actually present in `kit.questions`/`kit.flashcards` are preserved |

The existing kit is **never destroyed by a failed regeneration**. The client holds the source of truth in React state and only replaces it on a `success: true` response.

---

#### 7. Input Schema Addition

Add to `packages/shared/src/schemas/input.schema.ts`:

```typescript
export const RegenerateSectionEnum = z.enum(['questions', 'flashcards']);
export type RegenerateSection = z.infer<typeof RegenerateSectionEnum>;

export const RegenerateKitSectionInputSchema = z.object({
  kit: KitSchema,
  section: RegenerateSectionEnum,
  preserved_ids: z.array(z.string()).default([]),
});
export type RegenerateKitSectionInput = z.infer<typeof RegenerateKitSectionInputSchema>;
```

This schema lives in `@rehearsa/shared` so it can be imported by both the backend route handler and future frontend API client code.

---

#### 8. Frontend Tracking (client-side only — not in KitSchema)

`page.tsx` will maintain a `editedItemIds: Set<string>` state variable (separate from `generatedKit`). When `KitViewer` calls `onUpdateKit` after an edit via `updateQuestionInKit` or `updateFlashcardInKit`, `page.tsx` also adds the edited item's original ID to `editedItemIds`. This set is passed as `preserved_ids` to the regeneration API call. It is never persisted to the server — it lives only in the React session.

---

#### 9. Appendix A & Batch Evaluation Compatibility

- `KitSchema` is not modified. The regeneration endpoint accepts and returns canonical Appendix A kits.
- The batch evaluator (`scripts/evaluator.ts`) does not call the regeneration endpoint — it only uses `executeGenerationPipeline`. No batch evaluation changes are needed.
- The regeneration endpoint is purely additive — it adds a new route and a new shared schema type without modifying any existing exports.

---

* **Alternatives Considered**:
  - **Server-sent events (SSE) streaming for regen progress**: Rejected for M7B — adds complexity; the regen call is fast enough (single LLM pass vs 11 steps) that a simple synchronous POST is sufficient.
  - **Separate `RegeneratedKit` type wrapping `Kit` with tracking metadata**: Rejected — adds type complexity; the tracking concern is entirely at the request layer, not the kit layer.
  - **Regenerating only within a category (e.g. only `technical` questions)**: Deferred — the current design regenerates the full section and preserves user items; category-scoped regeneration can be added later by filtering `preservedQuestions` by category.

* **Trade-offs**:
  - The client sends the full kit JSON in the request body (potentially ~10–30 KB). This is acceptable given the `2mb` express body limit already in place.
  - `editedItemIds` tracking in React state is lost on browser refresh. Without a persistence layer this is unavoidable and acceptable.
  - Regenerating questions also rebuilds the schedule, which may reorder study days. Users should be informed via UI that the schedule will refresh.

---

### ADR-009: Authentication and Database Architecture

* **Status**: Accepted
* **Date**: 2026-09-23
* **Context**:
  The assessment mandates user registration, login, and strict kit ownership isolation (users can only access their own kits). This requires a persistent user store and a session mechanism. The assessment specification (`PROJECT_CONTEXT.md`, `ARCHITECTURE.md`) explicitly names MongoDB and JWT.

---

#### Technology Choices (all driven by existing specification — no new decisions required)

| Concern | Choice | Source |
|---|---|---|
| Database | MongoDB (via Mongoose ODM) | `ARCHITECTURE.md` specifies "MongoDB (Mongoose or native driver)" |
| Password hashing | bcrypt, cost factor 12 | `ARCHITECTURE.md` specifies bcrypt |
| Session mechanism | JWT in `Authorization: Bearer` header | `ARCHITECTURE.md` specifies JWT |
| Token transport | HTTP Authorization header (not cookie) | Simpler for stateless API; avoids CSRF for non-browser clients |
| Input validation | Zod (existing project convention) | Consistent with `packages/shared` pattern |
| Rate limiting | `express-rate-limit` (10 req/15 min per IP on auth endpoints) | Prevents credential stuffing; disabled in `NODE_ENV=test` |
| In-memory test DB | `mongodb-memory-server` | Allows fully isolated automated tests without a real MongoDB instance |

---

#### Security Decisions

1. **Password hashing**: bcrypt with cost factor 12. Plaintext passwords are never stored, logged, or returned.
2. **`passwordHash` field exclusion**: Mongoose schema marks `passwordHash` as `select: false`. It is excluded from all query results by default; must be explicitly selected with `.select('+passwordHash')` only when needed for verification.
3. **No user enumeration**: `loginUser` returns the same `INVALID_CREDENTIALS` error code and message for both wrong password and unknown email. A constant-time dummy bcrypt comparison runs even when the user is not found, preventing timing-based enumeration.
4. **Email normalisation**: Email is lowercased and trimmed in the Zod schema transform before any DB operation, ensuring `Alice@Example.COM` and `alice@example.com` are treated identically.
5. **JWT secret at call time**: `signToken`/`verifyToken` read `process.env.JWT_SECRET` at function call time (not at module load time). This prevents a subtle test isolation bug where the config module is evaluated before `beforeAll` sets the env var.
6. **JWT secret guard in `server.ts`**: Warns in development and refuses to start in production if `JWT_SECRET` is missing or shorter than 32 characters.
7. **MongoDB URI redaction**: The connection URI is logged with credentials replaced by `<credentials>` to prevent accidental secret exposure in logs.

---

#### Stateless JWT Logout — Known Limitation

`POST /auth/logout` requires a valid JWT (enforced by `requireAuth`) and returns 200, signalling the client to discard its token. **The token is NOT invalidated server-side.** It remains cryptographically valid until its `exp` claim is reached.

*Why accepted*: Adding a server-side token blocklist requires persistent storage per token (Redis or a DB collection), adds latency to every authenticated request, and is not required by the assessment. The short `JWT_EXPIRES_IN` default (`7d`) limits the exposure window. A blocklist can be added in a future milestone if the assessment or security requirements demand it.

*Documented in*: route comment, response body message, CHANGELOG.md, PROGRESS.md.

---

#### App Factory vs Server Separation

`createApp()` in `app.ts` mounts all routes but does **not** call `connectToDatabase()`. The DB connection is called only from `server.ts` (the process entry point). This keeps `createApp()` synchronous and testable — route integration tests can call `createApp()` and connect to `mongodb-memory-server` independently without touching the production DB connection path.

* **Trade-offs**: Tests must manage their own Mongoose connection lifecycle (`beforeAll` connect, `afterAll` disconnect). This is handled consistently in both test files.

---

### ADR-010: Kit Persistence, Ownership, and Generation Auth Strategy

* **Status**: Accepted
* **Date**: 2026-09-23
* **Context**:
  Milestone 9 adds kit persistence to MongoDB. The assessment requires strict per-user kit isolation. A key architectural decision is whether kit *generation* also requires authentication, or only kit *saving*.

---

#### Decision: Generation is public; saving requires auth

**Rationale:**
- The batch evaluator CLI (`npm run evaluate`) calls `POST /api/interview-prep/generate` directly without any user credentials. Making generation require auth would break the mandatory Appendix B evaluation contract.
- The assessment explicitly requires the batch evaluator to work. Forcing auth onto the generation endpoint would require all benchmark test cases to include JWT tokens — contradicting the existing `BatchCaseInputSchema`.
- Separation of concerns: generation is a stateless pipeline operation; persistence is stateful and user-scoped.

**Implementation:**
- `POST /api/interview-prep/generate` and `POST /api/interview-prep/regenerate-section` remain public.
- `POST /api/kits`, `GET /api/kits`, `GET /api/kits/:id`, `PUT /api/kits/:id`, `DELETE /api/kits/:id` all require a valid JWT.
- The decision is documented in `app.ts` via a code comment.

---

#### Kit Document Schema — Mixed type for Appendix A payload

**Rationale:**
The Appendix A `KitSchema` is already defined and validated in `packages/shared`. Re-declaring it as a Mongoose subdocument schema would create a second schema to maintain in sync. Using `Schema.Types.Mixed` stores the payload verbatim and delegates validation to Zod at the application layer (before save and on load).

**Trade-offs:**
- Mongoose does not validate the `kit` field structure — Zod does. If Zod validation is skipped, a malformed kit could be written. The route handler always runs `KitSchema.safeParse` via `SaveKitInputSchema`/`UpdateKitInputSchema` before calling the service.
- `Schema.Types.Mixed` fields are not automatically marked dirty on deep mutation. Since all saves pass in a complete new object (not in-place mutating the Mongoose document), this is not an issue in practice.

---

#### Ownership Enforcement — Compound query filter

All kit service functions use `{ _id: new ObjectId(kitId), userId: new ObjectId(userId) }` as the MongoDB query filter. This ensures ownership is enforced at the database level — not just in application logic — so even a bug bypassing the application check would not return another user's kit.

NOT_FOUND (404) is returned for both missing and non-owned kits, avoiding ownership disclosure (the caller cannot tell whether a kit exists for another user).

---

#### Frontend Token Storage — sessionStorage

JWT is stored in `sessionStorage` rather than `localStorage` or a server-set `httpOnly` cookie.

- `sessionStorage` is cleared when the browser tab closes, limiting token exposure.
- Unlike `httpOnly` cookies, it is readable by JavaScript on the same origin (XSS risk).
- Unlike `localStorage`, it does not persist across tab restarts.
- A new tab opened from the page does not inherit the session (per-tab storage).

This is an accepted trade-off for a client-rendered SPA without a BFF. An `httpOnly` cookie approach would be preferred in a production hardening pass. Documented in `apps/web/src/lib/auth.tsx`.

---

### ADR-011: Question Confidence Tracking Persistence

* **Status**: Accepted
* **Date**: 2026-09-24
* **Context**:
  Users need to track their confidence/readiness for individual interview questions. This state must persist across page refreshes and kit reloads, remain scoped to the authenticated user's kit, and not break the Appendix A schema or existing kits without confidence data.
* **Alternatives Considered**:
  - Adding confidence field directly to `QuestionSchema` in Appendix A.
  - Storing confidence in a separate collection with foreign keys.
  - Frontend-only localStorage (not user-scoped, not shared across devices).
* **Decision**:
  Add an optional `questionConfidence` field to `KitDocumentModel` (outside the Appendix A `kit` payload). Use a small explicit enum: `'unknown' | 'not-ready' | 'somewhat-ready' | 'ready'`. Provide a dedicated authenticated API endpoint `PUT /api/kits/:id/confidence` for updates.
* **Reasoning**:
  - Storing outside Appendix A preserves schema compliance and batch evaluation compatibility.
  - Optional field ensures existing kits without confidence remain valid.
  - Dedicated endpoint enables targeted atomic updates without replacing the full kit.
  - Ownership enforced at the service layer via `{ _id, userId }` query filter.
* **Trade-offs**:
  - Confidence is not returned in the current `GET /api/kits/:id` response (requires extending the response schema to include it).
  - Frontend tracks confidence in React state during the session; a full implementation would fetch it on kit load.

---

### ADR-012: Question Reordering Persistence

* **Status**: Accepted
* **Date**: 2026-09-24
* **Context**:
  Users need to change the order of questions in their interview kits. The order must persist across reloads, remain user-scoped, and not break Appendix A or existing kits without explicit order.
* **Alternatives Considered**:
  - Modifying the order of the `questions` array in Appendix A (breaks schema invariants).
  - Adding an `order` field to each question object (pollutes schema).
  - Using drag-and-drop libraries (adds dependency weight).
* **Decision**:
  Add an optional `questionOrder: string[]` field to `KitDocumentModel` (outside the Appendix A `kit` payload). Store an ordered array of question IDs. Provide a dedicated authenticated API endpoint `PUT /api/kits/:id/reorder` that validates the order (non-empty, no duplicates) and persists it atomically. Frontend provides simple up/down buttons per question.
* **Reasoning**:
  - Storing order outside Appendix A preserves schema compliance.
  - Array of IDs is a simple, deterministic representation.
  - Dedicated endpoint validates integrity before persistence.
  - Simple up/down UI avoids drag-and-drop library dependency.
  - Ownership enforced at the service layer.
* **Trade-offs**:
  - Order is not currently returned in `GET /api/kits/:id` (frontend tracks it in session state).
  - If a question is deleted from the kit, its ID remains in the order array (a cleanup step would be needed on regeneration or explicit reordering).

---

### ADR-013: Flashcard Confidence Tiers Persistence

* **Status**: Accepted
* **Date**: 2026-09-24
* **Context**:
  The Flashcard Practice Mode assessment requirement (Section 6) specifies recording confidence levels per card with three tiers: easy, medium, hard. This replaces the previous binary "mastered" toggle. The state must persist across page refreshes and kit reloads, remain scoped to the authenticated user's kit, and not break the Appendix A schema or existing kits without confidence data.
* **Alternatives Considered**:
  - Adding confidence field directly to `FlashcardSchema` in Appendix A.
  - Storing confidence in a separate collection with foreign keys.
  - Frontend-only localStorage (not user-scoped, not shared across devices).
  - Extending the existing binary `masteredIds` pattern (inadequate for three-tier granularity).
* **Decision**:
  Add an optional `flashcardConfidence` field to `KitDocumentModel` (outside the Appendix A `kit` payload). Use a three-tier enum: `'easy' | 'medium' | 'hard'`. Provide a dedicated authenticated API endpoint `PUT /api/kits/:id/flashcard-confidence` for updates. Replace the binary mastered toggle in `FlashcardDeck.tsx` with three confidence buttons (Easy / Medium / Hard) and update the summary header to show distribution counts instead of a single mastered count.
* **Reasoning**:
  - Storing outside Appendix A preserves schema compliance and batch evaluation compatibility.
  - Optional field ensures existing kits without flashcard confidence remain valid.
  - Dedicated endpoint enables targeted atomic updates without replacing the full kit.
  - Ownership enforced at the service layer via `{ _id, userId }` query filter.
  - Flashcard ID validation ensures only cards actually present in the kit can receive confidence updates.
  - Three-tier UI provides finer-grained self-assessment than binary mastery.
* **Trade-offs**:
  - Flashcard confidence is returned in `GET /api/kits/:id` as an optional field (added in ADR-014). Frontend restores state on kit open.
  - The old binary mastered interaction is removed — there is no fallback to the previous UI pattern.
  - Frontend falls back to default array order when `questionOrder` is empty or undefined.

---

### ADR-014: Return M10 Persistence Metadata in GET /api/kits/:id Response

* **Status**: Accepted
* **Date**: 2026-09-24
* **Context**:
  Milestones 10.1–10.3 added three persistence fields to `KitDocumentModel` outside the Appendix A payload: `questionConfidence` (Map), `questionOrder` (string[]), and `flashcardConfidence` (Map). Dedicated `PUT` endpoints were implemented to update these fields atomically. However, `GET /api/kits/:id` was not updated to return them. The frontend `page.tsx` `handleOpenKit` therefore reset all three maps to empty values on every kit reload, with TODO comments noting the gap. As a result, any confidence ratings or custom question order set by the user were silently lost whenever they navigated away and reopened the kit.

* **Investigation findings**:
  - The gap is a genuine consistency issue, not an intentional trade-off. ADR-011, ADR-012, and ADR-013 each noted the limitation but deferred the fix.
  - No Appendix A schema change is required — the three fields live outside `kit.*`.
  - No ownership/security risk — `getKitById` already enforces `{ _id, userId }` ownership at the database level. Adding fields to the response of an already-ownership-gated endpoint does not weaken isolation.
  - Mongoose stores `Map`-type fields as ES6 `Map` instances. `JSON.stringify` does not serialise `Map` natively, so conversion to plain `Record<string, string>` is required before returning.
  - An empty `questionOrder` array is treated as absent (fields are omitted when no custom order has been set), matching the Mongoose schema `default: undefined`.

* **Decision**:
  Extend `getKitById` in `kit.service.ts` to include `questionConfidence`, `questionOrder`, and `flashcardConfidence` as optional fields in the returned `KitFetchData` object. Convert Mongoose `Map` instances to plain `Record` objects for JSON serialisation. Extend `SavedKitMeta` in `apps/web/src/lib/api.ts` to forward these fields. Update `handleOpenKit` in `apps/web/src/app/page.tsx` to restore state from the API response (`?? {}` / `?? []` fallback for pre-M10 kits).

* **Reasoning**:
  - Smallest possible fix: only `getKitById` changes on the backend; the route handler already spreads `result.data` so no route change is needed.
  - Optional fields with `undefined` absence means pre-M10 kits and kits with no M10 state set are handled gracefully without migration.
  - Ownership isolation is preserved — User B still receives 404 (not M10 data) for another user's kit.
  - M10 fields are absent from list summary responses (`GET /api/kits`) — summaries remain lightweight.
  - Appendix A `kit.*` object is never modified — batch evaluator compatibility is unchanged.

* **Alternatives Considered**:
  - Separate dedicated endpoint (`GET /api/kits/:id/meta`): Rejected — requires two round-trips to open a kit; adds API surface with no benefit.
  - Embed fields inside `kit.*` (Appendix A): Rejected — would break schema compliance and batch evaluator.
  - Accept the loss silently (keep as TODO): Rejected — this is a user-visible data loss bug, not a UX enhancement.

* **Trade-offs**:
  - `GET /api/kits/:id` response payload grows slightly (at most a few hundred bytes of optional metadata). Acceptable given the existing 2 MB body limit.
  - Clients must treat all three fields as optional (may be absent on pre-M10 kits).

* **Tests added**:
  7 integration tests in `apps/api/src/routes/tests/kitsRoutes.test.ts`:
  - Fresh kit returns no M10 fields.
  - `questionConfidence` returned after being set.
  - `questionOrder` returned after being set.
  - `flashcardConfidence` returned after being set.
  - All three fields present simultaneously, Appendix A `kit.*` uncontaminated.
  - Ownership isolation: User B receives 404, not M10 data.
  - M10 fields absent from list summary response.

---

### ADR-015: Public Interview Discussion Search Provider Abstraction

* **Status**: Accepted
* **Date**: 2026-09-24
* **Context**:
  Assessment requirement (Step 5 of 11-step pipeline) specifies searching for public interview discussions (Glassdoor, Blind, Reddit, etc.). The existing internal crawler only searches company website pages (about/careers/culture). External search requires an abstraction that can be mocked for tests and optionally configured for production without breaking deterministic batch evaluation.

* **Alternatives Considered**:
  - Hard-coding direct Google Custom Search API calls without abstraction: Rejected — breaks test determinism and requires real credentials for all environments.
  - Using a paid third-party crawling API (e.g., Firecrawl, Apify): Rejected — violates assessment constraint against paid-only services.
  - Skipping external search entirely: Rejected — assessment explicitly requires public interview discussion search.

* **Decision**:
  Implement a `IPublicInterviewSearchProvider` interface with two implementations:
  - `MockPublicInterviewSearchProvider`: Deterministic mock returning company-specific results (Google, Amazon, generic). No external API calls. Used by default in tests and when credentials unavailable.
  - `GoogleCustomSearchProvider`: Google Custom Search API provider. Requires `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_CX` environment variables. Executes focused queries, deduplicates URLs, extracts source domain. Graceful degradation if credentials missing.
  - `createInterviewSearchProvider` factory: Returns Google provider if configured and requested, otherwise returns Mock provider.

* **Reasoning**:
  - Clean abstraction allows future providers (Bing, DuckDuckGo) without pipeline changes.
  - Mock provider ensures test determinism and batch evaluator never requires external API credentials.
  - Graceful degradation ensures pipeline continues with internal research if external search fails or unavailable.
  - Factory pattern with configuration check prevents accidental production calls without credentials.

* **Trade-offs**:
  - Search results are metadata snippets only, not fetched pages. Underlying pages are not fetched via `safeFetcher`. This is by design (separates search metadata from page content).
  - Live external search not verified — requires real API key and Custom Search Engine ID configuration.
  - Search results are NOT added to `source.pages_used` (Appendix A) because they are not fetched pages, only search metadata.

* **Implementation Details**:
  - Pipeline Step 5 (after internal crawler): calls `searchInterviewDiscussions(companyName, role)`, formats results as text context, appends to internal research text.
  - Try/catch ensures graceful degradation on provider failure.
  - Combined research text used for company brief generation.
  - Batch evaluator explicitly passes `MockPublicInterviewSearchProvider` to pipeline.
  - External search content wrapped in `<untrusted_web_content>` XML tags before LLM ingestion.

* **Tests added**:
  11 unit tests in `apps/api/src/modules/research/tests/interviewSearchProvider.test.ts`:
  - Mock provider returns results for Google/Amazon/generic.
  - Mock provider handles role parameter.
  - Google provider configuration check (`isConfigured()`).
  - Google provider throws error without credentials.
  - URL source extraction (Glassdoor, Reddit, Blind, Indeed, LeetCode).
  - Factory returns mock by default.
  - Factory returns mock when Google requested but not configured.

---

### ADR-016: Production Deployment Architecture

* **Status**: Accepted
* **Date**: 2026-09-24
* **Context**:
  Milestone 12.2 requires preparing the repository for production deployment. The application is a monorepo with separate Next.js frontend and Express backend services. The deployment architecture must support production-grade hosting while maintaining existing functionality and avoiding unnecessary complexity.

* **Alternatives Considered**:
  - Single-server deployment with nginx reverse proxy: Rejected — requires server management and infrastructure setup beyond current scope.
  - Containerized deployment with Docker + docker-compose: Rejected — adds Dockerfile maintenance and orchestration complexity not currently required.
  - Multi-cloud deployment across multiple providers: Rejected — adds operational complexity without clear benefit.

* **Decision**:
  Deploy to Vercel (frontend) + Render (backend) + MongoDB Atlas (database). This cloud-native approach leverages platform-specific optimizations while keeping the monorepo structure intact.

* **Reasoning**:
  - Vercel provides native Next.js support with automatic builds, previews, and edge caching.
  - Render supports Node.js/Express backends with simple YAML configuration and automatic health checks.
  - MongoDB Atlas free M0 cluster provides managed database with no infrastructure overhead.
  - Next.js rewrites proxy `/api/*` and `/auth/*` to Render, keeping browser requests same-origin with Vercel and avoiding CORS complexity.
  - No vercel.json file needed — Vercel auto-detects Next.js and uses default build settings.
  - render.yaml provides explicit build/start commands and environment variable configuration for the backend.

* **Architecture Details**:
  - **Frontend (Vercel)**: Next.js 14.2.35 deployed via Vercel's automatic Next.js detection. Environment variable `API_URL` points to Render backend URL. Next.js rewrites proxy API/auth requests to Render.
  - **Backend (Render)**: Express 4.21.2 on port 10000. Build command: `npm install && npm run build` (installs workspace dependencies, builds API). Start command: `node apps/api/dist/server.js`. Health check at `/api/health`.
  - **Database (MongoDB Atlas)**: Free M0 cluster. Connection string via `MONGODB_URI`. Network access from Render (0.0.0.0/0 or specific IPs).
  - **CORS**: Configured via `CORS_ORIGIN` environment variable on Render to Vercel domain.
  - **Authentication**: JWT in `Authorization: Bearer` header. Token stored in sessionStorage on client.

* **Security Considerations**:
  - All secrets (MongoDB URI, JWT secret, API keys) marked with `sync: false` in render.yaml.
  - `.env` file gitignored — no secrets committed to repository.
  - SSRF protection enabled via `ALLOW_LOOPBACK_IN_DEV=false` in production.
  - Health endpoint `/api/health` is public (no auth required) for platform monitoring.

* **Trade-offs**:
  - Separate platforms require manual CORS configuration (`CORS_ORIGIN` on Render).
  - No vercel.json file means Vercel uses default settings — acceptable for this use case.
  - MongoDB Atlas free tier has resource limits (512 MB storage, 512 MB RAM) — adequate for initial deployment.

* **Verification**:
  - Repository build: `npm run build` Exit Code 0 (all workspaces compile cleanly).
  - Tests: `npm test` Exit Code 0 (257/257 tests passing).
  - Lint: `npm run lint` Exit Code 0.
  - Evaluator: `npm run evaluate` Exit Code 0 (8 cases, 5 valid kits, 3 isolated invalid).
  - Security: `.env` ignored, no secrets committed, vercel.json removed (unnecessary).

* **Next Steps**:
  - Manual MongoDB Atlas setup (create cluster, user, network access).
  - Manual Render deployment (connect GitHub, set env vars, deploy).
  - Manual Vercel deployment (connect GitHub, set API_URL, deploy).
  - Configure CORS_ORIGIN on Render to Vercel domain.
  - Perform production verification (health, auth, kit generation, persistence, ownership isolation).
  - Factory returns mock when mock explicitly requested.

---

### ADR-016: Production Deployment Architecture

* **Status**: Accepted
* **Date**: 2026-09-24
* **Context**:
  Production deployment requires separating frontend and backend across different platforms (Vercel for Next.js, Render for Express API) while maintaining seamless API communication and proper CORS configuration. The application must work in production with real MongoDB Atlas, real Gemini API, and proper environment variable management.

* **Alternatives Considered**:
  - Single-server deployment with nginx reverse proxy (simpler infrastructure, but requires server management).
  - Containerized deployment with Docker + docker-compose (adds complexity, not currently implemented).
  - Full-stack Next.js with API routes (would require significant refactoring of existing Express backend).

* **Decision**:
  Deploy frontend to Vercel, backend to Render, and use MongoDB Atlas for database. Next.js rewrites proxy `/api/*` and `/auth/*` to the Render API URL to keep browser requests same-origin with the Vercel frontend. CORS_ORIGIN configured on Render to Vercel domain.

* **Reasoning**:
  - Vercel provides native Next.js support with automatic builds and HTTPS.
  - Render provides Node.js hosting with environment variable management and health checks.
  - MongoDB Atlas free M0 cluster provides production-ready MongoDB without server management.
  - Next.js rewrites avoid CORS complexity by keeping API calls same-origin from the browser.
  - Separation of concerns: frontend and backend can scale independently.

* **Trade-offs**:
  - Cross-platform deployment requires managing environment variables on multiple platforms.
  - Network latency between Vercel and Render (both regions can be configured to minimize latency).
  - Dependency on third-party platforms (Vercel, Render, MongoDB Atlas) for production hosting.

* **Implementation Details**:
  - `vercel.json`: Vercel configuration with build command and API_URL environment variable.
  - `render.yaml`: Render configuration with build command, start command, health check, and all environment variables.
  - `apps/web/next.config.js`: Standalone output for production build optimization.
  - Next.js rewrites proxy `/api/*` and `/auth/*` to Render API URL.
  - CORS_ORIGIN on Render set to Vercel domain for cross-origin requests.
  - Health check at `/api/health` for Render deployment monitoring.

* **Environment Variables**:
  - Vercel: `API_URL` (Render backend URL)
  - Render: `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `GEMINI_API_KEY`, and other production settings
  - MongoDB Atlas: Connection string via `MONGODB_URI`

* **Security Considerations**:
  - All secrets marked as `sync: false` in Render configuration (not synced from repository).
  - JWT_SECRET enforced to be ≥32 characters at startup in production.
  - ALLOW_LOOPBACK_IN_DEV set to false in production to enforce SSRF protection.
  - CORS_ORIGIN restricted to Vercel domain only.

### ADR-017: Production Build Toolchain Compatibility

* **Status**: Accepted
* **Date**: 2026-09-25
* **Context**:
  Render's compiler rejected the implicit `node10` TypeScript resolution mode, and the production workspace build did not install web build-time dependencies such as Tailwind CSS.
* **Decision**:
  Use explicit `Node16` module and module resolution settings for the shared and API packages, exclude API test files from production compilation, and install dev dependencies during the Render build.
* **Verification**:
  `npm run build` passes across all workspaces and `npm test` passes with 257/257 tests.

### ADR-018: Declare API Runtime Type Dependencies

* **Status**: Accepted
* **Date**: 2026-09-25
* **Context**:
  A clean Render install failed API compilation because bcrypt and jsonwebtoken declarations were present only as local extraneous modules, not in the API manifest.
* **Decision**:
  Declare `@types/bcrypt` and `@types/jsonwebtoken` in `apps/api` development dependencies and lock them through the workspace lockfile.
* **Verification**:
  `npm run build` passes across all workspaces and `npm test` passes with 257/257 tests.

---

### ADR-019: LLM Requirement Kind Robustness and Normalization

* **Status**: Accepted
* **Date**: 2026-09-25
* **Context**:
  During live production testing of kit generation on realistic Senior Backend Engineer job descriptions, Gemini returned `"kind": "leadership"`. The Appendix A specification and `@rehearsa/shared` Zod schema strictly enforce `RequirementKindEnum` as `"technical" | "behavioural" | "domain"`. Additionally, the prompt schema example in `pipelineOrchestrator.ts` (`roleSysInst`) had mistakenly listed `"leadership"` as an example choice.
* **Alternatives Considered**:
  - Weaken Appendix A Zod schema to allow `"leadership"`, `"management"`, etc. (Rejected: Violates Appendix A assessment contract invariant).
  - Rely exclusively on prompt engineering without parser normalization (Rejected: LLMs can still occasionally emit semantic aliases under edge-case job descriptions, leading to 3 retry failures).
  - Coerce all unknown strings to a fallback value (Rejected: Unsound; masks actual schema/prompt bugs and accepts invalid garbage).
* **Decision**:
  Adopt a two-tier defense:
  1. Fix the prompt system instruction (`roleSysInst`) to strictly list `"technical" | "behavioural" | "domain"` and explicitly guide that leadership, management, teamwork, ownership, and communication belong under `"behavioural"`.
  2. Implement deterministic pre-validation normalization (`normalizeRequirementKind`) within `geminiProvider.ts` in the JSON normalization pipeline before Zod validation. Map known semantic aliases (`leadership`, `management`, `communication`, `mentoring`, etc. -> `"behavioural"`; `tech` -> `"technical"`; `domain_knowledge` -> `"domain"`) while passing canonical values unchanged and preserving unknown/invalid values for strict Zod schema rejection.
* **Reasoning**:
  - Preserves exact Appendix A schema compliance without regression.
  - Hardens LLM resilience against natural language variations in real-world JDs.
  - Maintains strict deterministic validation boundaries.
* **Verification**:
  - 30+ assertions in `apps/api/src/modules/llm/tests/llmProvider.test.ts` verifying all aliases, canonical preservation, unknown preservation, and full `KitSchema` validation.
  - Monorepo test suite and build passing.

---

### ADR-020: Tavily Search Provider for Public Interview Discussions

* **Status**: Accepted
* **Date**: 2026-09-25
* **Context**:
  The assessment specifies researching company hiring nuances and public interview discussions (Step 5 of the pipeline). In production testing, Google Custom Search JSON API was found to be closed to new customers, returning HTTP 403 on newly provisioned projects.
* **Alternatives Considered**:
  - Keep Google Custom Search only (Rejected: Broken for new API projects due to Google's product retirement).
  - Unbounded web scraping via headless browser (Rejected: Fragile, slow, breaks SSRF and timeout guarantees).
  - Adopt Tavily Search API as the production search provider (Accepted).
* **Decision**:
  1. Implement `TavilySearchProvider` adhering to `IPublicInterviewSearchProvider` using Tavily's official Search API (`https://api.tavily.com/search`, POST request).
  2. Maintain bounded query generation, rate limiting, and per-query error isolation.
  3. Support `INTERVIEW_SEARCH_PROVIDER=tavily` and `TAVILY_API_KEY` in `createInterviewSearchProvider()`.
  4. Retain `GoogleCustomSearchProvider` as a historical/alternative provider and `MockPublicInterviewSearchProvider` for offline testing and headless batch evaluation (`scripts/evaluator.ts`).
  5. Preserve the invariant that search results are injected into `<untrusted_web_content>` for brief synthesis and **not** into `source.pages_used`.
  6. Maintain graceful degradation so that search failure never breaks overall kit generation.
* **Reasoning**:
  - Provides a reliable, developer-friendly search API suited for AI application contexts.
  - Maintains strict architectural boundaries and provider modularity.
* **Verification**:
  - Unit tests in `interviewSearchProvider.test.ts` with 10 dedicated test cases covering parsing, multiple results, deduplication, empty results, malformed data, HTTP 401 error isolation, network timeouts, and factory provider selection/fallback.
  - Full test suite, lint, and build passing cleanly.

---

## ADR-021: Express Trust Proxy for Render Reverse-Proxy Deployment

* **Status**: Accepted — 2026-09-25
* **Context**:
  - Production deployment on Render failed after M16 deploy. Every request returned a plain-text `ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false` instead of JSON.
  - Root cause: `express-rate-limit` v6+ performs a startup/runtime check: if `X-Forwarded-For` is present and `trust proxy` is false, it throws a `ValidationError`. Render's edge load-balancer always injects `X-Forwarded-For`.
  - The plain-text error response caused the frontend's `res.json()` call to throw a `SyntaxError`, surfacing to the user as `NETWORK_ERROR: Unexpected token 'A', "An error o"... is not valid JSON`.
* **Decision**: Add `app.set('trust proxy', 1)` in `apps/api/src/app.ts` immediately after `const app = express()` and before any middleware.
* **Value of `1` vs `true`**:
  - `true` means "trust all hops in the X-Forwarded-For chain" — dangerous in public-internet deployments because a client can forge the header.
  - `1` means "trust the rightmost one hop" — safe for single-layer PaaS (Render adds exactly one hop). Rate-limit counters are keyed on the actual client IP.
* **Alternatives considered**:
  - `validate: { trustProxy: false }` in the rate-limiter config — silences the error but does NOT enable correct client IP detection. Rejected.
  - Disabling rate limiting in production — not acceptable; we need basic brute-force protection on auth endpoints.
  - Moving rate limiting to Render's edge — out of scope; would require Render paid plan features.
* **Verification**:
  - `npm run lint`: Exit code 0.
  - `npx vitest run --exclude **/scripts/**`: 274/274 tests passing, Exit code 0.
  - `npm run build`: Exit code 0. All three workspaces compile cleanly.
