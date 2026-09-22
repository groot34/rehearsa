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
| Create kit from pasted Job Description (JD), Company URL, Days | Mandatory | Not started | Input validation schema in `@rehearsa/shared` |
| Support multiple roles / multiple kit submissions per user | Mandatory | Not started | Relational / document mapping (`userId -> [kits]`) |
| Seed page retrieval and HTML sanitization / text cleaning | Mandatory | Not started | Strip DOM scripts, styles, ads; extract text |
| Dynamic crawler with intelligent link ranking | Mandatory | Not started | Avoid hard-coding fixed paths; crawl and score links |
| Public interview discussion and hiring info search | Mandatory | Not started | Multi-query search / crawler synthesis |
| Robots.txt compliance and rate limiting | Mandatory | Not started | Crawler respects `robots.txt` disallow directives |
| Treat retrieved pages and pasted JD as untrusted input | Mandatory | Security | Never execute as LLM system directives / sanitize prompt injections |

---

## 3. Research & Generation Sequencing (11-Step Pipeline)

| Step | Pipeline Stage | Nature | Scope | Status |
|---|---|---|---|---|
| 1 | Extract structured requirements from JD | AI Generation | Mandatory | Not started |
| 2 | Retrieve & clean individual seed pages | Crawler/Fetcher | Mandatory | Not started |
| 3 | Crawl company site & rank useful links dynamically | Dynamic Crawler | Mandatory | Not started |
| 4 | Search for company hiring information | Search/Research | Mandatory | Not started |
| 5 | Search public interview discussions | Search/Research | Mandatory | Not started |
| 6 | Generate category-specific questions for requirements | AI Generation | Mandatory | Not started |
| 7 | Generate flashcards & company brief | AI Generation | Mandatory | Not started |
| 8 | Detect uncovered requirements via set-difference | **Deterministic Code** | Mandatory | Not started |
| 9 | Second-pass generation for missing requirements | AI Generation | Mandatory | Not started |
| 10 | Allocate study schedule across available days | **Deterministic Code** | Mandatory | Not started |
| 11 | Final kit schema validation against Appendix A | **Deterministic Code** | Mandatory | Not started |

*Constraint: A single prompt generating the complete kit is unacceptable.*

---

## 4. Exact Kit Schema (Appendix A)

| Schema Section / Field | Type & Allowed Values | Status | Notes |
|---|---|---|---|
| `source.company`, `company_url`, `role`, `location` | `string` | In progress | Validated in `@rehearsa/shared` Zod schema |
| `source.jd_chars` | `number` (integer >= 0) | In progress | Character length of raw JD |
| `source.researched_at` | `string` (ISO-8601 date) | In progress | Timestamp of generation |
| `source.pages_used` | `string[]` (array of URLs) | In progress | Provenance of crawled sources |
| `company_brief.summary`, `what_they_do`, `sources` | `string`, `string`, `string[]` | In progress | Sourced company background |
| `role.title`, `seniority`, `responsibilities` | `string`, `string`, `string[]` | In progress | Extracted role profile |
| `role.requirements[].id` | `string` (e.g. `r1`, `r2`) | In progress | Stable requirement identifiers |
| `role.requirements[].kind` | `"technical"` \| `"behavioural"` \| `"domain"` | In progress | Strict enum |
| `role.requirements[].priority` | `"must"` \| `"nice"` | In progress | Strict enum |
| `questions[].id`, `requirement_ids` | `string`, `string[]` | In progress | Referential integrity to `role.requirements` |
| `questions[].category` | `"technical"` \| `"behavioural"` \| `"system-design"` \| `"company-fit"` | In progress | Strict enum |
| `questions[].prompt`, `answer_outline` | `string`, `string` | In progress | Question content |
| `questions[].difficulty` | `number` (integer `1`, `2`, `3`) | In progress | Strict difficulty rating |
| `flashcards[].id`, `front`, `back`, `requirement_ids` | `string`, `string`, `string`, `string[]` | In progress | Mapped to requirement IDs |
| `schedule.days_available` | `number` (integer `1` to `60`) | In progress | Matches user input days |
| `schedule.days[].day`, `focus`, `question_ids`, `minutes` | `number`, `string`, `string[]`, `number` | In progress | `days.length == days_available` |
| `coverage.uncovered_requirement_ids`, `passes` | `string[]`, `number` (`2`) | In progress | Computed deterministically |

