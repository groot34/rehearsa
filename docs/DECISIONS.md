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
