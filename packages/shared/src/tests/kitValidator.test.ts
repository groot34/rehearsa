import { describe, it, expect } from 'vitest';
import { validateKit } from '../validation/kitValidator';
import { Kit } from '../schemas/kit.schema';

describe('KitValidator', () => {
  const validSampleKit: Kit = {
    source: {
      company: 'TechCorp',
      company_url: 'https://techcorp.example.com',
      role: 'Senior Full Stack Engineer',
      location: 'Remote',
      jd_chars: 1200,
      researched_at: '2026-09-22T12:00:00.000Z',
      pages_used: ['https://techcorp.example.com'],
    },
    company_brief: {
      summary: 'Leading cloud platform provider.',
      what_they_do: 'Builds enterprise infrastructure tools.',
      sources: ['https://techcorp.example.com'],
    },
    role: {
      title: 'Senior Full Stack Engineer',
      seniority: 'Senior',
      responsibilities: ['Architect web apps', 'Optimize Node.js performance'],
      requirements: [
        { id: 'r1', text: 'Node.js expertise', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'System architecture', kind: 'technical', priority: 'must' },
        { id: 'r3', text: 'Team collaboration', kind: 'behavioural', priority: 'nice' },
      ],
    },
    questions: [
      { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'How do streams work?', answer_outline: 'Streams outline...', difficulty: 2 },
      { id: 'q2', requirement_ids: ['r2'], category: 'system-design', prompt: 'Design a rate limiter', answer_outline: 'Rate limiter outline...', difficulty: 3 },
      { id: 'q3', requirement_ids: ['r3'], category: 'behavioural', prompt: 'Describe a conflict', answer_outline: 'Conflict outline...', difficulty: 1 },
    ],
    flashcards: [
      { id: 'f1', front: 'Node.js event loop', back: 'Phases of event loop...', requirement_ids: ['r1'] },
    ],
    schedule: {
      days_available: 2,
      days: [
        { day: 1, focus: 'Technical Core', question_ids: ['q1', 'q2'], minutes: 60 },
        { day: 2, focus: 'Behavioural Review', question_ids: ['q3'], minutes: 45 },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 2,
    },
  };

  it('validates a complete valid Appendix A kit successfully', () => {
    const result = validateKit(validSampleKit);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.kit).toBeDefined();
  });

  it('rejects a kit missing required top-level fields', () => {
    const invalid = { ...validSampleKit } as any;
    delete invalid.company_brief;

    const result = validateKit(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('company_brief'))).toBe(true);
  });

  it('rejects invalid enum values for requirement kind', () => {
    const invalid = JSON.parse(JSON.stringify(validSampleKit));
    invalid.role.requirements[0].kind = 'invalid_kind';

    const result = validateKit(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('requirements.0.kind'))).toBe(true);
  });

  it('rejects invalid enum values for question category', () => {
    const invalid = JSON.parse(JSON.stringify(validSampleKit));
    invalid.questions[0].category = 'invalid_category';

    const result = validateKit(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('questions.0.category'))).toBe(true);
  });

  it('rejects difficulty ratings outside 1..3 range', () => {
    const invalid = JSON.parse(JSON.stringify(validSampleKit));
    invalid.questions[0].difficulty = 5;

    const result = validateKit(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('questions.0.difficulty'))).toBe(true);
  });

  it('detects question requirement_ids referencing non-existent requirement IDs', () => {
    const invalid = JSON.parse(JSON.stringify(validSampleKit));
    invalid.questions[0].requirement_ids = ['r999_nonexistent'];

    const result = validateKit(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('references invalid requirement ID'))).toBe(true);
  });

  it('detects flashcard requirement_ids referencing non-existent requirement IDs', () => {
    const invalid = JSON.parse(JSON.stringify(validSampleKit));
    invalid.flashcards[0].requirement_ids = ['r999_nonexistent'];

    const result = validateKit(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('references invalid requirement ID'))).toBe(true);
  });

  it('detects schedule question_ids referencing non-existent question IDs', () => {
    const invalid = JSON.parse(JSON.stringify(validSampleKit));
    invalid.schedule.days[0].question_ids = ['q999_nonexistent'];

    const result = validateKit(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('references unknown question ID'))).toBe(true);
  });

  it('rejects schedules where days array length does not match days_available', () => {
    const invalid = JSON.parse(JSON.stringify(validSampleKit));
    invalid.schedule.days_available = 5; // but days has length 2

    const result = validateKit(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('schedule'))).toBe(true);
  });

  it('rejects non-sequential schedule day numbers', () => {
    const invalid = JSON.parse(JSON.stringify(validSampleKit));
    invalid.schedule.days[0].day = 1;
    invalid.schedule.days[1].day = 99; // should be 2

    const result = validateKit(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_SCHEDULE_DAY_SEQUENCE')).toBe(true);
  });

  it('detects coverage inconsistency when claimed uncovered IDs do not match actual questions', () => {
    const invalid = JSON.parse(JSON.stringify(validSampleKit));
    invalid.coverage.uncovered_requirement_ids = ['r1'];

    const result = validateKit(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'COVERAGE_INCONSISTENCY')).toBe(true);
  });

  it('detects duplicate requirement IDs in role.requirements', () => {
    const invalid = JSON.parse(JSON.stringify(validSampleKit));
    invalid.role.requirements.push({ id: 'r1', text: 'Duplicate r1', kind: 'technical', priority: 'must' });

    const result = validateKit(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate requirement ID'))).toBe(true);
  });

  it('detects duplicate question IDs in questions array', () => {
    const invalid = JSON.parse(JSON.stringify(validSampleKit));
    invalid.questions.push({ id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Dup', answer_outline: 'Dup', difficulty: 1 });

    const result = validateKit(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate question ID'))).toBe(true);
  });
});
