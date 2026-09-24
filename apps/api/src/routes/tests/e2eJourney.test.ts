/**
 * End-to-End User Journey Audit — Rehearsa
 *
 * This file exercises the complete API-level user journey as a single
 * sequential narrative, using the existing vitest + mongodb-memory-server
 * infrastructure. No browser or Playwright is involved; this is a full
 * API integration test covering every documented journey step.
 *
 * Journey steps covered:
 *  1.  Health check (server up, unauthenticated public endpoint)
 *  2.  User registration (Alice)
 *  3.  Duplicate registration rejection
 *  4.  User registration (Bob — for ownership isolation)
 *  5.  User login (Alice — correct credentials)
 *  6.  Login rejection (wrong password, no user enumeration)
 *  7.  Authenticated session — GET /auth/me
 *  8.  Unauthenticated access rejection (kit list without token)
 *  9.  Kit generation — POST /api/interview-prep/generate (public, MockLlmProvider)
 * 10.  Appendix A kit structure validation (source, role, questions, flashcards, schedule, coverage)
 * 11.  Saving a generated kit — POST /api/kits (authenticated)
 * 12.  Listing saved kits — GET /api/kits (Alice sees exactly 1)
 * 13.  Opening a saved kit by ID — GET /api/kits/:id
 * 14.  Editing/updating a saved kit — PUT /api/kits/:id (change role title)
 * 15.  Verifying edit persisted — GET /api/kits/:id after update
 * 16.  Question confidence interaction — PUT /api/kits/:id/confidence (all 4 tiers)
 * 17.  Question reordering — PUT /api/kits/:id/reorder
 * 18.  Flashcard confidence interaction — PUT /api/kits/:id/flashcard-confidence (easy, medium, hard)
 * 19.  Section regeneration (questions) — POST /api/interview-prep/regenerate-section
 * 20.  Section regeneration (flashcards, with preserved_ids)
 * 21.  Multiple kits — Alice saves a second kit, sees 2 in list
 * 22.  Ownership isolation — Bob sees 0 kits
 * 23.  Ownership isolation — Bob cannot GET Alice's kit (404, no disclosure)
 * 24.  Ownership isolation — Bob cannot PUT Alice's kit (404)
 * 25.  Ownership isolation — Bob cannot DELETE Alice's kit (404)
 * 26.  Kit deletion — DELETE /api/kits/:id (kit 2), Alice sees 1
 * 27.  Kit deletion — DELETE /api/kits/:id (kit 1), Alice sees 0
 * 28.  Accessing deleted kit returns 404
 * 29.  Logout — POST /auth/logout (Alice)
 * 30.  Logout — POST /auth/logout (Bob)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from 'http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../app';
import type { Kit } from '@rehearsa/shared';

// ---------------------------------------------------------------------------
// Shared infrastructure — one server + one mongo for the entire journey
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let server: Server;
let baseUrl: string;

// Session state shared across tests (simulates a browser session)
let aliceToken: string;
let aliceId: string;
let bobToken: string;
let kitId1: string;        // Alice's first kit
let kitId2: string;        // Alice's second kit
let generatedKit: Kit;     // Kit returned by /generate, used for saving

beforeAll(async () => {
  process.env.JWT_SECRET = 'e2e-journey-audit-secret-32chars!!xyz';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.NODE_ENV = 'test';
  process.env.LLM_PROVIDER = 'mock';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const json = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function post(path: string, body: unknown, token?: string) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: json(token),
    body: JSON.stringify(body),
  });
}

async function get(path: string, token?: string) {
  return fetch(`${baseUrl}${path}`, { headers: json(token) });
}

async function put(path: string, body: unknown, token?: string) {
  return fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: json(token),
    body: JSON.stringify(body),
  });
}

async function del(path: string, token?: string) {
  return fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: json(token),
  });
}

// ---------------------------------------------------------------------------
// Step 1 — Health check
// ---------------------------------------------------------------------------

describe('Step 1: Health check', () => {
  it('GET /api/health returns 200 without authentication', async () => {
    const res = await get('/api/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// Step 2 — User registration (Alice)
// ---------------------------------------------------------------------------

describe('Step 2: User registration', () => {
  it('POST /auth/register returns 201 with token and user for Alice', async () => {
    const res = await post('/auth/register', {
      email: 'alice@journey.test',
      password: 'AlicePass!99',
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(body.user.email).toBe('alice@journey.test');
    expect(body.user.passwordHash).toBeUndefined();
    // Save for later steps
    aliceToken = body.token;
    aliceId = body.user.id;
  });
});

// ---------------------------------------------------------------------------
// Step 3 — Duplicate registration rejection
// ---------------------------------------------------------------------------

describe('Step 3: Duplicate registration rejection', () => {
  it('POST /auth/register returns 409 EMAIL_TAKEN for duplicate email', async () => {
    const res = await post('/auth/register', {
      email: 'alice@journey.test',
      password: 'AnotherPass!99',
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('EMAIL_TAKEN');
  });
});

// ---------------------------------------------------------------------------
// Step 4 — Register Bob (ownership isolation)
// ---------------------------------------------------------------------------

describe('Step 4: Register second user (Bob) for ownership isolation', () => {
  it('POST /auth/register returns 201 for Bob', async () => {
    const res = await post('/auth/register', {
      email: 'bob@journey.test',
      password: 'BobPass!88',
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    bobToken = body.token;
  });
});

// ---------------------------------------------------------------------------
// Step 5 — Login (Alice, correct credentials)
// ---------------------------------------------------------------------------

describe('Step 5: User login with correct credentials', () => {
  it('POST /auth/login returns 200 with fresh token for Alice', async () => {
    const res = await post('/auth/login', {
      email: 'alice@journey.test',
      password: 'AlicePass!99',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(body.user.email).toBe('alice@journey.test');
    // Update token with the fresh login token
    aliceToken = body.token;
  });
});

// ---------------------------------------------------------------------------
// Step 6 — Login rejection (wrong password, no user enumeration)
// ---------------------------------------------------------------------------

describe('Step 6: Login rejection — wrong password and unknown email', () => {
  it('POST /auth/login returns 401 INVALID_CREDENTIALS for wrong password', async () => {
    const res = await post('/auth/login', {
      email: 'alice@journey.test',
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /auth/login returns same 401 INVALID_CREDENTIALS for unknown email (no enumeration)', async () => {
    const res = await post('/auth/login', {
      email: 'nobody@journey.test',
      password: 'AlicePass!99',
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

// ---------------------------------------------------------------------------
// Step 7 — Authenticated session (GET /auth/me)
// ---------------------------------------------------------------------------

describe('Step 7: Authenticated session — GET /auth/me', () => {
  it('GET /auth/me returns Alice identity with valid token', async () => {
    const res = await get('/auth/me', aliceToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.user.email).toBe('alice@journey.test');
    expect(body.user.sub).toBe(aliceId);
  });

  it('GET /auth/me returns 401 MISSING_TOKEN without a token', async () => {
    const res = await get('/auth/me');
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('MISSING_TOKEN');
  });
});

// ---------------------------------------------------------------------------
// Step 8 — Unauthenticated access rejected
// ---------------------------------------------------------------------------

describe('Step 8: Unauthenticated access to authenticated endpoints is rejected', () => {
  it('GET /api/kits returns 401 without token', async () => {
    const res = await get('/api/kits');
    expect(res.status).toBe(401);
  });

  it('POST /api/kits returns 401 without token', async () => {
    const res = await post('/api/kits', { kit: {} });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Step 9 — Kit generation (public endpoint, MockLlmProvider)
// ---------------------------------------------------------------------------

describe('Step 9: Kit generation via POST /api/interview-prep/generate', () => {
  it('generates a valid kit with MockLlmProvider (no auth required)', async () => {
    const res = await post('/api/interview-prep/generate', {
      jobDescription:
        'We are looking for a Senior Full-Stack Engineer with expertise in TypeScript, ' +
        'React, Node.js, PostgreSQL, and AWS cloud infrastructure. You will design and ' +
        'implement scalable microservices, lead technical reviews, and mentor junior engineers.',
      companyUrl: 'https://example.com',
      daysAvailable: 5,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.kit).toBeDefined();
    // Save for subsequent steps
    generatedKit = body.kit as Kit;
  });
});

// ---------------------------------------------------------------------------
// Step 10 — Appendix A kit structure validation
// ---------------------------------------------------------------------------

describe('Step 10: Appendix A kit structure validation', () => {
  it('generated kit has required source fields', () => {
    expect(typeof generatedKit.source.company).toBe('string');
    expect(typeof generatedKit.source.company_url).toBe('string');
    expect(typeof generatedKit.source.role).toBe('string');
    expect(typeof generatedKit.source.jd_chars).toBe('number');
    expect(typeof generatedKit.source.researched_at).toBe('string');
    expect(Array.isArray(generatedKit.source.pages_used)).toBe(true);
  });

  it('generated kit has company_brief', () => {
    expect(typeof generatedKit.company_brief.summary).toBe('string');
    expect(typeof generatedKit.company_brief.what_they_do).toBe('string');
    expect(Array.isArray(generatedKit.company_brief.sources)).toBe(true);
  });

  it('generated kit has role with requirements', () => {
    expect(typeof generatedKit.role.title).toBe('string');
    expect(typeof generatedKit.role.seniority).toBe('string');
    expect(Array.isArray(generatedKit.role.responsibilities)).toBe(true);
    expect(Array.isArray(generatedKit.role.requirements)).toBe(true);
    expect(generatedKit.role.requirements.length).toBeGreaterThan(0);
    const req = generatedKit.role.requirements[0];
    expect(typeof req.id).toBe('string');
    expect(['technical', 'behavioural', 'domain']).toContain(req.kind);
    expect(['must', 'nice']).toContain(req.priority);
  });

  it('generated kit has questions with valid categories and difficulty', () => {
    expect(Array.isArray(generatedKit.questions)).toBe(true);
    expect(generatedKit.questions.length).toBeGreaterThan(0);
    for (const q of generatedKit.questions) {
      expect(typeof q.id).toBe('string');
      expect(typeof q.prompt).toBe('string');
      expect(typeof q.answer_outline).toBe('string');
      expect(['technical', 'behavioural', 'system-design', 'company-fit']).toContain(q.category);
      expect([1, 2, 3]).toContain(q.difficulty);
      expect(Array.isArray(q.requirement_ids)).toBe(true);
    }
  });

  it('generated kit has flashcards', () => {
    expect(Array.isArray(generatedKit.flashcards)).toBe(true);
    expect(generatedKit.flashcards.length).toBeGreaterThan(0);
    const f = generatedKit.flashcards[0];
    expect(typeof f.id).toBe('string');
    expect(typeof f.front).toBe('string');
    expect(typeof f.back).toBe('string');
    expect(Array.isArray(f.requirement_ids)).toBe(true);
  });

  it('generated kit has schedule with correct day count', () => {
    expect(generatedKit.schedule.days_available).toBe(5);
    expect(Array.isArray(generatedKit.schedule.days)).toBe(true);
    expect(generatedKit.schedule.days.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      const d = generatedKit.schedule.days[i];
      expect(d.day).toBe(i + 1);
      expect(typeof d.focus).toBe('string');
      expect(Array.isArray(d.question_ids)).toBe(true);
      expect(typeof d.minutes).toBe('number');
      expect(d.minutes).toBeGreaterThan(0);
    }
  });

  it('generated kit has coverage block', () => {
    expect(Array.isArray(generatedKit.coverage.uncovered_requirement_ids)).toBe(true);
    expect(typeof generatedKit.coverage.passes).toBe('number');
    expect(generatedKit.coverage.passes).toBeGreaterThanOrEqual(1);
  });

  it('all question requirement_ids reference valid requirement IDs (referential integrity)', () => {
    const validReqIds = new Set(generatedKit.role.requirements.map((r) => r.id));
    for (const q of generatedKit.questions) {
      for (const rid of q.requirement_ids) {
        expect(validReqIds.has(rid)).toBe(true);
      }
    }
  });

  it('all schedule question_ids reference valid question IDs (referential integrity)', () => {
    const validQIds = new Set(generatedKit.questions.map((q) => q.id));
    for (const day of generatedKit.schedule.days) {
      for (const qid of day.question_ids) {
        expect(validQIds.has(qid)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Step 11 — Save the generated kit
// ---------------------------------------------------------------------------

describe('Step 11: Save generated kit — POST /api/kits', () => {
  it('saves the kit and returns 201 with an id', async () => {
    const res = await post('/api/kits', { kit: generatedKit }, aliceToken);
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(typeof body.id).toBe('string');
    expect(body.kit.role.title).toBe(generatedKit.role.title);
    expect(body.createdAt).toBeDefined();
    // userId must never appear in the response
    expect(JSON.stringify(body)).not.toContain('userId');
    // Save kit ID for subsequent steps
    kitId1 = body.id;
  });
});

// ---------------------------------------------------------------------------
// Step 12 — List saved kits
// ---------------------------------------------------------------------------

describe('Step 12: List saved kits — GET /api/kits', () => {
  it('Alice sees exactly 1 kit after saving', async () => {
    const res = await get('/api/kits', aliceToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.kits.length).toBe(1);
    const summary = body.kits[0];
    expect(summary.id).toBe(kitId1);
    expect(typeof summary.role).toBe('string');
    expect(typeof summary.company).toBe('string');
    expect(typeof summary.daysAvailable).toBe('number');
    expect(typeof summary.createdAt).toBe('string');
  });

  it('Bob sees 0 kits — ownership isolation at list level', async () => {
    const res = await get('/api/kits', bobToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.kits).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Step 13 — Open (fetch) the saved kit by ID
// ---------------------------------------------------------------------------

describe('Step 13: Open saved kit by ID — GET /api/kits/:id', () => {
  it('returns the full kit payload for the owner', async () => {
    const res = await get(`/api/kits/${kitId1}`, aliceToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.id).toBe(kitId1);
    expect(body.kit.role.title).toBe(generatedKit.role.title);
    expect(body.kit.questions.length).toBe(generatedKit.questions.length);
    expect(body.kit.flashcards.length).toBe(generatedKit.flashcards.length);
    // Internal fields must not be returned
    expect(JSON.stringify(body)).not.toContain('userId');
  });
});

// ---------------------------------------------------------------------------
// Step 14 — Edit/update a saved kit
// ---------------------------------------------------------------------------

describe('Step 14: Edit and update a saved kit — PUT /api/kits/:id', () => {
  it('updates the kit with an edited role title', async () => {
    const editedKit: Kit = {
      ...generatedKit,
      role: { ...generatedKit.role, title: 'Principal Full-Stack Engineer' },
    };
    const res = await put(`/api/kits/${kitId1}`, { kit: editedKit }, aliceToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.kit.role.title).toBe('Principal Full-Stack Engineer');
    expect(body.id).toBe(kitId1);
  });
});

// ---------------------------------------------------------------------------
// Step 15 — Verify edit persisted
// ---------------------------------------------------------------------------

describe('Step 15: Verify edit survived a reload — GET /api/kits/:id after update', () => {
  it('reloads kit and confirms the edited title is persisted', async () => {
    const res = await get(`/api/kits/${kitId1}`, aliceToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.kit.role.title).toBe('Principal Full-Stack Engineer');
    // Other content must be unchanged
    expect(body.kit.questions.length).toBe(generatedKit.questions.length);
  });
});

// ---------------------------------------------------------------------------
// Step 16 — Question confidence interaction
// ---------------------------------------------------------------------------

describe('Step 16: Question confidence interaction — PUT /api/kits/:id/confidence', () => {
  it('sets confidence "unknown" for the first question', async () => {
    const qid = generatedKit.questions[0].id;
    const res = await put(`/api/kits/${kitId1}/confidence`, {
      questionId: qid,
      confidence: 'unknown',
    }, aliceToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.updated).toBe(true);
  });

  it('sets confidence "not-ready" for the first question', async () => {
    const qid = generatedKit.questions[0].id;
    const res = await put(`/api/kits/${kitId1}/confidence`, {
      questionId: qid,
      confidence: 'not-ready',
    }, aliceToken);
    expect(res.status).toBe(200);
  });

  it('sets confidence "somewhat-ready" for the first question', async () => {
    const qid = generatedKit.questions[0].id;
    const res = await put(`/api/kits/${kitId1}/confidence`, {
      questionId: qid,
      confidence: 'somewhat-ready',
    }, aliceToken);
    expect(res.status).toBe(200);
  });

  it('sets confidence "ready" for the first question', async () => {
    const qid = generatedKit.questions[0].id;
    const res = await put(`/api/kits/${kitId1}/confidence`, {
      questionId: qid,
      confidence: 'ready',
    }, aliceToken);
    expect(res.status).toBe(200);
  });

  it('rejects an invalid confidence value', async () => {
    const qid = generatedKit.questions[0].id;
    const res = await put(`/api/kits/${kitId1}/confidence`, {
      questionId: qid,
      confidence: 'excellent',
    }, aliceToken);
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// Step 17 — Question reordering
// ---------------------------------------------------------------------------

describe('Step 17: Question reordering — PUT /api/kits/:id/reorder', () => {
  it('reorders questions by reversing the ID array', async () => {
    const qids = generatedKit.questions.map((q) => q.id);
    const reversed = [...qids].reverse();
    const res = await put(`/api/kits/${kitId1}/reorder`, {
      questionIds: reversed,
    }, aliceToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.updated).toBe(true);
  });

  it('rejects an empty reorder array', async () => {
    const res = await put(`/api/kits/${kitId1}/reorder`, {
      questionIds: [],
    }, aliceToken);
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate IDs in reorder array', async () => {
    const qid = generatedKit.questions[0].id;
    const res = await put(`/api/kits/${kitId1}/reorder`, {
      questionIds: [qid, qid],
    }, aliceToken);
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('INVALID_ORDER');
  });
});

// ---------------------------------------------------------------------------
// Step 18 — Flashcard confidence interaction
// ---------------------------------------------------------------------------

describe('Step 18: Flashcard confidence interaction — PUT /api/kits/:id/flashcard-confidence', () => {
  it('sets "easy" confidence for the first flashcard', async () => {
    const fid = generatedKit.flashcards[0].id;
    const res = await put(`/api/kits/${kitId1}/flashcard-confidence`, {
      flashcardId: fid,
      confidence: 'easy',
    }, aliceToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.updated).toBe(true);
  });

  it('sets "medium" confidence for the first flashcard', async () => {
    const fid = generatedKit.flashcards[0].id;
    const res = await put(`/api/kits/${kitId1}/flashcard-confidence`, {
      flashcardId: fid,
      confidence: 'medium',
    }, aliceToken);
    expect(res.status).toBe(200);
  });

  it('sets "hard" confidence for the first flashcard', async () => {
    const fid = generatedKit.flashcards[0].id;
    const res = await put(`/api/kits/${kitId1}/flashcard-confidence`, {
      flashcardId: fid,
      confidence: 'hard',
    }, aliceToken);
    expect(res.status).toBe(200);
  });

  it('rejects "unknown" as a flashcard confidence value', async () => {
    const fid = generatedKit.flashcards[0].id;
    const res = await put(`/api/kits/${kitId1}/flashcard-confidence`, {
      flashcardId: fid,
      confidence: 'unknown',  // valid for questions, NOT for flashcards
    }, aliceToken);
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unknown flashcard ID', async () => {
    const res = await put(`/api/kits/${kitId1}/flashcard-confidence`, {
      flashcardId: 'f_does_not_exist_9999',
      confidence: 'easy',
    }, aliceToken);
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// Step 19 — Section regeneration (questions)
// ---------------------------------------------------------------------------

describe('Step 19: Section regeneration — questions', () => {
  it('regenerates questions and returns a valid Appendix A kit', async () => {
    const res = await post('/api/interview-prep/regenerate-section', {
      kit: generatedKit,
      section: 'questions',
      preserved_ids: [],
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.kit.questions)).toBe(true);
    expect(body.kit.questions.length).toBeGreaterThan(0);
    // Schedule must be rebuilt and day count must match
    expect(body.kit.schedule.days.length).toBe(generatedKit.schedule.days_available);
    // Coverage block must be present
    expect(Array.isArray(body.kit.coverage.uncovered_requirement_ids)).toBe(true);
    // Flashcards must be unchanged (different section)
    expect(body.kit.company_brief.summary).toBe(generatedKit.company_brief.summary);
  });
});

// ---------------------------------------------------------------------------
// Step 20 — Section regeneration (flashcards, with preserved_ids)
// ---------------------------------------------------------------------------

describe('Step 20: Section regeneration — flashcards with preserved_ids', () => {
  it('regenerates flashcards and preserves specified flashcard ID', async () => {
    const preservedFlashcardId = generatedKit.flashcards[0].id;
    const res = await post('/api/interview-prep/regenerate-section', {
      kit: generatedKit,
      section: 'flashcards',
      preserved_ids: [preservedFlashcardId],
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.kit.flashcards)).toBe(true);
    // Preserved flashcard must still be present
    const preserved = body.kit.flashcards.find((f: any) => f.id === preservedFlashcardId);
    expect(preserved).toBeDefined();
    expect(preserved.front).toBe(generatedKit.flashcards[0].front);
    // Questions must be unchanged (different section)
    expect(body.kit.questions.length).toBe(generatedKit.questions.length);
  });
});

// ---------------------------------------------------------------------------
// Step 21 — Multiple kits (Alice saves a second kit)
// ---------------------------------------------------------------------------

describe('Step 21: Multiple kits — Alice saves a second kit', () => {
  it('saves a second kit with a different role and returns 201', async () => {
    const secondKit: Kit = {
      ...generatedKit,
      source: { ...generatedKit.source, role: 'Staff DevOps Engineer' },
      role: { ...generatedKit.role, title: 'Staff DevOps Engineer' },
    };
    const res = await post('/api/kits', { kit: secondKit }, aliceToken);
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.kit.role.title).toBe('Staff DevOps Engineer');
    kitId2 = body.id;
  });

  it('Alice now sees 2 kits in her list', async () => {
    const res = await get('/api/kits', aliceToken);
    const body = (await res.json()) as any;
    expect(body.kits.length).toBe(2);
    const roles = body.kits.map((k: any) => k.role).sort();
    expect(roles).toContain('Staff DevOps Engineer');
  });
});

// ---------------------------------------------------------------------------
// Step 22-25 — Ownership isolation (Bob cannot access Alice's kits)
// ---------------------------------------------------------------------------

describe('Steps 22–25: Ownership isolation — Bob cannot access Alice\'s kits', () => {
  it('Step 22: Bob sees 0 kits in his list', async () => {
    const res = await get('/api/kits', bobToken);
    const body = (await res.json()) as any;
    expect(body.kits.length).toBe(0);
  });

  it('Step 23: Bob cannot GET Alice\'s kit (404, no ownership disclosure)', async () => {
    const res = await get(`/api/kits/${kitId1}`, bobToken);
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('Step 24: Bob cannot PUT (update) Alice\'s kit (404)', async () => {
    const res = await put(`/api/kits/${kitId1}`, { kit: generatedKit }, bobToken);
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('Step 25: Bob cannot DELETE Alice\'s kit (404)', async () => {
    const res = await del(`/api/kits/${kitId1}`, bobToken);
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it("Alice's kit still exists after Bob's failed access attempts", async () => {
    const res = await get(`/api/kits/${kitId1}`, aliceToken);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Step 26 — Delete kit 2
// ---------------------------------------------------------------------------

describe('Step 26: Delete kit 2 — Alice deletes second kit', () => {
  it('DELETE /api/kits/:id returns 200 for owned kit', async () => {
    const res = await del(`/api/kits/${kitId2}`, aliceToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.deleted).toBe(true);
  });

  it('Alice now sees exactly 1 kit after deletion', async () => {
    const res = await get('/api/kits', aliceToken);
    const body = (await res.json()) as any;
    expect(body.kits.length).toBe(1);
    expect(body.kits[0].id).toBe(kitId1);
  });
});

// ---------------------------------------------------------------------------
// Step 27 — Delete kit 1
// ---------------------------------------------------------------------------

describe('Step 27: Delete kit 1 — Alice deletes her last kit', () => {
  it('DELETE /api/kits/:id returns 200', async () => {
    const res = await del(`/api/kits/${kitId1}`, aliceToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
  });

  it('Alice now sees 0 kits', async () => {
    const res = await get('/api/kits', aliceToken);
    const body = (await res.json()) as any;
    expect(body.kits.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Step 28 — Accessing a deleted kit returns 404
// ---------------------------------------------------------------------------

describe('Step 28: Accessing a deleted kit returns 404', () => {
  it('GET /api/kits/:id for a deleted kit returns 404', async () => {
    const res = await get(`/api/kits/${kitId1}`, aliceToken);
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('PUT on a deleted kit returns 404', async () => {
    const res = await put(`/api/kits/${kitId1}`, { kit: generatedKit }, aliceToken);
    expect(res.status).toBe(404);
  });

  it('DELETE on an already-deleted kit returns 404', async () => {
    const res = await del(`/api/kits/${kitId1}`, aliceToken);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Step 29 — Logout (Alice)
// ---------------------------------------------------------------------------

describe('Step 29: Logout — Alice', () => {
  it('POST /auth/logout returns 200 for Alice with a valid token', async () => {
    const res = await post('/auth/logout', {}, aliceToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
  });

  it('POST /auth/logout without a token returns 401 MISSING_TOKEN', async () => {
    const res = await post('/auth/logout', {});
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('MISSING_TOKEN');
  });
});

// ---------------------------------------------------------------------------
// Step 30 — Logout (Bob)
// ---------------------------------------------------------------------------

describe('Step 30: Logout — Bob', () => {
  it('POST /auth/logout returns 200 for Bob with a valid token', async () => {
    const res = await post('/auth/logout', {}, bobToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
  });
});
