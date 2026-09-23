# Changelog — Rehearsa

All notable changes to the Rehearsa project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
