# Rehearsa — Project Context

## 1. Project Overview

* **Project Name**: Rehearsa
* **Type**: Full-stack AI-powered interview preparation platform
* **Assessment ID**: `FS-AI-INTERVIEW-01`
* **Original Assessment Source**: Trao — Full-Stack Engineering Assessment: The AI Interview Prep Kit (11-page specification)

### Purpose
Rehearsa allows a candidate to input:
1. A job description (pasted text).
2. The company website URL.
3. The number of days available before their scheduled interview (1–60 days).

The platform autonomously conducts research on the target company and role hiring nuances, extracts technical and behavioural requirements, generates a structured preparation kit, validates coverage deterministically, arranges a day-by-day study schedule, and provides interactive practice and customisation without overwriting manual user edits.

---

## 2. Core Workflows & User Journey

1. **Authentication & Isolation**:
   - Secure registration, login, and session management.
   - Users can only view, create, edit, and delete their own interview preparation kits.
2. **Kit Generation Flow**:
   - User inputs JD text, target company URL, and available preparation days (1–60).
   - Real-time progress updates are shown as the multi-stage research and generation pipeline executes.
   - Graceful error reporting if specific stages or the whole process encounters an unrecoverable failure.
3. **Interactive Kit Builder & Customization**:
   - **Company Brief**: Overview, mission/products, and sourced insights.
   - **Role Breakdown**: Responsibilities and prioritized requirements (technical, behavioural, domain).
   - **Question Bank**: Categorized questions (`technical`, `behavioural`, `system-design`, `company-fit`) mapped to specific requirement IDs with difficulty ratings (1–3) and outline answers.
   - **Flashcards**: Quick recall cards mapped to requirement IDs for active revision.
   - **Study Schedule**: Day-by-day allocation of question topics and practice time totaling the requested preparation days.
   - **Granular Editing & Regeneration**: Users can edit, reorder, add, or delete any content. Users can trigger section-level regeneration without losing manual edits made elsewhere.
4. **Flashcard Practice Mode**:
   - Interactive flip cards, self-assessment confidence recording, and revision progress indicators.
5. **Batch Evaluation CLI**:
   - Headless evaluation tool for benchmark cases matching the Appendix B envelope contract.

---

## 3. Mandatory Assessment Pipeline & Sequences

A single naive LLM prompt generating the entire kit is strictly forbidden. The generation pipeline must follow this 11-step sequence:

```
[1. Extract JD Requirements] ──> [2. Retrieve & Clean Seed Pages]
              │
              ▼
[3. Dynamic Crawl & Rank Company Links] ──> [4. Search Company Hiring Info]
              │
              ▼
[5. Search Public Interview Discussions] ──> [6. Generate Category Questions]
              │
              ▼
[7. Generate Flashcards & Company Brief] ──> [8. Deterministic Coverage Check]
              │
              ▼
[9. Pass 2: Generate Missing Questions] ──> [10. Deterministic Schedule Allocation]
              │
              ▼
[11. Final Schema Validation & Persistence]
```

### Pipeline Invariants
* **Deterministic Coverage Verification**: Step 8 checks which requirements from Step 1 lack linked questions in Step 6. This must be computed using deterministic application code (set differences), **not** by asking an LLM.
* **Second Pass Generation**: Step 9 issues focused LLM queries specifically for requirements identified as uncovered in Step 8.
* **Deterministic Schedule Allocation**: Step 10 distributes questions across available days (1–60) based on category balance, difficulty, and available minutes using deterministic algorithms.
* **Security & SSRF Mitigation**: URL fetching must validate targets, block private/loopback IP ranges in production, restrict MIME types and payload sizes, respect `robots.txt`, and treat all crawled text as untrusted data.

---

## 4. Exact Appendix A Kit Structure

All generated, persisted, and evaluated kits must conform strictly to the Appendix A JSON schema:

```json
{
  "source": {
    "company": "ExampleCorp",
    "company_url": "https://example.com",
    "role": "Senior Full-Stack Engineer",
    "location": "Remote / San Francisco",
    "jd_chars": 2450,
    "researched_at": "2026-09-22T14:30:00.000Z",
    "pages_used": [
      "https://example.com",
      "https://example.com/about",
      "https://example.com/careers"
    ]
  },
  "company_brief": {
    "summary": "High-level overview of company mission and culture.",
    "what_they_do": "Detailed breakdown of products and tech stack.",
    "sources": ["https://example.com/about"]
  },
  "role": {
    "title": "Senior Full-Stack Engineer",
    "seniority": "Senior",
    "responsibilities": [
      "Architect and build responsive web applications."
    ],
    "requirements": [
      {
        "id": "r1",
        "text": "Extensive experience with TypeScript and Node.js",
        "kind": "technical",
        "priority": "must"
      }
    ]
  },
  "questions": [
    {
      "id": "q1",
      "requirement_ids": ["r1"],
      "category": "technical",
      "prompt": "How do you manage async error propagation in Node.js streams?",
      "answer_outline": "Discuss stream pipeline, unhandled errors, and backpressure handling.",
      "difficulty": 2
    }
  ],
  "flashcards": [
    {
      "id": "f1",
      "front": "What is backpressure in Node.js streams?",
      "back": "A mechanism that regulates the flow of data when the reader cannot keep up with the writer.",
      "requirement_ids": ["r1"]
    }
  ],
  "schedule": {
    "days_available": 5,
    "days": [
      {
        "day": 1,
        "focus": "Core Architecture & Backend Mastery",
        "question_ids": ["q1"],
        "minutes": 60
      }
    ]
  },
  "coverage": {
    "uncovered_requirement_ids": [],
    "passes": 2
  }
}
```

