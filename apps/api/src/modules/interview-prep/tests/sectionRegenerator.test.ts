import { describe, it, expect } from 'vitest';
import { Kit, validateKit } from '@rehearsa/shared';
import { regenerateKitSection } from '../sectionRegenerator';
import { MockLlmProvider } from '../../llm/mockProvider';

// ---------------------------------------------------------------------------
// Shared test fixture — a minimal but fully Appendix-A-valid kit
// ---------------------------------------------------------------------------

const baseKit: Kit = {
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
    summary: 'TestCorp builds high-performance cloud infrastructure platforms.',
    what_they_do: 'Cloud-native systems and distributed computing.',
    sources: ['https://testcorp.example.com'],
  },
  role: {
    title: 'Senior Backend Engineer',
    seniority: 'Senior',
    responsibilities: ['Design APIs', 'Lead backend architecture'],
    requirements: [
      { id: 'r1', text: 'TypeScript and Node.js expertise', kind: 'technical', priority: 'must' },
      { id: 'r2', text: 'PostgreSQL query optimisation', kind: 'technical', priority: 'must' },
      { id: 'r3', text: 'Cross-team communication', kind: 'behavioural', priority: 'nice' },
    ],
  },
  questions: [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Explain TypeScript generics.',
      answer_outline: 'Discuss type parameters and constraints.',
      difficulty: 2,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'technical',
      prompt: 'How do you optimise a slow PostgreSQL query?',
      answer_outline: 'Discuss EXPLAIN ANALYZE, indexing, and connection pooling.',
      difficulty: 3,
    },
    {
      id: 'q3',
      requirement_ids: ['r3'],
      category: 'behavioural',
      prompt: 'Describe a cross-team conflict you resolved.',
      answer_outline: 'Use STAR method.',
      difficulty: 1,
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'What is a TypeScript generic?',
      back: 'A type parameter that makes functions and classes work with multiple types.',
      requirement_ids: ['r1'],
    },
    {
      id: 'f2',
      front: 'What does EXPLAIN ANALYZE do in PostgreSQL?',
      back: 'Shows the query execution plan and actual run times for each step.',
      requirement_ids: ['r2'],
    },
  ],
  schedule: {
    days_available: 3,
    days: [
      { day: 1, focus: 'Technical Concepts & Coding Practice', question_ids: ['q1'], minutes: 25 },
      { day: 2, focus: 'Technical Concepts & Coding Practice', question_ids: ['q2'], minutes: 35 },
      { day: 3, focus: 'Behavioural Stories & Leadership Scenarios', question_ids: ['q3'], minutes: 15 },
    ],
  },
  coverage: {
    uncovered_requirement_ids: [],
    passes: 2,
  },
};

const mockProvider = new MockLlmProvider();

// ---------------------------------------------------------------------------
// Questions section regeneration
// ---------------------------------------------------------------------------

