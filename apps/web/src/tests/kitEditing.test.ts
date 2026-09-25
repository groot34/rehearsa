import { describe, it, expect } from 'vitest';
import { Kit, validateKit } from '@rehearsa/shared';
import {
  updateQuestionInKit,
  addQuestionToKit,
  deleteQuestionFromKit,
  updateFlashcardInKit,
  addFlashcardToKit,
  deleteFlashcardFromKit,
  syncQuestionOrder,
} from '../lib/kitEditing';

const sampleKit: Kit = {
  source: {
    company: 'Acme Corp',
    company_url: 'https://acme.com',
    role: 'Senior Backend Engineer',
    location: 'Remote',
    jd_chars: 1200,
    researched_at: '2026-09-23T00:00:00.000Z',
    pages_used: ['https://acme.com'],
  },
  company_brief: {
    summary: 'Acme build enterprise software platforms.',
    what_they_do: 'Cloud-native scalable systems.',
    sources: ['https://acme.com'],
  },
  role: {
    title: 'Senior Backend Engineer',
    seniority: 'Senior',
    responsibilities: ['Architect microservices', 'Lead technical direction'],
    requirements: [
      { id: 'r1', text: 'Proficient with Go concurrency', kind: 'technical', priority: 'must' },
      { id: 'r2', text: 'Experience with PostgreSQL scaling', kind: 'technical', priority: 'must' },
      { id: 'r3', text: 'Strong cross-team communication', kind: 'behavioural', priority: 'nice' },
    ],
  },
  questions: [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Explain channels and goroutines in Go.',
      answer_outline: 'Discuss buffered vs unbuffered channels and deadlocks.',
      difficulty: 2,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'technical',
      prompt: 'How do you optimize PostgreSQL queries with millions of rows?',
      answer_outline: 'Discuss indexing, EXPLAIN ANALYZE, and connection pooling.',
      difficulty: 3,
    },
    {
      id: 'q3',
      requirement_ids: ['r3'],
      category: 'behavioural',
      prompt: 'Describe how you resolved a conflict between engineering teams.',
      answer_outline: 'Use STAR method and focus on empathy and alignment.',
      difficulty: 1,
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'What is a goroutine leak?',
      back: 'When a goroutine is started but never exits, holding memory.',
      requirement_ids: ['r1'],
    },
    {
      id: 'f2',
      front: 'What is MVCC in PostgreSQL?',
      back: 'Multi-Version Concurrency Control allowing non-blocking reads.',
      requirement_ids: ['r2'],
    },
  ],
  schedule: {
    days_available: 3,
    days: [
      { day: 1, focus: 'Go Concurrency', question_ids: ['q1'], minutes: 45 },
      { day: 2, focus: 'Database Optimization', question_ids: ['q2'], minutes: 45 },
      { day: 3, focus: 'Team Leadership', question_ids: ['q3'], minutes: 30 },
    ],
  },
  coverage: {
    uncovered_requirement_ids: [],
    passes: 1,
  },
};

