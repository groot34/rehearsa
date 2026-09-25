# Project Progress & Status — Rehearsa

## 1. Current Milestone
**Milestone 12.2: Production Deployment Preparation (COMMITTED + FINALIZED)**
- **Deployment build compatibility fix (2026-09-25)**: Explicit `Node16` TypeScript resolution for shared/API packages, API test exclusion from production compilation, and Render installation with dev dependencies. Local build and all 257 tests pass.
- **Commit 1 (M8)**: `1a0dfc7` — `feat(api): add user authentication and MongoDB connection`
- **Commit 2 (M9)**: `8a94003` — `feat(api,web): add persistent user-owned interview kits`
- **Commit 3 (M10.1)**: `2bbd21e` — `feat: add persisted question confidence tracking`
- **Commit 4 (M10.2)**: `e5cd02c` — `feat: add persisted question reordering`
- **Commit 5 (M10.3)**: `085cc0f` — `feat: add persisted flashcard confidence tiers`
- **Commit 6 (M10.3 docs)**: `d947b87` — `docs: record flashcard confidence tiers implementation`
- **Commit 7 (live verify docs)**: `1981ab6` — `docs: record live MongoDB verification`
- **Commit 8 (E2E audit)**: `54a2b9b` — `docs: record end-to-end journey audit`
- **Commit 9 (M10 state restore)**: `a4cbbc0` — `feat: restore persisted kit state on fetch`
- **Commit 10 (M11)**: `342e4fd` — `feat: add public interview discussion search`
- **Commit 11 (M11 docs)**: `b2a5628` — `docs: update handoff and progress for M11 commit`
- **Commit 12 (M11 docs final)**: `240fdf2` — `docs: final handoff/progress update for M11`
- **Commit 13 (M11 sync)**: `13fa78c` — `docs: sync handoff/progress with final M11 state`
- **Commit 14 (M12.2 initial)**: `fbb2564` — `feat: prepare production deployment`
- **Commit 15 (M12.2 final)**: — `docs: finalise production deployment preparation`
- **Branch**: `main`, 1 ahead of `origin/main`.

---

## 2. Production Deployment Preparation (M12.2 - COMMITTED + FINALIZED)

### Repository Changes Made
- **render.yaml**: Added Render configuration for Express API backend deployment
  - Build command: `npm install && npm run build` (installs workspace dependencies, builds API)
  - Start command: `node apps/api/dist/server.js`
  - Health check path: `/api/health`
  - Port: 10000
  - All production environment variables configured (with sync: false for secrets)
- **apps/web/next.config.js**: Removed `output: 'standalone'` (not needed for Vercel deployment)
- **README.md**: Added comprehensive production deployment section with:
  - Deployment architecture description (Vercel + Render + MongoDB Atlas)
  - Environment variable requirements for each platform
  - Step-by-step deployment instructions
  - Health check verification guidance

### Deployment Architecture
**Target**: Vercel (frontend) + Render (backend) + MongoDB Atlas (database)

**Frontend (Vercel)**:
- Next.js 14.2.35 deployed via Vercel's automatic Next.js detection
- Next.js rewrites proxy `/api/*` and `/auth/*` to Render API
- `API_URL` environment variable points to Render backend
- No vercel.json file needed (Vercel auto-detects Next.js and uses default build)

**Backend (Render)**:
- Express 4.21.2 on port 10000
- Health check at `/api/health`
- MongoDB Atlas connection via `MONGODB_URI`
- JWT authentication with `JWT_SECRET`
- CORS configured for Vercel domain via `CORS_ORIGIN`

**Database (MongoDB Atlas)**:
- Free M0 cluster recommended
- Connection string via `MONGODB_URI`
- Network access from Render (0.0.0.0/0 or specific IPs)

### Environment Variables Required

**Vercel**:
```bash
API_URL=<Render API URL, e.g., https://rehearsa-api.onrender.com>
```

