# Rehearsa — AI Interview Prep Kit Platform

> **Assessment Ref**: `FS-AI-INTERVIEW-01` (Trao Assessment)  
> **Status**: Milestones 8 + 9 implemented; automated verification complete, live MongoDB verification pending

Rehearsa is a full-stack, AI-powered interview preparation platform. By providing a job description, target company URL, and available preparation days (1–60), Rehearsa orchestrates a multi-step research and generation pipeline to produce a tailored interview prep kit with role requirements, categorized questions, flashcards, and a day-by-day study schedule.

---

## Key Features & Capabilities

- **11-Step Sequenced Research Pipeline**: Dynamic company link crawling, hiring research, requirement extraction, multi-category question generation, and flashcards.
- **Deterministic Verification**: Application-level set-difference coverage checking (Pass 2 missing requirement filling) and algorithmic day-by-day study schedule allocation.
- **Exact Appendix A Schema Compliance**: Strict JSON structure and referential integrity across requirements, questions, flashcards, and study days.
- **Interactive Customization**: Full CRUD on generated kit items, section-level regeneration without destroying manual user edits.
- **Flashcard Practice Mode**: Flip-card rehearsal with confidence rating and progress tracking.
- **Headless Batch Evaluator**: High-throughput CLI evaluation runner adhering to the Appendix B envelope contract.

---

## Architecture & Monorepo Structure

```
rehearsa/
├── apps/
│   ├── api/             # Express.js REST API & Backend Service (TypeScript)
│   └── web/             # Next.js 14+ (App Router) & Tailwind CSS Frontend
├── packages/
│   └── shared/          # Appendix A/B Zod schemas, types, and deterministic logic
├── docs/                # Comprehensive permanent project documentation
│   ├── ASSESSMENT.md    # Requirements traceability checklist
│   ├── ARCHITECTURE.md  # Detailed system design & boundaries
│   ├── DECISIONS.md     # Architectural Decision Records (ADRs)
│   ├── PROGRESS.md      # Live milestone & task tracking
│   ├── AGENT_HANDOFF.md # Coding agent handoff briefing
│   ├── CHANGELOG.md     # Chronological change log
│   └── TESTING.md       # Test strategy & commands
├── scripts/             # Batch evaluator and utilities
├── AGENTS.md            # Mandatory rules for AI coding agents
├── PROJECT_CONTEXT.md   # Core specifications & pipeline reference
├── package.json         # Root npm workspaces configuration
└── .env.example         # Environment template
```

---

## Getting Started

### Prerequisites
- Node.js `v20+` or `v24+`
- npm `v10+`

### Installation
```bash
# Clone the repository and install dependencies across all workspaces
npm install
```

### Development
```bash
# Run backend and frontend concurrently in development mode
npm run dev

# Or run services individually:
npm run dev --workspace=apps/api
npm run dev --workspace=apps/web
```

### Build & Typecheck
```bash
npm run build
npm run lint
```

### Testing
```bash
npm test
```

### Headless Batch Evaluation
```bash
npm run evaluate -- --input cases.json --output kits.json
```

---

## Production Deployment

### Deployment Architecture

Rehearsa is designed for deployment across separate platforms:

- **Frontend**: Vercel (Next.js)
- **Backend**: Render (Express API)
- **Database**: MongoDB Atlas

### Deployment Files

- `render.yaml`: Render configuration for Express API backend
- Vercel deployment: Uses automatic Next.js detection (no configuration file needed)

### Environment Variables

#### Vercel (Frontend)
```bash
API_URL=<Render API URL, e.g., https://rehearsa-api.onrender.com>
```

#### Render (Backend)
```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=<MongoDB Atlas connection string>
JWT_SECRET=<cryptographically random string, minimum 32 characters>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=<Vercel frontend URL, e.g., https://rehearsa.vercel.app>
LLM_PROVIDER=gemini
GEMINI_API_KEY=<Gemini API key>
GEMINI_MODEL=gemini-1.5-flash
ALLOW_LOOPBACK_IN_DEV=false
INTERVIEW_SEARCH_PROVIDER=mock
GOOGLE_SEARCH_API_KEY=<optional Google Search API key>
GOOGLE_SEARCH_CX=<optional Custom Search Engine ID>
```

#### MongoDB Atlas
- Create free M0 cluster
- Create database user with read/write permissions
- Network access: Allow access from Render (0.0.0.0/0 or specific Render IP ranges)
- Copy connection string (contains user/password)

### Deployment Steps

1. **MongoDB Atlas Setup**
   - Create free M0 cluster
   - Create database user
   - Configure network access
   - Copy connection string

2. **Render Deployment**
   - Connect GitHub repository
   - Use `render.yaml` configuration
   - Set environment variables (all except `NODE_ENV`, `PORT`, `LLLM_PROVIDER`, `ALLOW_LOOPBACK_IN_DEV`, `INTERVIEW_SEARCH_PROVIDER`)
   - Deploy
   - Copy Render API URL

3. **Vercel Deployment**
   - Connect GitHub repository
   - Vercel auto-detects Next.js and uses default build settings
   - Set `API_URL` to Render API URL
   - Deploy

4. **CORS Configuration**
   - Set `CORS_ORIGIN` on Render to Vercel domain
   - This allows frontend to call backend API

### Health Check

- Render health endpoint: `https://<your-app-name>.onrender.com/api/health` (example URL)
- Should return: `{ status: "ok", service: "rehearsa-api", timestamp: "...", uptimeSeconds: ... }`

---

## Documentation Index

- [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md): Mandatory operating rules for AI coding agents.
- [`PROJECT_CONTEXT.md`](file:///d:/Assignemt/Rehearsa/PROJECT_CONTEXT.md): Project overview, Appendix A/B contracts, and pipeline invariants.
- [`docs/AGENT_HANDOFF.md`](file:///d:/Assignemt/Rehearsa/docs/AGENT_HANDOFF.md): Current handoff status and next tasks.
- [`docs/ASSESSMENT.md`](file:///d:/Assignemt/Rehearsa/docs/ASSESSMENT.md): Assessment criteria mapping.
- [`docs/ARCHITECTURE.md`](file:///d:/Assignemt/Rehearsa/docs/ARCHITECTURE.md): Component diagrams, SSRF safeguards, data flow.
- [`docs/DECISIONS.md`](file:///d:/Assignemt/Rehearsa/docs/DECISIONS.md): Architectural decisions log.

---

## License
Proprietary — Engineering Assessment Submission.