describe('Kit Manual Editing Utilities', () => {
  it('updates an existing question prompt and answer outline', () => {
    const updatedQuestion = {
      ...sampleKit.questions[0],
      prompt: 'Updated Go concurrency prompt with select timeouts.',
      answer_outline: 'Explain select statements, time.After, and context cancellation.',
    };

    const res = updateQuestionInKit(sampleKit, updatedQuestion);
    expect(res.success).toBe(true);
    expect(res.kit).toBeDefined();
    expect(res.kit!.questions[0].prompt).toBe('Updated Go concurrency prompt with select timeouts.');
    expect(res.kit!.questions[0].id).toBe('q1');
    expect(res.kit!.questions[0].requirement_ids).toEqual(['r1']);

    // Kit remains 100% valid under Appendix A
    const validation = validateKit(res.kit!);
    expect(validation.valid).toBe(true);
  });

  it('rejects question updates with empty prompt or invalid fields', () => {
    const invalidQuestion = {
      ...sampleKit.questions[0],
      prompt: '', // Empty prompt
    };

    const res = updateQuestionInKit(sampleKit, invalidQuestion);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Validation failed');
  });

  it('adds a new question and preserves referential integrity', () => {
    const newQuestionData = {
      requirement_ids: ['r1'],
      category: 'system-design' as const,
      prompt: 'Design a distributed worker queue in Go.',
      answer_outline: 'Worker pool pattern, graceful shutdown, and Redis queues.',
      difficulty: 3,
    };

    const res = addQuestionToKit(sampleKit, newQuestionData, 'q_custom_99');
    expect(res.success).toBe(true);
    expect(res.kit!.questions.length).toBe(4);
    expect(res.kit!.questions[3].id).toBe('q_custom_99');
    expect(res.kit!.questions[3].category).toBe('system-design');

    const validation = validateKit(res.kit!);
    expect(validation.valid).toBe(true);
  });

  it('rejects adding a question with unknown requirement IDs', () => {
    const invalidQuestionData = {
      requirement_ids: ['r_unknown_999'],
      category: 'technical' as const,
      prompt: 'Some technical prompt',
      answer_outline: 'Some outline',
      difficulty: 2,
    };

    const res = addQuestionToKit(sampleKit, invalidQuestionData);
    expect(res.success).toBe(false);
    expect(res.error).toContain('unknown requirement ID');
  });

  it('deletes a question, updates schedule references and recalculates coverage', () => {
    // Delete q3 (which covers r3)
    const res = deleteQuestionFromKit(sampleKit, 'q3');
    expect(res.success).toBe(true);
    expect(res.kit!.questions.length).toBe(2);

    // Schedule day 3 should have question_ids emptied out (q3 removed)
    expect(res.kit!.schedule.days[2].question_ids).toEqual([]);

    // Requirement r3 is now uncovered!
    expect(res.kit!.coverage.uncovered_requirement_ids).toContain('r3');

    // Entire kit still passes Appendix A referential integrity
    const validation = validateKit(res.kit!);
    expect(validation.valid).toBe(true);
  });

  it('updates an existing flashcard front and back', () => {
    const updatedCard = {
      ...sampleKit.flashcards[0],
      front: 'Updated front concept for goroutines',
      back: 'Updated back detailed explanation',
    };

    const res = updateFlashcardInKit(sampleKit, updatedCard);
    expect(res.success).toBe(true);
    expect(res.kit!.flashcards[0].front).toBe('Updated front concept for goroutines');
    expect(res.kit!.flashcards[0].back).toBe('Updated back detailed explanation');

    const validation = validateKit(res.kit!);
    expect(validation.valid).toBe(true);
  });

  it('rejects flashcard update with empty back', () => {
    const invalidCard = {
      ...sampleKit.flashcards[0],
      back: '',
    };

    const res = updateFlashcardInKit(sampleKit, invalidCard);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Validation failed');
  });

  it('adds and deletes flashcards cleanly', () => {
    const newCardData = {
      front: 'What is gRPC?',
      back: 'A high-performance open-source RPC framework.',
      requirement_ids: ['r1'],
    };

    const addRes = addFlashcardToKit(sampleKit, newCardData, 'f_custom_1');
    expect(addRes.success).toBe(true);
    expect(addRes.kit!.flashcards.length).toBe(3);
    expect(addRes.kit!.flashcards[2].id).toBe('f_custom_1');

    const deleteRes = deleteFlashcardFromKit(addRes.kit!, 'f_custom_1');
    expect(deleteRes.success).toBe(true);
    expect(deleteRes.kit!.flashcards.length).toBe(2);
  });

  it('preserves edited content across category filtering and section switches', () => {
    // 1. Edit a question
    const step1 = updateQuestionInKit(sampleKit, {
      ...sampleKit.questions[0],
      prompt: 'Custom edited technical question prompt.',
    });
    expect(step1.success).toBe(true);

    // 2. Edit a flashcard
    const step2 = updateFlashcardInKit(step1.kit!, {
      ...sampleKit.flashcards[0],
      front: 'Custom edited flashcard front.',
    });
    expect(step2.success).toBe(true);

    const workingKit = step2.kit!;

    // 3. Simulate Category Filtering in QuestionBankCard
    const technicalQuestions = workingKit.questions.filter((q) => q.category === 'technical');
    const behaviouralQuestions = workingKit.questions.filter((q) => q.category === 'behavioural');

    // Filtered lists still retain the edited question prompt
    expect(technicalQuestions.find((q) => q.id === 'q1')?.prompt).toBe(
      'Custom edited technical question prompt.'
    );
    expect(behaviouralQuestions.length).toBe(1);

    // 4. Simulate switching to another section and back (the kit remains immutable and preserved)
    expect(workingKit.questions[0].prompt).toBe('Custom edited technical question prompt.');
    expect(workingKit.flashcards[0].front).toBe('Custom edited flashcard front.');

    // 5. Appendix A validation holds throughout
    const validation = validateKit(workingKit);
    expect(validation.valid).toBe(true);
  });
});

describe('Question Order Synchronization (syncQuestionOrder)', () => {
  const sampleQuestions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];

  it('initializes questionOrder deterministically from questions when existingOrder is empty', () => {
    const synced = syncQuestionOrder([], sampleQuestions);
    expect(synced).toEqual(['q1', 'q2', 'q3']);
  });

  it('preserves existing custom questionOrder when all questions remain present', () => {
    const customOrder = ['q3', 'q1', 'q2'];
    const synced = syncQuestionOrder(customOrder, sampleQuestions);
    expect(synced).toEqual(['q3', 'q1', 'q2']);
  });

  it('retains relative order of remaining questions when a question is deleted', () => {
    const customOrder = ['q3', 'q1', 'q2'];
    const remainingQuestions = [{ id: 'q2' }, { id: 'q3' }];
    const synced = syncQuestionOrder(customOrder, remainingQuestions);
    expect(synced).toEqual(['q3', 'q2']);
  });

  it('appends new question IDs while preserving existing custom order', () => {
    const customOrder = ['q3', 'q1', 'q2'];
    const questionsWithNew = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q_custom_99' }];
    const synced = syncQuestionOrder(customOrder, questionsWithNew);
    expect(synced).toEqual(['q3', 'q1', 'q2', 'q_custom_99']);
  });

  it('handles section regeneration by retaining preserved IDs order and appending new IDs', () => {
    const customOrder = ['q3', 'q1', 'q2'];
    // Suppose q2 was replaced by q_regen_1 and q_regen_2 during section regeneration
    const regenQuestions = [{ id: 'q1' }, { id: 'q3' }, { id: 'q_regen_1' }, { id: 'q_regen_2' }];
    const synced = syncQuestionOrder(customOrder, regenQuestions);
    expect(synced).toEqual(['q3', 'q1', 'q_regen_1', 'q_regen_2']);
  });
});