describe('regenerateKitSection — questions', () => {
  it('returns a valid Appendix A kit after regenerating questions', async () => {
    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'questions',
      preserved_ids: [],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    expect(result.kit).toBeDefined();

    const validation = validateKit(result.kit!);
    expect(validation.valid).toBe(true);

    // Schedule must be consistent with the new question list
    expect(result.kit!.schedule.days_available).toBe(baseKit.schedule.days_available);
    expect(result.kit!.schedule.days.length).toBe(baseKit.schedule.days_available);
  });

  it('preserves a question explicitly listed in preserved_ids', async () => {
    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'questions',
      preserved_ids: ['q1'],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    const preservedQ = result.kit!.questions.find((q) => q.id === 'q1');
    expect(preservedQ).toBeDefined();
    expect(preservedQ!.prompt).toBe('Explain TypeScript generics.');
  });

  it('preserves a question with q_custom_* ID without explicit preserved_ids', async () => {
    // Add a custom question to the kit
    const kitWithCustomQ: Kit = {
      ...baseKit,
      questions: [
        ...baseKit.questions,
        {
          id: 'q_custom_abc123',
          requirement_ids: ['r1'],
          category: 'system-design',
          prompt: 'User-added: Design a distributed worker queue.',
          answer_outline: 'Worker pool pattern and Redis queues.',
          difficulty: 3,
        },
      ],
    };

    const result = await regenerateKitSection({
      kit: kitWithCustomQ,
      section: 'questions',
      preserved_ids: [], // NOT explicitly listed — must be auto-preserved
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    const customQ = result.kit!.questions.find((q) => q.id === 'q_custom_abc123');
    expect(customQ).toBeDefined();
    expect(customQ!.prompt).toBe('User-added: Design a distributed worker queue.');
  });

  it('does not reintroduce a deleted question even if preserved_ids contains its ID', async () => {
    // q3 has been deleted from the kit — only q1 and q2 remain
    const kitWithDeletedQ3: Kit = {
      ...baseKit,
      questions: baseKit.questions.filter((q) => q.id !== 'q3'),
      schedule: {
        days_available: 3,
        days: [
          { day: 1, focus: 'Technical Concepts & Coding Practice', question_ids: ['q1'], minutes: 25 },
          { day: 2, focus: 'Technical Concepts & Coding Practice', question_ids: ['q2'], minutes: 35 },
          { day: 3, focus: 'Review, Mock Practice & Concept Revision', question_ids: [], minutes: 30 },
        ],
      },
    };

    const result = await regenerateKitSection({
      kit: kitWithDeletedQ3,
      section: 'questions',
      // Even though 'q3' is listed as preserved_ids, it does not exist in the
      // submitted kit, so the server silently drops it.
      preserved_ids: ['q3'],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    const deletedQ = result.kit!.questions.find((q) => q.id === 'q3');
    expect(deletedQ).toBeUndefined();
  });

  it('rebuilds the schedule referencing only questions in the merged set', async () => {
    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'questions',
      preserved_ids: ['q1'],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    const kit = result.kit!;
    const allQIds = new Set(kit.questions.map((q) => q.id));

    for (const day of kit.schedule.days) {
      for (const qId of day.question_ids) {
        expect(allQIds.has(qId)).toBe(true);
      }
    }
  });

  it('new question IDs do not collide with preserved question IDs', async () => {
    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'questions',
      preserved_ids: ['q1', 'q2'],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    const ids = result.kit!.questions.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('returns REGEN_LLM_FAILED when the LLM provider throws', async () => {
    const failingProvider = {
      name: 'FailingProvider',
      generateStructuredJson: async () => {
        throw new Error('Simulated LLM network error');
      },
      generateText: async () => '',
    };

    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'questions',
      preserved_ids: [],
      provider: failingProvider as any,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('REGEN_LLM_FAILED');
    expect(result.error?.message).toContain('LLM failed');
    // Original kit is never returned on failure
    expect(result.kit).toBeUndefined();
  });

  it('new question requirement_ids only reference valid role requirement IDs', async () => {
    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'questions',
      preserved_ids: [],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    const validReqIds = new Set(baseKit.role.requirements.map((r) => r.id));
    for (const q of result.kit!.questions) {
      for (const rid of q.requirement_ids) {
        expect(validReqIds.has(rid)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Flashcards section regeneration
// ---------------------------------------------------------------------------

describe('regenerateKitSection — flashcards', () => {
  it('returns a valid Appendix A kit after regenerating flashcards', async () => {
    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'flashcards',
      preserved_ids: [],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    expect(result.kit).toBeDefined();

    const validation = validateKit(result.kit!);
    expect(validation.valid).toBe(true);
  });

  it('preserves a flashcard explicitly listed in preserved_ids', async () => {
    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'flashcards',
      preserved_ids: ['f1'],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    const preserved = result.kit!.flashcards.find((f) => f.id === 'f1');
    expect(preserved).toBeDefined();
    expect(preserved!.front).toBe('What is a TypeScript generic?');
  });

  it('preserves a flashcard with f_custom_* ID without explicit preserved_ids', async () => {
    const kitWithCustomF: Kit = {
      ...baseKit,
      flashcards: [
        ...baseKit.flashcards,
        {
          id: 'f_custom_xyz999',
          front: 'User-added: What is gRPC?',
          back: 'A high-performance RPC framework using Protocol Buffers.',
          requirement_ids: ['r1'],
        },
      ],
    };

    const result = await regenerateKitSection({
      kit: kitWithCustomF,
      section: 'flashcards',
      preserved_ids: [],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    const customF = result.kit!.flashcards.find((f) => f.id === 'f_custom_xyz999');
    expect(customF).toBeDefined();
    expect(customF!.front).toBe('User-added: What is gRPC?');
  });

  it('does not reintroduce a deleted flashcard even if its ID is in preserved_ids', async () => {
    const kitWithDeletedF2: Kit = {
      ...baseKit,
      flashcards: baseKit.flashcards.filter((f) => f.id !== 'f2'),
    };

    const result = await regenerateKitSection({
      kit: kitWithDeletedF2,
      section: 'flashcards',
      preserved_ids: ['f2'], // f2 no longer exists in the submitted kit — silently ignored
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    const deletedF = result.kit!.flashcards.find((f) => f.id === 'f2');
    expect(deletedF).toBeUndefined();
  });

  it('does not touch questions or schedule when regenerating flashcards', async () => {
    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'flashcards',
      preserved_ids: [],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    // Questions unchanged
    expect(result.kit!.questions).toEqual(baseKit.questions);
    // Schedule unchanged
    expect(result.kit!.schedule).toEqual(baseKit.schedule);
  });

  it('returns REGEN_LLM_FAILED when the LLM provider throws on flashcard regen', async () => {
    const failingProvider = {
      name: 'FailingProvider',
      generateStructuredJson: async () => {
        throw new Error('Simulated LLM timeout');
      },
      generateText: async () => '',
    };

    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'flashcards',
      preserved_ids: [],
      provider: failingProvider as any,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('REGEN_LLM_FAILED');
    expect(result.kit).toBeUndefined();
  });

  it('new flashcard requirement_ids only reference valid role requirement IDs', async () => {
    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'flashcards',
      preserved_ids: [],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    const validReqIds = new Set(baseKit.role.requirements.map((r) => r.id));
    for (const f of result.kit!.flashcards) {
      for (const rid of f.requirement_ids) {
        expect(validReqIds.has(rid)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Cross-section isolation (regression tests)
// ---------------------------------------------------------------------------

describe('regenerateKitSection — cross-section isolation', () => {
  it('regenerating questions does not alter flashcards, company_brief, or role', async () => {
    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'questions',
      preserved_ids: [],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    const kit = result.kit!;
    // Flashcards must be byte-identical to the original
    expect(kit.flashcards).toEqual(baseKit.flashcards);
    // Company brief untouched
    expect(kit.company_brief).toEqual(baseKit.company_brief);
    // Role (requirements, responsibilities, title) untouched
    expect(kit.role).toEqual(baseKit.role);
    // Source untouched
    expect(kit.source).toEqual(baseKit.source);
  });

  it('regenerating flashcards does not alter questions, schedule, or coverage', async () => {
    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'flashcards',
      preserved_ids: [],
      provider: mockProvider,
    });

    expect(result.success).toBe(true);
    const kit = result.kit!;
    expect(kit.questions).toEqual(baseKit.questions);
    expect(kit.schedule).toEqual(baseKit.schedule);
    expect(kit.coverage).toEqual(baseKit.coverage);
  });

  it('sanitises LLM-returned requirement_ids that reference unknown IDs', async () => {
    // Provider returns questions referencing 'r_unknown' which is not in the kit
    const badRefProvider = {
      name: 'BadRefProvider',
      generateStructuredJson: async (_prompt: string, _sys: string, schema: any) => {
        const mockData = {
          questions: [
            {
              id: 'q_temp_1',
              requirement_ids: ['r_unknown_999', 'r1'], // r_unknown_999 must be stripped
              category: 'technical',
              prompt: 'A test question with a bad reference.',
              answer_outline: 'Some outline.',
              difficulty: 1,
            },
          ],
          flashcards: [],
        };
        const parsed = schema.safeParse(mockData);
        if (!parsed.success) throw new Error(parsed.error.message);
        return parsed.data;
      },
      generateText: async () => '',
    };

    const result = await regenerateKitSection({
      kit: baseKit,
      section: 'questions',
      preserved_ids: ['q1', 'q2', 'q3'], // preserve all originals so new item actually appears
      provider: badRefProvider as any,
    });

    // Even with bad refs, the result should succeed (unknown IDs are sanitised)
    if (result.success) {
      const kit = result.kit!;
      const validReqIds = new Set(baseKit.role.requirements.map((r) => r.id));
      for (const q of kit.questions) {
        for (const rid of q.requirement_ids) {
          expect(validReqIds.has(rid)).toBe(true);
        }
      }
    }
    // If it failed (e.g. validateKit rejected due to no valid questions after sanitisation),
    // the error must be a structured REGEN_VALIDATION_FAILED — never a silent crash.
    if (!result.success) {
      expect(result.error?.code).toBe('REGEN_VALIDATION_FAILED');
      expect(result.kit).toBeUndefined();
    }
  });
});