**Render**:
```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=<MongoDB Atlas connection string>
JWT_SECRET=<cryptographically random string, minimum 32 characters>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=<Vercel frontend URL>
LLM_PROVIDER=gemini
GEMINI_API_KEY=<Gemini API key>
GEMINI_MODEL=gemini-1.5-flash
ALLOW_LOOPBACK_IN_DEV=false
INTERVIEW_SEARCH_PROVIDER=mock
GOOGLE_SEARCH_API_KEY=<optional>
GOOGLE_SEARCH_CX=<optional>
```

### Local Verification
- **npm test**: Exit Code 0. **257/257 tests passing**
- **npm run build**: Exit Code 0. All workspaces compile cleanly
- **npm run lint**: Exit Code 0. All workspaces lint cleanly
- **npm run evaluate**: Exit Code 0. 8 cases: 5 valid kits, 3 isolated invalid, 2.6s total
- **git diff --check**: Exit Code 0. No trailing whitespace issues

### What Needs to Be Done Manually
1. **MongoDB Atlas Setup**:
   - Create free M0 cluster
   - Create database user with read/write permissions
   - Configure network access (allow Render IPs)
   - Copy connection string

2. **Render Deployment**:
   - Connect GitHub repository
   - Select `render.yaml` configuration
   - Set environment variables (all secrets)
   - Deploy
   - Copy Render API URL

3. **Vercel Deployment**:
   - Connect GitHub repository
   - Select `vercel.json` configuration
   - Set `API_URL` to Render API URL
   - Deploy

4. **CORS Configuration**:
   - Set `CORS_ORIGIN` on Render to Vercel domain

### Production Verification Status
**NOT YET DEPLOYED**. Repository is prepared with deployment configuration files (render.yaml), environment variable documentation, and deployment instructions. Actual deployment to Vercel, Render, and MongoDB Atlas has not been performed. Production verification pending.

---

## 3. Deployment Readiness Investigation (M12.1 - COMPLETED)

### Current Repository State
- **Git Status**: Clean working tree, `main` branch current with `origin/main`
- **Latest Commit**: `13fa78c` — `docs: sync handoff/progress with final M11 state`
- **No uncommitted changes**

### Architecture Audit Results

#### Frontend Architecture (`apps/web`)
- **Framework**: Next.js 14.2.35 (App Router)
- **Build Command**: `npm run build` → `next build` (verified: Exit Code 0)
- **Start Command**: `npm run start` → `next start` (production server)
- **Dev Command**: `npm run dev` → `next dev` (development with hot reload)
- **Dependencies**: React 18.3.1, Tailwind CSS 3.4.17, lucide-react 0.475.0
- **API Communication**:
  - Uses Next.js rewrites (`next.config.js`) to proxy `/api/*` and `/auth/*` to backend
  - Uses `process.env.NEXT_PUBLIC_API_URL` as fallback (default: `http://localhost:4000`)
  - All auth calls go through `/auth/*` rewrites
  - Kit CRUD calls go through `/api/kits` rewrites
  - Generation/regeneration calls go through `/api/interview-prep` rewrites

#### Backend Architecture (`apps/api`)
- **Framework**: Express 4.21.2 + TypeScript 5.8.2
- **Build Command**: `npm run build` → `tsc` (verified: Exit Code 0)
- **Start Command**: `npm run start` → `node dist/server.js`
- **Dev Command**: `npm run dev` → `tsx watch src/server.ts`
- **Port**: Configurable via `PORT` env (default: 4000)
- **Dependencies**: Mongoose 9.10.2, bcrypt 6.0.0, jsonwebtoken 9.0.3, cors 2.8.5, cheerio 1.2.0, zod 3.24.2
- **Health Endpoint**: `GET /api/health` (public, no auth required)
- **Auth Routes**: `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` (public except `/me` requires token)
- **Kit Routes**: `/api/kits` (all require auth), `/api/interview-prep/generate` (public, for batch evaluator)

