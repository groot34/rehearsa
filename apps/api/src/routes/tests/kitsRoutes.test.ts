import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'http';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../app';
import { UserModel } from '../../modules/auth/user.model';
import { KitDocumentModel } from '../../modules/kits/kit.model';
import { Kit } from '@rehearsa/shared';

// ---------------------------------------------------------------------------
// Minimal valid Appendix A kit fixture
// ---------------------------------------------------------------------------

const sampleKit: Kit = {
  source: {
    company: 'TestCorp',
    company_url: 'https://testcorp.example.com',
    role: 'Senior Backend Engineer',
    location: 'Remote',
    jd_chars: 800,
    researched_at: '2026-09-23T10:00:00.000Z',
    pages_used: ['https://testcorp.example.com'],
  },
  company_brief: {
    summary: 'TestCorp builds cloud infrastructure.',
    what_they_do: 'Distributed systems.',
    sources: ['https://testcorp.example.com'],
  },
  role: {
    title: 'Senior Backend Engineer',
    seniority: 'Senior',
    responsibilities: ['Design APIs'],
    requirements: [
      { id: 'r1', text: 'TypeScript', kind: 'technical', priority: 'must' },
      { id: 'r2', text: 'PostgreSQL', kind: 'technical', priority: 'must' },
    ],
  },
  questions: [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Explain TypeScript generics.',
      answer_outline: 'Type parameters.',
      difficulty: 2,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'technical',
      prompt: 'How do you optimise PostgreSQL?',
      answer_outline: 'EXPLAIN ANALYZE.',
      difficulty: 3,
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'What is a TS generic?',
      back: 'A type parameter.',
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
  coverage: { uncovered_requirement_ids: [], passes: 1 },
};

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let server: Server;
let baseUrl: string;

// Two distinct users for ownership isolation tests
let tokenA: string;
let tokenB: string;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-for-kits-routes-tests-32chars!!';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  // Register user A
  const regA = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'usera@example.com', password: 'passwordA123' }),
  });
  tokenA = ((await regA.json()) as any).token;

  // Register user B
  const regB = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'userb@example.com', password: 'passwordB456' }),
  });
  tokenB = ((await regB.json()) as any).token;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Remove only kit documents between tests; keep users
  await KitDocumentModel.deleteMany({});
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const authHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

async function saveKit(token: string, kit = sampleKit) {
  const res = await fetch(`${baseUrl}/api/kits`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ kit }),
  });
  return { res, body: (await res.json()) as any };
}

// ---------------------------------------------------------------------------
// POST /api/kits — save a new kit
// ---------------------------------------------------------------------------

