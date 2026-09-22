# Changelog — Rehearsa

All notable changes to the Rehearsa project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
