# Rehearsa — AI Interview Prep Kit Platform

> **Assessment Ref**: `FS-AI-INTERVIEW-01` (Trao Assessment)  
> **Status**: Milestone 1 (Foundation & Documentation) Complete

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