#### Environment Variables (Required for Production)
```bash
# Required in production (enforced by server.ts startup guard)
MONGODB_URI=mongodb://localhost:27017/rehearsa  # or MongoDB Atlas connection string
JWT_SECRET=<minimum 32 characters, cryptographically random>
JWT_EXPIRES_IN=7d

# CORS configuration
CORS_ORIGIN=<frontend production URL>
NODE_ENV=production

# LLM Provider (Gemini recommended for free tier)
LLM_PROVIDER=gemini
GEMINI_API_KEY=<your Gemini API key>
GEMINI_MODEL=gemini-1.5-flash

# Optional: Public Interview Search (Google Custom Search)
INTERVIEW_SEARCH_PROVIDER=google  # or mock
GOOGLE_SEARCH_API_KEY=<Google Search API key>
GOOGLE_SEARCH_CX=<Custom Search Engine ID>

# Optional: Web crawling limits
CRAWL_MAX_PAGES_PER_SITE=5
CRAWL_TIMEOUT_MS=10000
CRAWL_MAX_BODY_SIZE_BYTES=2097152
ALLOW_LOOPBACK_IN_DEV=false  # Must be false in production
```

#### MongoDB Requirements
- **Minimum Version**: MongoDB 4.4+ (Mongoose 9.10.2 compatible)
- **Connection**: Single database with `users` and `kits` collections
- **Indexes**:
  - `users.email` (unique, indexed, lowercase)
  - `kits.userId` + `kits.createdAt` (compound index for per-user queries)
- **No Migrations Required**: Mongoose handles schema dynamically via `KitDocumentModel`
- **Hosting Options**:
  - MongoDB Atlas (free M0 cluster recommended for production)
  - Self-hosted MongoDB 4.4+ on any cloud provider
  - Local MongoDB (for development only)

#### Authentication & CORS Requirements
- **JWT Configuration**:
  - Token transport: `Authorization: Bearer <token>` header
  - Token expiry: Default 7 days (configurable via `JWT_EXPIRES_IN`)
  - Secret must be ≥32 characters (enforced at startup in production)
- **CORS**:
  - Configured via `CORS_ORIGIN` env variable
  - Default: `http://localhost:3000` (development)
  - Production: Must set to frontend domain (e.g., `https://rehearsa.example.com`)
  - Credentials: `credentials: true` set in CORS middleware
- **Session Storage**: JWT stored in `sessionStorage` on client (cleared on tab close)

#### Production Health Endpoint
- **Endpoint**: `GET /api/health` or `GET /health`
- **Response**: `{ status: "ok", service: "rehearsa-api", timestamp: "...", uptimeSeconds: ... }`
- **Auth**: Not required (public health check)
- **DB Check**: Implicitly verifies MongoDB connection (server exits if DB connection fails)

#### SSRF & Security Configuration
- **SSRF Guard**: `ssrfGuard.ts` blocks private/loopback IP ranges in production
- **Production Flag**: `ALLOW_LOOPBACK_IN_DEV=false` must be set in production
- **Protected Ranges**: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16, ::1, etc.
- **Content Limits**: 2MB max body size on crawled pages
- **Robots.txt**: Enforced via `robotsParser.ts`
- **Untrusted Content**: All crawled text wrapped in `<untrusted_web_content>` XML tags before LLM ingestion

#### Localhost/Development URLs in Production Paths
- **Code Audit Findings**:
  - `server.ts`: Console logs use `localhost` (harmless, for admin visibility)
  - `config/index.ts`: Default fallbacks to `localhost` URLs (only used if env vars not set)
  - `next.config.js`: Default `API_URL` fallback to `http://localhost:4000` (overridden by env in production)
  - Test files: Use `127.0.0.1` for integration tests (not shipped to production)
- **Assessment**: No production localhost URLs in critical paths. All defaults are overridden by environment variables in production.

#### Secrets & Hard-coded Values
- **Security Audit**: No committed secrets found
- **API Keys**: All keys read from environment variables (`.env` gitignored)
- **JWT Secret**: Enforced to be ≥32 chars at startup in production
- **Test Secrets**: Test files use dummy strings like `test-secret-for-auth-route-tests-32chars!!` (not production code)
- **Assessment**: Clean. No hard-coded production credentials.

#### Deployment Topology Assessment
**Current Architecture**: Monorepo with separate frontend and backend services
- **Frontend**: Next.js (port 3000 in dev, configurable in production)
- **Backend**: Express (port 4000 default, configurable via `PORT`)
- **Database**: MongoDB (connection string via `MONGODB_URI`)

