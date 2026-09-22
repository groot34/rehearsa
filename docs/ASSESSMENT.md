# Assessment Requirements Checklist: Rehearsa (FS-AI-INTERVIEW-01)

> **Source**: Trao — Full-Stack Engineering Assessment: The AI Interview Prep Kit (`FS-AI-INTERVIEW-01`)
>
> **Status Taxonomy**:
> - `Not started`: Requirement identified and specified; no code written yet.
> - `In progress`: Active implementation underway in the current milestone.
> - `Implemented, not yet verified`: Code exists but automated/manual test verification is pending.
> - `Verified`: Complete implementation backed by passing automated/manual test evidence.

---

## 1. Authentication & Ownership

| Requirement | Scope | Status | Notes / Evidence |
|---|---|---|---|
| User registration with email and password | Mandatory | Not started | Planned in `apps/api` auth module |
| User login and session management (JWT / Cookie) | Mandatory | Not started | Secure password hashing (bcrypt/argon2) planned |
| User logout functionality | Mandatory | Not started | Token invalidation / cookie clearing planned |
| Strict kit ownership isolation (users only access own kits) | Mandatory | Not started | Middleware to enforce `user_id` query scoping |

---

## 2. Input & Research Pipeline

| Requirement | Scope | Status | Notes / Evidence |
|---|---|---|---|
| Create kit from pasted Job Description (JD), Company URL, Days | Mandatory | Verified | `POST /api/interview-prep/generate` with Zod input schema. Integration test passing. |
| Support multiple roles / multiple kit submissions per user | Mandatory | Not started | Relational / document mapping (`userId -> [kits]`) |
| Seed page retrieval and HTML sanitization / text cleaning | Mandatory | Verified | `safeFetcher.ts` + `htmlCleaner.ts`. 2 htmlCleaner tests passing. |
| Dynamic crawler with intelligent link ranking | Mandatory | Verified | `companyCrawler.ts` scores links by keyword relevance. |
| Public interview discussion and hiring info search | Mandatory | In progress | Multi-page crawler fetches about/careers/culture pages. Full search engine integration planned. |
| Robots.txt compliance and rate limiting | Mandatory | Verified | `robotsParser.ts` enforces `robots.txt` disallow rules. |
| Treat retrieved pages and pasted JD as untrusted input | Mandatory | Verified | LLM prompts wrap content in `<untrusted_...>` XML tags. Never executed as system instructions. |

---

## 3. Research & Generation Sequencing (11-Step Pipeline)

| Step | Pipeline Stage | Nature | Scope | Status |
|---|---|---|---|---|
| 1 | Extract structured requirements from JD | AI Generation | Mandatory | Verified |
| 2 | Retrieve & clean individual seed pages | Crawler/Fetcher | Mandatory | Verified |
| 3 | Crawl company site & rank useful links dynamically | Dynamic Crawler | Mandatory | Verified |
| 4 | Search for company hiring information | Search/Research | Mandatory | In progress |
| 5 | Search public interview discussions | Search/Research | Mandatory | In progress |
| 6 | Generate category-specific questions for requirements | AI Generation | Mandatory | Verified |
| 7 | Generate flashcards & company brief | AI Generation | Mandatory | Verified |
| 8 | Detect uncovered requirements via set-difference | **Deterministic Code** | Mandatory | Verified |
| 9 | Second-pass generation for missing requirements | AI Generation | Mandatory | Verified |
| 10 | Allocate study schedule across available days | **Deterministic Code** | Mandatory | Verified |
| 11 | Final kit schema validation against Appendix A | **Deterministic Code** | Mandatory | Verified |

*Constraint: A single prompt generating the complete kit is unacceptable.*

---

## 4. Exact Kit Schema (Appendix A)

| Schema Section / Field | Type & Allowed Values | Status | Notes |
|---|---|---|---|
| `source.company`, `company_url`, `role`, `location` | `string` | Verified | Validated in `@rehearsa/shared` Zod schema |
| `source.jd_chars` | `number` (integer >= 0) | Verified | Character length of raw JD |
| `source.researched_at` | `string` (ISO-8601 date) | Verified | Timestamp of generation |
| `source.pages_used` | `string[]` (array of URLs) | Verified | Provenance of crawled sources |
| `company_brief.summary`, `what_they_do`, `sources` | `string`, `string`, `string[]` | Verified | Sourced company background |
| `role.title`, `seniority`, `responsibilities` | `string`, `string`, `string[]` | Verified | Extracted role profile |
| `role.requirements[].id` | `string` (e.g. `r1`, `r2`) | Verified | Stable requirement identifiers |
| `role.requirements[].kind` | `"technical"` \| `"behavioural"` \| `"domain"` | Verified | Strict enum |
| `role.requirements[].priority` | `"must"` \| `"nice"` | Verified | Strict enum |
| `questions[].id`, `requirement_ids` | `string`, `string[]` | Verified | Referential integrity to `role.requirements` |
| `questions[].category` | `"technical"` \| `"behavioural"` \| `"system-design"` \| `"company-fit"` | Verified | Strict enum |
| `questions[].prompt`, `answer_outline` | `string`, `string` | Verified | Question content |
| `questions[].difficulty` | `number` (integer `1`, `2`, `3`) | Verified | Strict difficulty rating |
| `flashcards[].id`, `front`, `back`, `requirement_ids` | `string`, `string`, `string`, `string[]` | Verified | Mapped to requirement IDs |
| `schedule.days_available` | `number` (integer `1` to `60`) | Verified | Matches user input days |
| `schedule.days[].day`, `focus`, `question_ids`, `minutes` | `number`, `string`, `string[]`, `number` | Verified | `days.length == days_available` |
| `coverage.uncovered_requirement_ids`, `passes` | `string[]`, `number` (`2`) | Verified | Computed deterministically |