### Schema Constraints
* `requirement.kind`: `"technical"` | `"behavioural"` | `"domain"`
* `requirement.priority`: `"must"` | `"nice"`
* `question.category`: `"technical"` | `"behavioural"` | `"system-design"` | `"company-fit"`
* `question.difficulty`: integer between `1` and `3`
* `schedule.days_available`: integer between `1` and `60`
* `schedule.days`: array whose length equals `schedule.days_available`
* `schedule.days[i].minutes`: integer minutes (e.g., `45`, `60`, `90`)
* **Referential Integrity**: Every question's `requirement_ids` must refer to valid requirement IDs in `role.requirements`. Every scheduled `question_ids` entry must refer to a valid question ID in `questions`. Every flashcard's `requirement_ids` must refer to valid requirement IDs.

---

## 5. Mandatory Batch CLI Entry Point

The repository must provide a CLI command:
```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

### Evaluation Output Envelope (Appendix B)
```json
{
  "version": "1.0",
  "generated_at": "2026-09-22T15:00:00.000Z",
  "kits": [
    {
      "id": "case-01",
      "status": "ok",
      "kit": { /* Conforming Appendix A Kit */ },
      "error": null
    },
    {
      "id": "case-04",
      "status": "failed",
      "kit": null,
      "error": {
        "code": "COMPANY_UNREACHABLE",
        "message": "Company site unreachable after 3 retries."
      }
    }
  ]
}
```

### Operational Batch Requirements
* Executes with the same core research & generation pipeline as the web application.
* Handles an array of cases with `id`, `jd`, `company_url`, `days`.
* Follows relative links and supports local mock/test company sites.
* Continues execution when individual cases fail.
* Completes 5 cases within 15 minutes.
* Reads API keys/credentials from environment variables.

---

## 6. Technical Stack Summary

* **Monorepo Architecture**: npm workspaces (`apps/web`, `apps/api`, `packages/shared`).
* **Frontend (`apps/web`)**: Next.js (App Router), React, Tailwind CSS.
* **Backend (`apps/api`)**: Node.js, Express, TypeScript.
* **Shared Layer (`packages/shared`)**: Shared Zod schemas, TypeScript types, constants, and utilities.
* **Database**: MongoDB (Mongoose or native driver).
* **LLM Provider**: Flexible abstraction supporting providers with a free tier (e.g., Google Gemini, Groq, or OpenAI-compatible).

---

## 7. Current Project State & Milestones

* **Current Milestone**: `Milestone 9 — Kit Persistence + User-Scoped CRUD`
* **Repository State**: Milestones 8 and 9 are implemented in the working tree. Automated auth, ownership, build, lint, and batch verification pass; live MongoDB/auth verification remains pending.
* **Git Status**: Git is initialized on `main`; the M8/M9 implementation is uncommitted and must be preserved until the project owner authorizes a commit.

---

## 8. Permanent Documentation References

* [`AGENTS.md`](file:///d:/Assignemt/Rehearsa/AGENTS.md): Mandatory rules and instructions for coding agents.
* [`docs/AGENT_HANDOFF.md`](file:///d:/Assignemt/Rehearsa/docs/AGENT_HANDOFF.md): Immediate handoff document for the next developer/agent.
* [`docs/ASSESSMENT.md`](file:///d:/Assignemt/Rehearsa/docs/ASSESSMENT.md): Requirement traceability matrix for `FS-AI-INTERVIEW-01`.
* [`docs/ARCHITECTURE.md`](file:///d:/Assignemt/Rehearsa/docs/ARCHITECTURE.md): Detailed system design, data flow, and boundaries.
* [`docs/DECISIONS.md`](file:///d:/Assignemt/Rehearsa/docs/DECISIONS.md): Architectural Decision Records (ADRs).
* [`docs/PROGRESS.md`](file:///d:/Assignemt/Rehearsa/docs/PROGRESS.md): Live task status, test executions, and known issues.
* [`docs/TESTING.md`](file:///d:/Assignemt/Rehearsa/docs/TESTING.md): Verification and testing guide.
* [`docs/CHANGELOG.md`](file:///d:/Assignemt/Rehearsa/docs/CHANGELOG.md): Project change log.
