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
| [ADR-007](#adr-007-manual-edit-preservation-strategy-during-regeneration) | Manual Edit Preservation Strategy During Regeneration | Proposed | 2026-09-22 |

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

* **Status**: Proposed
* **Date**: 2026-09-22
* **Context**:
  Users can manually edit, add, or delete questions and content. When regenerating a category or section, manual user edits must not be overwritten or lost.
* **Alternatives Considered**:
  - Storing a separate shadow copy of original vs user-edited kits.
  - In-place merge with `is_custom` / `is_edited` metadata flags per question and section.
* **Decision**:
  Use `is_custom: boolean` and `is_edited: boolean` metadata on kit items (or maintain a list of dirty item IDs). During section regeneration, untouched items are replaced while flagged items are preserved and merged.
* **Reasoning**:
  - Simple, predictable data model that survives serialization and matches user mental model.
* **Trade-offs**:
  - Internal schema includes tracking flags which are stripped or mapped when exporting canonical Appendix A JSON.
