import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Kit } from '@rehearsa/shared';
import {
  createSession,
  getSessionById,
  convertSessionToKit,
  updateSessionQuestionConfidence,
  reorderSessionQuestions,
  updateSessionFlashcardConfidence,
} from '../session.service';
import { SessionDocumentModel } from '../session.model';
import { registerUser } from '../../auth/auth.service';
import { saveKit } from '../../kits/kit.service';

describe('Session Service', () => {
  let mongoServer: MongoMemoryServer;
  let testUserId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create a test user for conversion tests
    const userResult = await registerUser({
      email: 'session-test@example.com',
      password: 'TestPassword123!',
    });
    if (userResult.success && userResult.data?.user) {
      testUserId = userResult.data.user.id;
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const createMockKit = (): Kit => ({
    source: {
      company: 'TestCorp',
      company_url: 'https://testcorp.com',
      role: 'Senior Engineer',
      location: 'Remote',
      jd_chars: 1000,
      researched_at: new Date().toISOString(),
      pages_used: ['https://testcorp.com'],
    },
    company_brief: {
      summary: 'Test company brief',
      what_they_do: 'Test description',
      sources: ['https://testcorp.com/about'],
    },
    role: {
      title: 'Senior Engineer',
      seniority: 'Senior',
      responsibilities: ['Build systems'],
      requirements: [
        { id: 'r1', text: 'TypeScript', kind: 'technical', priority: 'must' },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'What is TypeScript?',
        answer_outline: 'TypeScript is a superset of JavaScript',
        difficulty: 2,
      },
    ],
    flashcards: [
      {
        id: 'f1',
        front: 'What is TypeScript?',
        back: 'TypeScript is a superset of JavaScript',
        requirement_ids: ['r1'],
      },
    ],
    schedule: {
      days_available: 1,
      days: [
        {
          day: 1,
          focus: 'TypeScript',
          question_ids: ['q1'],
          minutes: 60,
        },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 2,
    },
  });

  describe('createSession', () => {
    it('creates a session with a high-entropy session ID', async () => {
      const kit = createMockKit();
      const result = await createSession(kit);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/); // UUID v4 format
      expect(result.data?.kit).toEqual(kit);
      expect(result.data?.createdAt).toBeDefined();
      expect(result.data?.lastAccessedAt).toBeDefined();
    });

    it('stores the kit payload verbatim', async () => {
      const kit = createMockKit();
      const result = await createSession(kit);

      expect(result.success).toBe(true);
      const sessionId = result.data?.sessionId;

      const doc = await SessionDocumentModel.findOne({ sessionId });
      expect(doc).toBeDefined();
      expect(doc?.kit).toEqual(kit);
    });
  });

  describe('getSessionById', () => {
    it('fetches a session by ID and updates lastAccessedAt', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const getResult = await getSessionById(sessionId!);

      expect(getResult.success).toBe(true);
      expect(getResult.data?.sessionId).toBe(sessionId);
      expect(getResult.data?.kit).toEqual(kit);
      expect(getResult.data?.lastAccessedAt).toBeDefined();

      // Verify lastAccessedAt was updated
      const doc = await SessionDocumentModel.findOne({ sessionId });
      expect(doc?.lastAccessedAt.getTime()).toBeGreaterThan(doc?.createdAt.getTime() || 0);
    });

    it('returns NOT_FOUND for non-existent session', async () => {
      const result = await getSessionById('non-existent-session-id');
      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.statusCode).toBe(404);
    });

    it('returns NOT_FOUND for invalid session ID', async () => {
      const result = await getSessionById('');
      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.statusCode).toBe(404);
    });

    it('returns questionConfidence when set', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      await updateSessionQuestionConfidence(sessionId!, 'q1', 'ready');

      const getResult = await getSessionById(sessionId!);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.questionConfidence).toEqual({ q1: 'ready' });
    });

    it('returns questionOrder when set', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      await reorderSessionQuestions(sessionId!, ['q1']);

      const getResult = await getSessionById(sessionId!);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.questionOrder).toEqual(['q1']);
    });

    it('returns flashcardConfidence when set', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      await updateSessionFlashcardConfidence(sessionId!, 'f1', 'easy');

      const getResult = await getSessionById(sessionId!);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.flashcardConfidence).toEqual({ f1: 'easy' });
    });
  });

  describe('convertSessionToKit', () => {
    it('converts a session to a user-owned kit and deletes the session', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      const convertResult = await convertSessionToKit(sessionId!, testUserId);

      expect(convertResult.success).toBe(true);
      expect(convertResult.data?.id).toBeDefined();
      expect(convertResult.data?.kit).toEqual(kit);

      // Verify session was deleted
      const getResult = await getSessionById(sessionId!);
      expect(getResult.success).toBe(false);
      expect(getResult.code).toBe('NOT_FOUND');
    });

    it('returns NOT_FOUND for non-existent session', async () => {
      const result = await convertSessionToKit('non-existent-session-id', testUserId);
      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.statusCode).toBe(404);
    });

    it('returns NOT_FOUND for invalid session ID', async () => {
      const result = await convertSessionToKit('', testUserId);
      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.statusCode).toBe(404);
    });
  });

  describe('updateSessionQuestionConfidence', () => {
    it('updates question confidence for a session', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      const result = await updateSessionQuestionConfidence(sessionId!, 'q1', 'ready');

      expect(result.success).toBe(true);
      expect(result.data?.updated).toBe(true);

      const doc = await SessionDocumentModel.findOne({ sessionId });
      expect(doc?.questionConfidence?.get('q1')).toBe('ready');
    });

    it('rejects invalid confidence value', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      const result = await updateSessionQuestionConfidence(sessionId!, 'q1', 'invalid' as any);

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_CONFIDENCE');
      expect(result.statusCode).toBe(400);
    });

    it('returns NOT_FOUND for non-existent session', async () => {
      const result = await updateSessionQuestionConfidence('non-existent-session-id', 'q1', 'ready');
      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.statusCode).toBe(404);
    });
  });

  describe('reorderSessionQuestions', () => {
    it('reorders questions in a session', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      const result = await reorderSessionQuestions(sessionId!, ['q1']);

      expect(result.success).toBe(true);
      expect(result.data?.updated).toBe(true);

      const doc = await SessionDocumentModel.findOne({ sessionId });
      expect(doc?.questionOrder).toEqual(['q1']);
    });

    it('rejects empty reorder array', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      const result = await reorderSessionQuestions(sessionId!, []);

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_ORDER');
      expect(result.statusCode).toBe(400);
    });

    it('rejects duplicate IDs in reorder array', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      const result = await reorderSessionQuestions(sessionId!, ['q1', 'q1']);

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_ORDER');
      expect(result.statusCode).toBe(400);
    });

    it('returns NOT_FOUND for non-existent session', async () => {
      const result = await reorderSessionQuestions('non-existent-session-id', ['q1']);
      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.statusCode).toBe(404);
    });
  });

  describe('updateSessionFlashcardConfidence', () => {
    it('updates flashcard confidence for a session', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      const result = await updateSessionFlashcardConfidence(sessionId!, 'f1', 'easy');

      expect(result.success).toBe(true);
      expect(result.data?.updated).toBe(true);

      const doc = await SessionDocumentModel.findOne({ sessionId });
      expect(doc?.flashcardConfidence?.get('f1')).toBe('easy');
    });

    it('rejects invalid confidence value', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      const result = await updateSessionFlashcardConfidence(sessionId!, 'f1', 'invalid' as any);

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_CONFIDENCE');
      expect(result.statusCode).toBe(400);
    });

    it('returns NOT_FOUND for non-existent flashcard ID', async () => {
      const kit = createMockKit();
      const createResult = await createSession(kit);
      const sessionId = createResult.data?.sessionId;

      const result = await updateSessionFlashcardConfidence(sessionId!, 'non-existent-flashcard', 'easy');

      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.statusCode).toBe(404);
    });

    it('returns NOT_FOUND for non-existent session', async () => {
      const result = await updateSessionFlashcardConfidence('non-existent-session-id', 'f1', 'easy');
      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.statusCode).toBe(404);
    });
  });
});
