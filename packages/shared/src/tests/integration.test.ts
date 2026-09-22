import { describe, it, expect } from 'vitest';
import { checkRequirementCoverage } from '../algorithms/coverageChecker';
import { allocateSchedule } from '../algorithms/scheduleAllocator';
import { validateKit } from '../validation/kitValidator';
import { Kit, RoleRequirement, Question, Flashcard } from '../schemas/kit.schema';

describe('Deterministic Core Integration Pipeline Test', () => {
  it('executes full pipeline flow: requirements -> Pass 1 -> Coverage -> Pass 2 -> Schedule -> Kit Validation', () => {
    // 1. Initial Extracted Requirements (from Pass 1 JD extraction)
    const requirements: RoleRequirement[] = [
      { id: 'r1', text: 'TypeScript & Node.js backend mastery', kind: 'technical', priority: 'must' },
      { id: 'r2', text: 'Distributed system architecture & microservices', kind: 'technical', priority: 'must' },
      { id: 'r3', text: 'Ownership and cross-functional leadership', kind: 'behavioural', priority: 'nice' },
      { id: 'r4', text: 'Fintech compliance and data security', kind: 'domain', priority: 'must' },
    ];

    // 2. Pass 1 Generated Questions (covers r1, r2, r3, but misses r4)
    const pass1Questions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Explain event loop phase mechanics in Node.js.',
        answer_outline: 'Discuss timers, poll, check phases and microtask queue.',
        difficulty: 2,
      },
      {
        id: 'q2',
        requirement_ids: ['r2'],
        category: 'system-design',
        prompt: 'Design an idempotent payment processing service.',
        answer_outline: 'Cover idempotency keys, database transactions, retry strategies.',
        difficulty: 3,
      },
      {
        id: 'q3',
        requirement_ids: ['r3'],
        category: 'behavioural',
        prompt: 'Describe a situation where you led a complex technical migration.',
        answer_outline: 'STAR framework: Situation, Task, Action, Result.',
        difficulty: 1,
      },
    ];

    // 3. Step 8: Deterministic Coverage Check
    const coverageResult = checkRequirementCoverage(requirements, pass1Questions);
    expect(coverageResult.uncovered_requirement_ids).toEqual(['r4']);
    expect(coverageResult.covered_count).toBe(3);

    // 4. Step 9: Pass 2 Supplementary Question Generation for uncovered requirement 'r4'
    const pass2Questions: Question[] = [
      {
        id: 'q4',
        requirement_ids: ['r4'],
        category: 'company-fit',
        prompt: 'How do you enforce PCI-DSS data compliance in API endpoints?',
        answer_outline: 'Tokenization, encryption at rest and in transit, strict audit logs.',
        difficulty: 2,
      },
    ];

    const finalQuestions = [...pass1Questions, ...pass2Questions];

    // Re-check coverage after Pass 2
    const finalCoverage = checkRequirementCoverage(requirements, finalQuestions);
    expect(finalCoverage.uncovered_requirement_ids).toEqual([]);
    expect(finalCoverage.covered_count).toBe(4);

    // 5. Flashcards
    const flashcards: Flashcard[] = [
      { id: 'f1', front: 'What is Node.js backpressure?', back: 'Mechanism to balance data flow in streams.', requirement_ids: ['r1'] },
      { id: 'f2', front: 'What is PCI-DSS?', back: 'Payment Card Industry Data Security Standard.', requirement_ids: ['r4'] },
    ];

    // 6. Step 10: Deterministic Schedule Allocation (e.g. 3 days)
    const daysAvailable = 3;
    const schedule = allocateSchedule({
      days_available: daysAvailable,
      questions: finalQuestions,
      role_title: 'Lead Full Stack Engineer',
    });

    expect(schedule.days_available).toBe(3);
    expect(schedule.days).toHaveLength(3);

    // 7. Assembly of complete Appendix A Kit
    const assembledKit: Kit = {
      source: {
        company: 'FintechFlow Inc',
        company_url: 'https://fintechflow.example.com',
        role: 'Lead Full Stack Engineer',
        location: 'New York, NY',
        jd_chars: 1850,
        researched_at: new Date().toISOString(),
        pages_used: ['https://fintechflow.example.com/about'],
      },
      company_brief: {
        summary: 'FintechFlow is a premier digital payment platform.',
        what_they_do: 'Processes high-throughput ledger transactions.',
        sources: ['https://fintechflow.example.com/about'],
      },
      role: {
        title: 'Lead Full Stack Engineer',
        seniority: 'Lead',
        responsibilities: ['Lead engineering team', 'Design scalable ledger systems'],
        requirements,
      },
      questions: finalQuestions,
      flashcards,
      schedule,
      coverage: {
        uncovered_requirement_ids: finalCoverage.uncovered_requirement_ids,
        passes: 2,
      },
    };

    // 8. Step 11: Kit Schema and Referential Integrity Validation
    const validationResult = validateKit(assembledKit);

    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
    expect(validationResult.kit).toBeDefined();
  });
});