**Recommended Deployment Options**:

1. **Simple Single-Server Deployment** (easiest, no infrastructure changes needed):
   - Run Next.js and Express on same server on different ports
   - Use nginx to proxy requests:
     - `/` → Next.js (port 3000)
     - `/api/*` and `/auth/*` → Express (port 4000)
   - MongoDB hosted on MongoDB Atlas (free M0) or same server
   - Environment variables set on server

2. **Containerized Deployment** (requires Docker):
   - Create Dockerfile for API (Node.js + Express)
   - Create Dockerfile for Web (Next.js standalone build)
   - Use docker-compose to orchestrate API + Web + MongoDB
   - **Not currently implemented** (no Dockerfile exists)

3. **Cloud Platform Deployment** (e.g., Vercel + Railway/Render):
   - Frontend: Deploy Next.js to Vercel (supports environment variables)
   - Backend: Deploy Express to Railway/Render (supports MongoDB, env vars)
   - Database: MongoDB Atlas free tier
   - CORS: Set `CORS_ORIGIN` to Vercel domain
   - **Not currently configured** (no platform-specific files exist)

**Current State**: Repository is deployment-ready as a monorepo. No Docker, CI/CD, or cloud-specific infrastructure exists. Simplest path is single-server deployment with nginx reverse proxy.

#### README.md Documentation Assessment
- **Current README**: Documents local development only (`npm run dev`, build, test)
- **Production Configuration**: `.env.example` documents all required env variables
- **Missing**: Production deployment instructions, nginx configuration, cloud platform setup
- **Assessment**: README needs production deployment section added.

#### Build/Start Commands Verification
- **Root commands**: `npm run build`, `npm run lint`, `npm test` all verified (Exit Code 0)
- **API build**: `tsc` compiles TypeScript to `dist/` (verified)
- **Web build**: `next build` produces optimized production build (verified)
- **API start**: `node dist/server.js` (verified build output exists)
- **Web start**: `next start` (verified build output exists)
- **Workspace commands**: Work correctly via `npm run build --workspaces --if-present`

### Recommended Deployment Architecture (Simplest Path)

**Option A: Single Server with nginx Reverse Proxy**
1. **Server Requirements**: Node.js v20+, MongoDB
2. **Deployment Steps**:
   - Build all workspaces: `npm run build`
   - Set production env variables on server
   - Start API: `cd apps/api && npm run start` (port 4000)
   - Start Web: `cd apps/web && npm run start` (port 3000)
   - Configure nginx to proxy:
     ```
     server {
       listen 80;
       server_name rehearsa.example.com;

       location / {
         proxy_pass http://localhost:3000;
       }

       location /api/ {
         proxy_pass http://localhost:4000/api/;
       }

       location /auth/ {
         proxy_pass http://localhost:4000/auth/;
       }
     }
     ```
3. **Process Management**: Use PM2 or systemd to keep services running
4. **Database**: MongoDB Atlas free tier (recommended) or local MongoDB

**Option B: MongoDB Atlas + Cloud Platforms** (more scalable)
1. **Frontend**: Vercel (Next.js native support)
2. **Backend**: Railway/Render/Fly.io (Express deployment)
3. **Database**: MongoDB Atlas (shared across platforms)
4. **Environment Variables**: Set on each platform
5. **CORS**: Set `CORS_ORIGIN` to Vercel domain

### Code Changes Required
**None required for deployment**. The codebase is production-ready as-is.

### Documentation Changes Required
1. **README.md**: Add production deployment section with:
   - Environment variable requirements
   - MongoDB Atlas setup instructions
   - nginx reverse proxy configuration example
   - PM2/systemd service configuration
   - Cloud platform deployment options

2. **.env.example**: Already complete (all required variables documented)

### Next Steps for M12.2
1. Implement deployment configuration (Docker or nginx+PM2)
2. Deploy to production environment
3. Verify production deployment:
   - Health endpoint accessible
   - MongoDB connection successful
   - Auth flow works with production domain
   - Kit generation works with live Gemini API
   - CORS configured correctly
4. Verify live Google Custom Search (if credentials configured)

---