describe('POST /api/kits', () => {
  it('returns 401 without a token', async () => {
    const res = await fetch(`${baseUrl}/api/kits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kit: sampleKit }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 201 with kit and id on valid payload', async () => {
    const { res, body } = await saveKit(tokenA);
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(typeof body.id).toBe('string');
    expect(body.kit).toBeDefined();
    expect(body.kit.role.title).toBe('Senior Backend Engineer');
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it('returns 400 when kit payload is missing', async () => {
    const res = await fetch(`${baseUrl}/api/kits`, {
      method: 'POST',
      headers: authHeaders(tokenA),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when kit payload fails Appendix A validation', async () => {
    const badKit = { ...sampleKit, questions: [] }; // empty questions breaks schedule ref integrity? No — but missing role fields would
    const invalidKit = { source: { company: 'X' } }; // missing required fields
    const res = await fetch(`${baseUrl}/api/kits`, {
      method: 'POST',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ kit: invalidKit }),
    });
    expect(res.status).toBe(400);
  });

  it('does not return userId or internal fields in the response', async () => {
    const { body } = await saveKit(tokenA);
    const text = JSON.stringify(body);
    expect(text).not.toContain('userId');
    expect(text).not.toContain('passwordHash');
    expect(text).not.toContain('__v');
  });
});

// ---------------------------------------------------------------------------
// GET /api/kits — list kits
// ---------------------------------------------------------------------------

describe('GET /api/kits', () => {
  it('returns 401 without a token', async () => {
    const res = await fetch(`${baseUrl}/api/kits`);
    expect(res.status).toBe(401);
  });

  it('returns empty list when user has no kits', async () => {
    const res = await fetch(`${baseUrl}/api/kits`, { headers: authHeaders(tokenA) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.kits).toEqual([]);
  });

  it('returns only the authenticated users kits — not other users kits', async () => {
    // Save two kits for user A, one for user B
    await saveKit(tokenA);
    await saveKit(tokenA);
    await saveKit(tokenB);

    const resA = await fetch(`${baseUrl}/api/kits`, { headers: authHeaders(tokenA) });
    const bodyA = (await resA.json()) as any;
    expect(bodyA.kits.length).toBe(2);

    const resB = await fetch(`${baseUrl}/api/kits`, { headers: authHeaders(tokenB) });
    const bodyB = (await resB.json()) as any;
    expect(bodyB.kits.length).toBe(1);
  });

  it('list items are summaries (have id, role, company — not full kit payload)', async () => {
    await saveKit(tokenA);
    const res = await fetch(`${baseUrl}/api/kits`, { headers: authHeaders(tokenA) });
    const body = (await res.json()) as any;
    const item = body.kits[0];
    expect(typeof item.id).toBe('string');
    expect(typeof item.role).toBe('string');
    expect(typeof item.company).toBe('string');
    expect(typeof item.daysAvailable).toBe('number');
  });

  it('list is sorted newest first', async () => {
    await saveKit(tokenA);
    await new Promise((r) => setTimeout(r, 5)); // ensure distinct timestamps
    await saveKit(tokenA);
    const res = await fetch(`${baseUrl}/api/kits`, { headers: authHeaders(tokenA) });
    const body = (await res.json()) as any;
    expect(body.kits.length).toBe(2);
    expect(new Date(body.kits[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(body.kits[1].createdAt).getTime()
    );
  });
});

// ---------------------------------------------------------------------------
// GET /api/kits/:id — fetch one kit
// ---------------------------------------------------------------------------

describe('GET /api/kits/:id', () => {
  it('returns 401 without a token', async () => {
    const { body } = await saveKit(tokenA);
    const res = await fetch(`${baseUrl}/api/kits/${body.id}`);
    expect(res.status).toBe(401);
  });

  it('returns the full kit when owned by the authenticated user', async () => {
    const { body: saved } = await saveKit(tokenA);
    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenA),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.id).toBe(saved.id);
    expect(body.kit.role.title).toBe('Senior Backend Engineer');
  });

  it('returns 404 when the kit belongs to another user — no ownership disclosure', async () => {
    const { body: saved } = await saveKit(tokenA);
    // User B tries to read User A's kit
    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenB),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a non-existent kit ID', async () => {
    const fakeId = new Types.ObjectId().toHexString();
    const res = await fetch(`${baseUrl}/api/kits/${fakeId}`, {
      headers: authHeaders(tokenA),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 for a malformed (non-ObjectId) kit ID', async () => {
    const res = await fetch(`${baseUrl}/api/kits/not-an-objectid`, {
      headers: authHeaders(tokenA),
    });
    expect(res.status).toBe(404);
  });

  it('does not return userId or internal fields', async () => {
    const { body: saved } = await saveKit(tokenA);
    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenA),
    });
    const text = await res.text();
    expect(text).not.toContain('userId');
    expect(text).not.toContain('passwordHash');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/kits/:id — update a kit
// ---------------------------------------------------------------------------

describe('PUT /api/kits/:id', () => {
  it('returns 401 without a token', async () => {
    const { body: saved } = await saveKit(tokenA);
    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kit: sampleKit }),
    });
    expect(res.status).toBe(401);
  });

  it('updates an owned kit and returns the updated payload', async () => {
    const { body: saved } = await saveKit(tokenA);

    const updatedKit: Kit = {
      ...sampleKit,
      role: { ...sampleKit.role, title: 'Staff Engineer' },
    };

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ kit: updatedKit }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.kit.role.title).toBe('Staff Engineer');
    expect(body.id).toBe(saved.id);
  });

  it('returns 404 when trying to update another users kit', async () => {
    const { body: saved } = await saveKit(tokenA);
    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      method: 'PUT',
      headers: authHeaders(tokenB),
      body: JSON.stringify({ kit: sampleKit }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 on invalid kit payload', async () => {
    const { body: saved } = await saveKit(tokenA);
    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ kit: { source: { company: 'X' } } }),
    });
    expect(res.status).toBe(400);
  });

  it('does not allow the owner to be changed via the request body', async () => {
    const { body: saved } = await saveKit(tokenA);

    // Attempt to include a userId in the body — should be ignored
    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({
        kit: sampleKit,
        userId: new Types.ObjectId().toHexString(), // attacker-supplied owner
      }),
    });
    expect(res.status).toBe(200);

    // Verify the kit is still owned by user A — B cannot access it
    const verifyB = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenB),
    });
    expect(verifyB.status).toBe(404);
  });

  it('returns 404 for malformed kit ID', async () => {
    const res = await fetch(`${baseUrl}/api/kits/bad-id`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ kit: sampleKit }),
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/kits/:id — delete a kit
// ---------------------------------------------------------------------------

describe('DELETE /api/kits/:id', () => {
  it('returns 401 without a token', async () => {
    const { body: saved } = await saveKit(tokenA);
    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('deletes an owned kit and returns success', async () => {
    const { body: saved } = await saveKit(tokenA);

    const delRes = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      method: 'DELETE',
      headers: authHeaders(tokenA),
    });
    expect(delRes.status).toBe(200);
    const body = (await delRes.json()) as any;
    expect(body.success).toBe(true);
    expect(body.deleted).toBe(true);

    // Verify it's actually gone
    const getRes = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenA),
    });
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when trying to delete another users kit', async () => {
    const { body: saved } = await saveKit(tokenA);
    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      method: 'DELETE',
      headers: authHeaders(tokenB),
    });
    expect(res.status).toBe(404);

    // Original kit must still exist for user A
    const getRes = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenA),
    });
    expect(getRes.status).toBe(200);
  });

  it('returns 404 for a non-existent kit', async () => {
    const fakeId = new Types.ObjectId().toHexString();
    const res = await fetch(`${baseUrl}/api/kits/${fakeId}`, {
      method: 'DELETE',
      headers: authHeaders(tokenA),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 for malformed kit ID', async () => {
    const res = await fetch(`${baseUrl}/api/kits/not-an-id`, {
      method: 'DELETE',
      headers: authHeaders(tokenA),
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Edit survival: save → reload → edit → update
// ---------------------------------------------------------------------------

describe('Edit survival: save → reload → update', () => {
  it('preserves edited content through save, reload, and update cycle', async () => {
    // 1. Save original kit
    const { body: saved } = await saveKit(tokenA);
    expect(saved.kit.role.title).toBe('Senior Backend Engineer');

    // 2. Simulate user editing the kit (change role title)
    const editedKit: Kit = {
      ...sampleKit,
      role: { ...sampleKit.role, title: 'Principal Engineer' },
    };

    // 3. Update the saved kit with the edit
    const updateRes = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ kit: editedKit }),
    });
    expect(updateRes.status).toBe(200);

    // 4. Reload the kit from the server
    const reloadRes = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenA),
    });
    const reloaded = (await reloadRes.json()) as any;

    // 5. Edited content must survive
    expect(reloaded.kit.role.title).toBe('Principal Engineer');
  });
});

// ---------------------------------------------------------------------------
// Multiple kits per user
// ---------------------------------------------------------------------------

describe('Multiple kits per user', () => {
  it('supports saving and listing multiple kits for the same user', async () => {
    const kitA2: Kit = { ...sampleKit, role: { ...sampleKit.role, title: 'Frontend Engineer' } };
    const kitA3: Kit = { ...sampleKit, role: { ...sampleKit.role, title: 'DevOps Lead' } };

    await saveKit(tokenA, sampleKit);
    await saveKit(tokenA, kitA2);
    await saveKit(tokenA, kitA3);

    const res = await fetch(`${baseUrl}/api/kits`, { headers: authHeaders(tokenA) });
    const body = (await res.json()) as any;
    expect(body.kits.length).toBe(3);

    const roles = body.kits.map((k: any) => k.role).sort();
    expect(roles).toContain('Senior Backend Engineer');
    expect(roles).toContain('Frontend Engineer');
    expect(roles).toContain('DevOps Lead');
  });
});

// ---------------------------------------------------------------------------
// Question confidence tracking
// ---------------------------------------------------------------------------

describe('Question confidence tracking', () => {
  it('updates confidence for a question in an owned kit', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionId: 'q1', confidence: 'ready' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.updated).toBe(true);
  });

  it('rejects invalid confidence values', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionId: 'q1', confidence: 'invalid-value' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when updating confidence for another users kit', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenB),
      body: JSON.stringify({ questionId: 'q1', confidence: 'ready' }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for non-existent kit when updating confidence', async () => {
    const fakeId = new Types.ObjectId().toHexString();
    const res = await fetch(`${baseUrl}/api/kits/${fakeId}/confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionId: 'q1', confidence: 'ready' }),
    });
    expect(res.status).toBe(404);
  });

  it('accepts all valid confidence values', async () => {
    const { body: saved } = await saveKit(tokenA);
    const validConfidences = ['unknown', 'not-ready', 'somewhat-ready', 'ready'] as const;

    for (const confidence of validConfidences) {
      const res = await fetch(`${baseUrl}/api/kits/${saved.id}/confidence`, {
        method: 'PUT',
        headers: authHeaders(tokenA),
        body: JSON.stringify({ questionId: 'q1', confidence }),
      });
      expect(res.status).toBe(200);
    }
  });
});