---

## 5. Kit Builder, Editing & Regeneration

| Requirement | Scope | Status | Notes |
|---|---|---|---|
| View company brief, role breakdown, questions, flashcards, schedule | Mandatory | Verified | `KitViewer.tsx`, `CompanyBriefCard.tsx`, `RoleBreakdownCard.tsx`, `QuestionBankCard.tsx`, `FlashcardDeck.tsx`, `StudyScheduleTimeline.tsx` |
| Edit, reorder, add, and delete kit content (questions, cards, schedule) | Mandatory | In progress | Basic view rendered in M4; section editing endpoints planned |
| Regenerate single section without destroying edits elsewhere | Mandatory | In progress | Section-scoped endpoints planned |
| Preserve manually edited questions when regenerating their category | Mandatory | In progress | Dirty-flag tracking during regeneration planned |
| Real-time progress updates & meaningful failure states during generation | Mandatory | Verified | `GenerationProgressTracker.tsx` & error banner in `KitGeneratorForm.tsx` |

---

## 6. Flashcard Practice Mode

| Requirement | Scope | Status | Notes |
|---|---|---|---|
| Interactive flip-card interface | Mandatory | Verified | `FlashcardDeck.tsx` card flip animation & front/back toggle |
| Record confidence levels per card (e.g., easy, medium, hard) | Mandatory | In progress | Mastery toggle in M4; confidence rating sync planned |
| Track session progress & mastery summary | Mandatory | Verified | `FlashcardDeck.tsx` mastery counter & progress tracking |

---

## 7. Deterministic Schedule Allocation

| Requirement | Scope | Status | Notes |
|---|---|---|---|
| Allocate questions across exact requested days (1–60) | Mandatory | Verified | `scheduleAllocator.ts` deterministic bin-packing. 6 tests passing. |
| Balance time per day in minutes (integer) | Mandatory | Verified | Integer study minutes per day calculated. |
| Group thematic questions logically per day focus | Mandatory | Verified | Category-based focus labels derived deterministically. |

---

## 8. Batch Evaluator CLI (Appendix B)

| Requirement | Scope | Status | Notes |
|---|---|---|---|
| CLI Command: `npm run evaluate -- --input <cases.json> --output <kits.json>` | Mandatory | Verified | `scripts/evaluator.ts` implements exact contract. |
| Input: Array of cases containing `id`, `jd`, `company_url`, `days` | Mandatory | Verified | `BatchCaseInputSchema` in `@rehearsa/shared` validates input. |
| Exact Appendix B envelope (`version`, `generated_at`, `kits`) | Mandatory | Verified | `BatchOutputEnvelope` schema defined and used. |
| Individual case failure isolation (continue on error) | Mandatory | Verified | Try/catch per case with error code reporting in envelope. |
| Support local test/mock company websites and relative links | Mandatory | Verified | `allowLoopbackInDev: true` flag passed from evaluator. |
| Complete 5 cases within 15 minutes including retries | Mandatory | In progress | Timeout and concurrency testing deferred to Milestone 5. |

---

## 9. Edge Cases & Security Handling

| Edge Case / Security Requirement | Scope | Status | Notes |
|---|---|---|---|
| SSRF Prevention (validate URLs, block private/loopback in prod) | Security | Verified | `ssrfGuard.ts` DNS-resolving guard. 6 tests passing. |
| Content-type & payload size restrictions on crawled pages | Security | Verified | `safeFetcher.ts` 2 MB limit + content-type filter. |
| Handling 404s, DNS failures, timeouts, unreachable sites | Robustness | Verified | Graceful `SafeFetchResult.error` fields; crawler falls back. |
| Missing company hiring pages or minimal online presence | Robustness | Verified | Fallback to seed URL text only; pipeline continues. |
| Very short or malformed job descriptions | Robustness | Verified | Min-length validation in pipeline + Zod schema. |
| LLM rate limits & transient errors | Robustness | Verified | Gemini provider 3-attempt retry loop. |
| Malformed LLM JSON output | Robustness | Verified | Zod `safeParse` on each LLM response; retry on failure. |
| Secrets kept strictly in `.env`, never leaked to frontend/Git | Security | Verified | Clean `.gitignore` and `.env.example` in place. |

---

## 10. Out-of-Scope & Optional Features

| Item | Status | Notes |
|---|---|---|
| Job Aggregation / Scraping Job Boards | **Out of Scope** | Strictly excluded by specification |
| CV / Resume Parsing | **Out of Scope** | Strictly excluded by specification |
| Direct Job Application Dispatch | **Out of Scope** | Strictly excluded by specification |
| Payment Gateway Integration | **Out of Scope** | Strictly excluded by specification |
| Team Collaboration / Workspace Sharing | **Out of Scope** | Strictly excluded by specification |
| Real-time Audio/Video AI Interview Simulator | **Out of Scope** | Strictly excluded by specification |
| Optional Creative Feature (e.g. AI Mock Interviewer) | Optional | Deferred until all mandatory requirements are verified |