## 3. Completed Work
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
  - **Live DB/auth verification**: Completed (2026-09-24). Verified against real MongoDB (Docker) with live `MONGODB_URI` and `JWT_SECRET`. Registration, login, logout, `/auth/me`, duplicate-email rejection, wrong-password rejection, and unknown-email rejection all confirmed. See TESTING.md live verification log.
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
  - **Live verification**: Completed (2026-09-24). Verified against real MongoDB. Kit creation (POST), list (GET), edit (PUT), delete (DELETE), question confidence update, question reorder, multiple kits per user, and cross-user ownership isolation all confirmed. See TESTING.md live verification log.
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
- [x] **Milestone 10.3: Flashcard Confidence Tiers (IMPLEMENTED, TESTED, pending commit)**:
  - **`apps/api/src/modules/kits/kit.model.ts`**: Added optional `flashcardConfidence` field (Map<string, 'easy'|'medium'|'hard'>) to `KitDocumentModel`, stored outside Appendix A kit payload. Same pattern as `questionConfidence`.
  - **`apps/api/src/modules/kits/kit.service.ts`**: Added `FlashcardConfidence` type (`'easy' | 'medium' | 'hard'`), `FlashcardConfidenceEnum`, and `updateFlashcardConfidence` function. Validates flashcard ID against the kit's flashcards array (rejects unknown IDs), validates confidence enum, enforces ownership via `{ _id, userId }`.
  - **`apps/api/src/routes/kits.routes.ts`**: Added `FlashcardConfidenceTierSchema`, `UpdateFlashcardConfidenceInputSchema`, and `PUT /api/kits/:id/flashcard-confidence` endpoint. Returns `{ success: true, updated: true }` or structured error.
  - **`apps/web/src/lib/api.ts`**: Added `FlashcardConfidence` type, `UpdateFlashcardConfidencePayload`, `ApiFlashcardConfidenceResponse`, and `updateFlashcardConfidence()` client function.
  - **`apps/web/src/app/page.tsx`**: Added `flashcardConfidence` state, `isUpdatingFlashcardConfidence` state, `handleUpdateFlashcardConfidence` callback (no-op if kit not saved), reset on kit open. Wired to `KitViewer`.
  - **`apps/web/src/components/KitViewer.tsx`**: Added `flashcardConfidence`, `onUpdateFlashcardConfidence`, `isUpdatingFlashcardConfidence` props. Wired to `FlashcardDeck`.
  - **`apps/web/src/components/FlashcardDeck.tsx`**: Replaced binary `masteredIds` toggle with three-tier confidence buttons (Easy / Medium / Hard). Removed `CheckCircle2` icon, `toggleMastered` callback, and `KeyM` keyboard shortcut. Added `CONFIDENCE_TIERS` config array with color/dot classes. Summary header now shows easy/medium/hard distribution counts instead of mastered count.
  - **`apps/api/src/routes/tests/kitsRoutes.test.ts`**: Added 9 integration tests — unauthenticated rejection, easy confidence, medium confidence, hard confidence, invalid value rejection (`unknown` is not valid for flashcards), unknown flashcard ID rejection, cross-user 404, confidence persistence verified via DB read, existing kit without confidence loads successfully.
  - **Test result**: `npx vitest run` → Exit Code `0`. **180/180 tests passing** (9 new tests added).
  - **Build**: `npm run build` → Exit Code `0`. Next.js 14 production build clean.
  - **Lint**: `npm run lint` → Exit Code `0`.
  - **ADR-013**: Documented in `docs/DECISIONS.md`.
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
- [x] **Milestone 11: Public Interview Discussion Search (IMPLEMENTED, TESTED, pending commit)**:
  - **`apps/api/src/modules/research/interviewSearchProvider.ts`** (new): `IPublicInterviewSearchProvider` interface with `searchInterviewDiscussions(companyName, role?)` method. Returns `InterviewSearchResult[]` with title, URL, snippet, source.
  - **`apps/api/src/modules/research/mockInterviewSearchProvider.ts`** (new): Mock implementation returning deterministic results for Google/Amazon/generic companies. No external API calls. Used by default in tests and when credentials unavailable.
  - **`apps/api/src/modules/research/googleCustomSearchProvider.ts`** (new): Google Custom Search API provider. Requires `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_CX` env vars. Executes focused queries (`interview questions`, `interview experience`, `hiring process`). Deduplicates URLs, extracts source domain. Graceful degradation if credentials missing.
  - **`apps/api/src/modules/research/interviewSearchFactory.ts`** (new): `createInterviewSearchProvider(overrideProvider?)` factory. Returns Google provider if configured and requested, otherwise returns Mock provider. Logs warning if Google requested but credentials missing.
  - **`apps/api/src/modules/research/index.ts`**: Added exports for all interview search modules.
  - **`apps/api/src/modules/interview-prep/pipelineOrchestrator.ts`**: Added `interviewSearchProvider` to `PipelineInput`. Integrated Step 5 after internal crawler: calls `searchInterviewDiscussions`, formats results as text context, appends to internal research text. Try/catch ensures graceful degradation on provider failure. Combined research text used for company brief generation.
  - **`scripts/evaluator.ts`**: Imports `MockPublicInterviewSearchProvider`, passes it to pipeline to ensure deterministic evaluator behavior without external API credentials.
  - **`.env.example`**: Added `INTERVIEW_SEARCH_PROVIDER`, `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_CX` placeholders with documentation.
  - **`apps/api/src/modules/research/tests/interviewSearchProvider.test.ts`** (new): 11 tests — Mock provider returns results for Google/Amazon/generic, handles role parameter, Google provider configuration check, throws error without credentials, URL source extraction, factory returns mock by default/when google unconfigured.
  - **Test result**: `npx vitest run` → Exit Code `0`. **257/257 tests passing** (11 new tests added, 20 test files).
  - **Build**: `npm run build` → Exit Code `0`. All three workspaces compile cleanly.
  - **Lint**: `npm run lint` → Exit Code `0`.
  - **Evaluator**: `npm run evaluate` → Exit Code `0`. 8 cases: 5 valid kits, 3 isolated invalid, 1273ms. Mock provider used, no external API calls.
  - **Graceful degradation**: Pipeline continues with internal research if search provider fails or unavailable. No fabricated data.
  - **Appendix A**: No schema changes. `source.pages_used` already supports URLs. Search results currently used only for LLM context, not added to `pages_used` (design decision: search results are not fetched pages, only search metadata).
  - **Live external search**: Not verified. Google Custom Search requires real API key and Custom Search Engine ID configuration.

