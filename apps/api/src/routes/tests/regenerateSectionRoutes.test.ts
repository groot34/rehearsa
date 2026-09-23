import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../app';
import { Server } from 'http';
import { Kit } from '@rehearsa/shared';

// ---------------------------------------------------------------------------
// Minimal valid Appendix A kit for route-level tests
// ---------------------------------------------------------------------------

const validKit: Kit = {
  source: {
    company: 'RouteCorp',
    company_url: 'https://routecorp.example.com',
    role: 'Senior Backend Engineer',
    location: 'Remote',
    jd_chars: 600,
    researched_at: '2026-09-23T10:00:00.000Z',
    pages_used: ['https://routecorp.example.com'],
  },
  company_brief: {
    summary: 'RouteCorp builds high-performance cloud routing infrastructure.',
    what_they_do: 'Distributed routing and networking systems.',
    sources: ['https://routecorp.example.com'],
  },
  role: {
    title: 'Senior Backend Engineer',
    seniority: 'Senior',
    responsibilities: ['Design scalable APIs', 'Lead backend systems'],
    requirements: [
      { id: 'r1', text: 'TypeScript and Node.js', kind: 'technical', priority: 'must' },
      { id: 'r2', text: 'PostgreSQL', kind: 'technical', priority: 'must' },
    ],
  },
  questions: [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Explain TypeScript generics.',
      answer_outline: 'Type parameters and constraints.',
      difficulty: 2,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'technical',
      prompt: 'How do you optimise PostgreSQL queries?',
      answer_outline: 'EXPLAIN ANALYZE and indexing.',
      difficulty: 3,
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'What is a TypeScript generic?',
      back: 'A type parameter for reusable typed functions.',
      requirement_ids: ['r1'],
    },
  ],
  schedule: {
    days_available: 2,
    days: [
      { day: 1, focus: 'Technical Concepts & Coding Practice', question_ids: ['q1'], minutes: 25 },
      { day: 2, focus: 'Technical Concepts & Coding Practice', question_ids: ['q2'], minutes: 35 },
    ],
  },
  coverage: {
    uncovered_requirement_ids: [],
    passes: 1,
  },
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('POST /api/interview-prep/regenerate-section Route', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.LLM_PROVIDER = 'mock';
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------

  it('returns HTTP 400 with REGEN_INVALID_INPUT when body is empty', async () => {
    const res = await fetch(`${baseUrl}/api/interview-prep/regenerate-section`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('REGEN_INVALID_INPUT');
  });

  it('returns HTTP 400 when section is an invalid value', async () => {
    const res = await fetch(`${baseUrl}/api/interview-prep/regenerate-section`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kit: validKit,
        section: 'company_brief', // not a supported section
        preserved_ids: [],
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('REGEN_INVALID_INPUT');
  });

  it('returns HTTP 400 when kit is missing required fields', async () => {
    const res = await fetch(`${baseUrl}/api/interview-prep/regenerate-section`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kit: { source: { company: 'X' } }, // incomplete kit
        section: 'questions',
        preserved_ids: [],
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Successful regeneration
  // -------------------------------------------------------------------------

  it('returns HTTP 200 with valid Appendix A kit when regenerating questions', async () => {
    const res = await fetch(`${baseUrl}/api/interview-prep/regenerate-section`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kit: validKit,
        section: 'questions',
        preserved_ids: [],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.kit).toBeDefined();
    expect(body.kit.schedule.days_available).toBe(validKit.schedule.days_available);
    expect(body.kit.schedule.days.length).toBe(validKit.schedule.days_available);
    expect(Array.isArray(body.kit.questions)).toBe(true);
  });

  it('returns HTTP 200 with valid Appendix A kit when regenerating flashcards', async () => {
    const res = await fetch(`${baseUrl}/api/interview-prep/regenerate-section`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kit: validKit,
        section: 'flashcards',
        preserved_ids: [],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.kit).toBeDefined();
    expect(Array.isArray(body.kit.flashcards)).toBe(true);
    // Questions must be unchanged
    expect(body.kit.questions).toEqual(validKit.questions);
  });

  it('preserves the listed question ID through regeneration', async () => {
    const res = await fetch(`${baseUrl}/api/interview-prep/regenerate-section`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kit: validKit,
        section: 'questions',
        preserved_ids: ['q1'],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    const preservedQ = body.kit.questions.find((q: any) => q.id === 'q1');
    expect(preservedQ).toBeDefined();
    expect(preservedQ.prompt).toBe('Explain TypeScript generics.');
  });

  // -------------------------------------------------------------------------
  // Existing kit is never returned on failure
  // -------------------------------------------------------------------------

  it('does not return the existing kit on a 400 validation error', async () => {
    const res = await fetch(`${baseUrl}/api/interview-prep/regenerate-section`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kit: validKit,
        section: 'invalid_section',
        preserved_ids: [],
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    // No kit should be present in the error response
    expect(body.kit).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // preserved_ids with non-existent IDs are silently dropped
  // -------------------------------------------------------------------------

  it('silently drops preserved_ids that do not exist in the submitted kit', async () => {
    const res = await fetch(`${baseUrl}/api/interview-prep/regenerate-section`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kit: validKit,
        section: 'questions',
        preserved_ids: ['q_does_not_exist_9999'],
      }),
    });

    // Should succeed — non-existent IDs are ignored, not treated as errors
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    // The non-existent ID must not appear in the result
    const ghost = body.kit.questions.find((q: any) => q.id === 'q_does_not_exist_9999');
    expect(ghost).toBeUndefined();
  });
});