// ---------------------------------------------------------------------------
// Question reordering
// ---------------------------------------------------------------------------

describe('Question reordering', () => {
  it('reorders questions in an owned kit', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/reorder`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionIds: ['q2', 'q1'] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.updated).toBe(true);
  });

  it('rejects empty question order array', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/reorder`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionIds: [] }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate question IDs in order', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/reorder`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionIds: ['q1', 'q1'] }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('INVALID_ORDER');
  });

  it('returns 404 when reordering another users kit', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/reorder`, {
      method: 'PUT',
      headers: authHeaders(tokenB),
      body: JSON.stringify({ questionIds: ['q1', 'q2'] }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for non-existent kit when reordering', async () => {
    const fakeId = new Types.ObjectId().toHexString();
    const res = await fetch(`${baseUrl}/api/kits/${fakeId}/reorder`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionIds: ['q1', 'q2'] }),
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Flashcard confidence tracking (M10.3)
// ---------------------------------------------------------------------------

describe('Flashcard confidence tracking', () => {
  it('returns 401 without a token', async () => {
    const { body: saved } = await saveKit(tokenA);
    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/flashcard-confidence`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flashcardId: 'f1', confidence: 'easy' }),
    });
    expect(res.status).toBe(401);
  });

  it('sets easy confidence for a flashcard in an owned kit', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/flashcard-confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ flashcardId: 'f1', confidence: 'easy' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.updated).toBe(true);
  });

  it('sets medium confidence for a flashcard in an owned kit', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/flashcard-confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ flashcardId: 'f1', confidence: 'medium' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
  });

  it('sets hard confidence for a flashcard in an owned kit', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/flashcard-confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ flashcardId: 'f1', confidence: 'hard' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
  });

  it('rejects invalid confidence values', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/flashcard-confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ flashcardId: 'f1', confidence: 'unknown' }), // valid for questions, not for flashcards
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects unknown flashcard IDs', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/flashcard-confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ flashcardId: 'f999', confidence: 'easy' }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when updating another users kit flashcard confidence', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}/flashcard-confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenB),
      body: JSON.stringify({ flashcardId: 'f1', confidence: 'easy' }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('confidence survives after reload (GET kit after setting confidence)', async () => {
    const { body: saved } = await saveKit(tokenA);

    // Set confidence for f1
    await fetch(`${baseUrl}/api/kits/${saved.id}/flashcard-confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ flashcardId: 'f1', confidence: 'hard' }),
    });

    // Reload the kit document from the DB and verify confidence was stored
    const { KitDocumentModel: KitModel } = await import('../../modules/kits/kit.model');
    const doc = await KitModel.findById(saved.id);
    expect(doc).not.toBeNull();
    // Mongoose Map — access via .get()
    const storedConfidence = (doc!.flashcardConfidence as any)?.get?.('f1') ?? (doc!.flashcardConfidence as any)?.['f1'];
    expect(storedConfidence).toBe('hard');
  });

  it('existing kit without flashcard confidence still loads successfully', async () => {
    const { body: saved } = await saveKit(tokenA);
    // Do NOT set any flashcard confidence — simulate a pre-M10.3 kit

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenA),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.kit.flashcards).toBeDefined();
    expect(body.kit.flashcards[0].id).toBe('f1');
  });
});

// ---------------------------------------------------------------------------
// GET /api/kits/:id — M10 state restoration (questionConfidence, questionOrder,
// flashcardConfidence returned in response after being set)
// ---------------------------------------------------------------------------

describe('GET /api/kits/:id — M10 state restoration', () => {
  it('returns no M10 fields when none have been set (fresh kit)', async () => {
    const { body: saved } = await saveKit(tokenA);

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenA),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    // Fields must be absent (not set to null or empty objects) on a fresh kit
    expect(body.questionConfidence).toBeUndefined();
    expect(body.questionOrder).toBeUndefined();
    expect(body.flashcardConfidence).toBeUndefined();
  });

  it('returns questionConfidence in GET response after it has been set', async () => {
    const { body: saved } = await saveKit(tokenA);

    // Set confidence for q1
    await fetch(`${baseUrl}/api/kits/${saved.id}/confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionId: 'q1', confidence: 'ready' }),
    });

    // Set confidence for q2
    await fetch(`${baseUrl}/api/kits/${saved.id}/confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionId: 'q2', confidence: 'not-ready' }),
    });

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenA),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.questionConfidence).toBeDefined();
    expect(body.questionConfidence['q1']).toBe('ready');
    expect(body.questionConfidence['q2']).toBe('not-ready');
  });

  it('returns questionOrder in GET response after it has been set', async () => {
    const { body: saved } = await saveKit(tokenA);

    await fetch(`${baseUrl}/api/kits/${saved.id}/reorder`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionIds: ['q2', 'q1'] }),
    });

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenA),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.questionOrder).toBeDefined();
    expect(body.questionOrder).toEqual(['q2', 'q1']);
  });

  it('returns flashcardConfidence in GET response after it has been set', async () => {
    const { body: saved } = await saveKit(tokenA);

    await fetch(`${baseUrl}/api/kits/${saved.id}/flashcard-confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ flashcardId: 'f1', confidence: 'medium' }),
    });

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenA),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.flashcardConfidence).toBeDefined();
    expect(body.flashcardConfidence['f1']).toBe('medium');
  });

  it('returns all three M10 fields when all have been set', async () => {
    const { body: saved } = await saveKit(tokenA);

    await fetch(`${baseUrl}/api/kits/${saved.id}/confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionId: 'q1', confidence: 'somewhat-ready' }),
    });
    await fetch(`${baseUrl}/api/kits/${saved.id}/reorder`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionIds: ['q2', 'q1'] }),
    });
    await fetch(`${baseUrl}/api/kits/${saved.id}/flashcard-confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ flashcardId: 'f1', confidence: 'hard' }),
    });

    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenA),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.questionConfidence['q1']).toBe('somewhat-ready');
    expect(body.questionOrder).toEqual(['q2', 'q1']);
    expect(body.flashcardConfidence['f1']).toBe('hard');
    // Core kit payload must still be intact
    expect(body.kit.role.title).toBe('Senior Backend Engineer');
    // M10 fields must not bleed into the Appendix A kit object
    expect(body.kit.questionConfidence).toBeUndefined();
    expect(body.kit.questionOrder).toBeUndefined();
    expect(body.kit.flashcardConfidence).toBeUndefined();
  });

  it('M10 state is not visible to another user (ownership isolation preserved)', async () => {
    const { body: saved } = await saveKit(tokenA);

    // Set some M10 state on User A's kit
    await fetch(`${baseUrl}/api/kits/${saved.id}/confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionId: 'q1', confidence: 'ready' }),
    });

    // User B attempts to GET the kit — must receive 404, not the M10 state
    const res = await fetch(`${baseUrl}/api/kits/${saved.id}`, {
      headers: authHeaders(tokenB),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
    // M10 data must never be disclosed to a non-owner
    expect(body.questionConfidence).toBeUndefined();
    expect(body.questionOrder).toBeUndefined();
    expect(body.flashcardConfidence).toBeUndefined();
  });

  it('M10 state does not appear in GET /api/kits list response (summaries only)', async () => {
    const { body: saved } = await saveKit(tokenA);

    await fetch(`${baseUrl}/api/kits/${saved.id}/confidence`, {
      method: 'PUT',
      headers: authHeaders(tokenA),
      body: JSON.stringify({ questionId: 'q1', confidence: 'ready' }),
    });

    const res = await fetch(`${baseUrl}/api/kits`, {
      headers: authHeaders(tokenA),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    const summary = body.kits[0];
    // Summary must not expose M10 or internal fields
    expect(summary.questionConfidence).toBeUndefined();
    expect(summary.questionOrder).toBeUndefined();
    expect(summary.flashcardConfidence).toBeUndefined();
    expect(summary.kit).toBeUndefined();
  });
});