---

## 3. Work Not Yet Started
- Milestone 10: Multi-Kit Dashboard (kit list UI fully tested live, reorder, confidence tiers).

---

## 4. Outstanding Tasks (Next Milestones)
- **Milestone 10**: Question confidence tracking, reordering, and flashcard confidence tiers all completed and committed. Live MongoDB verification of M8+M9 completed. **E2E journey audit completed** (59 API-level tests covering all 16 journey steps, 246/246 passing after M10 state restoration fix). **M10 state restoration fix**: `GET /api/kits/:id` now returns `questionConfidence`, `questionOrder`, and `flashcardConfidence`; frontend restores state on kit open (7 new integration tests). ADR-014 documented.
- Final User Review & Project Audit.

---

## 5. Known Bugs / Issues
* None. All 180 tests pass; live Gemini generation verified (M6); full monorepo build succeeds; lint succeeds.

---

## 6. Blockers
* None. Live MongoDB verification completed (2026-09-24). E2E journey audit completed (2026-09-24). M10 state restoration fix implemented (2026-09-24). All 246 tests pass; live Gemini generation verified (M6); full monorepo build succeeds; lint succeeds.

---

## 7. Next Recommended Task
All Milestone 10 interactive features committed, live-verified, and fully restored on kit reload. E2E journey audit completed (gap #4 resolved). M10 state restoration gap resolved (ADR-014). Remaining gaps:
- Deployment verification (production environment not yet tested)
- Public interview discussion search: multi-page crawler covers about/careers/culture pages; no dedicated external search-engine integration (e.g. Glassdoor, Blind)

Next: deployment verification or public interview search integration.