---

## 5. Kit Builder, Editing & Regeneration

| Requirement | Scope | Status | Notes |
|---|---|---|---|
| View company brief, role breakdown, questions, flashcards, schedule | Mandatory | Not started | Frontend interactive views |
| Edit, reorder, add, and delete kit content (questions, cards, schedule) | Mandatory | Not started | Mutable client state with debounced persistence |
| Regenerate single section without destroying edits elsewhere | Mandatory | Not started | Section-scoped regeneration endpoints |
| Preserve manually edited questions when regenerating their category | Mandatory | Not started | Diffing/dirty-flag tracking during regeneration |
| Real-time progress updates & meaningful failure states during generation | Mandatory | Not started | SSE or polling status reporting |

---

## 6. Flashcard Practice Mode

| Requirement | Scope | Status | Notes |
|---|---|---|---|
| Interactive flip-card interface | Mandatory | Not started | Client-side flip animation & key bindings |
| Record confidence levels per card (e.g., easy, medium, hard) | Mandatory | Not started | Local state & server sync |
| Track session progress & mastery summary | Mandatory | Not started | Progress bar and completion metrics |

---

## 7. Deterministic Schedule Allocation

| Requirement | Scope | Status | Notes |
|---|---|---|---|
| Allocate questions across exact requested days (1–60) | Mandatory | Not started | Bin-packing / round-robin scheduling algorithm |
| Balance time per day in minutes (integer) | Mandatory | Not started | Target daily study durations (e.g. 45–90 min) |
| Group thematic questions logically per day focus | Mandatory | Not started | Categorical clustering |

---

## 8. Batch Evaluator CLI (Appendix B)

| Requirement | Scope | Status | Notes |
|---|---|---|---|
| CLI Command: `npm run evaluate -- --input <cases.json> --output <kits.json>` | Mandatory | Not started | Monorepo root script executing shared pipeline |
| Input: Array of cases containing `id`, `jd`, `company_url`, `days` | Mandatory | Not started | Batch case parser |
| Exact Appendix B envelope (`version`, `generated_at`, `kits`) | Mandatory | In progress | Schema defined in `@rehearsa/shared` |
| Individual case failure isolation (continue on error) | Mandatory | Not started | Try/catch per case with error code reporting |
| Support local test/mock company websites and relative links | Mandatory | Not started | Resolves localhost / internal fixtures |
| Complete 5 cases within 15 minutes including retries | Mandatory | Not started | Concurrency and timeout handling |

---

## 9. Edge Cases & Security Handling

| Edge Case / Security Requirement | Scope | Status | Notes |
|---|---|---|---|
| SSRF Prevention (validate URLs, block private/loopback in prod) | Security | Not started | IP resolver + allowlist validator |
| Content-type & payload size restrictions on crawled pages | Security | Not started | Max body size limit (e.g., 2MB) |
| Handling 404s, DNS failures, timeouts, unreachable sites | Robustness | Not started | Axios/fetch retry with exponential backoff |
| Missing company hiring pages or minimal online presence | Robustness | Not started | Graceful fallback to JD-only extraction |
| Very short or malformed job descriptions | Robustness | Not started | Prompt resilience + minimum length validation |
| LLM rate limits & transient errors | Robustness | Not started | Retry mechanism with backoff |
| Malformed LLM JSON output | Robustness | Not started | Safe JSON parser with repair fallback & retry |
| Secrets kept strictly in `.env`, never leaked to frontend/Git | Security | Verified | Clean `.gitignore` and `.env.example` in place |

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
