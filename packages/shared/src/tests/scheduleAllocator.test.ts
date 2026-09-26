import { describe, it, expect } from 'vitest';
import { allocateSchedule, calculateTargetQuestionCount } from '../algorithms/scheduleAllocator';
import { Question, RoleRequirement } from '../schemas/kit.schema';

describe('ScheduleAllocator', () => {
  const sampleQuestions: Question[] = [
    { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Prompt 1', answer_outline: 'Outline 1', difficulty: 1 },
    { id: 'q2', requirement_ids: ['r2'], category: 'technical', prompt: 'Prompt 2', answer_outline: 'Outline 2', difficulty: 2 },
    { id: 'q3', requirement_ids: ['r3'], category: 'behavioural', prompt: 'Prompt 3', answer_outline: 'Outline 3', difficulty: 1 },
    { id: 'q4', requirement_ids: ['r4'], category: 'system-design', prompt: 'Prompt 4', answer_outline: 'Outline 4', difficulty: 3 },
    { id: 'q5', requirement_ids: ['r5'], category: 'company-fit', prompt: 'Prompt 5', answer_outline: 'Outline 5', difficulty: 2 },
  ];

  const sampleRequirements: RoleRequirement[] = [
    { id: 'r1', text: 'Requirement 1', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Requirement 2', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Requirement 3', kind: 'behavioural', priority: 'must' },
    { id: 'r4', text: 'Requirement 4', kind: 'technical', priority: 'nice' },
    { id: 'r5', text: 'Requirement 5', kind: 'behavioural', priority: 'nice' },
  ];

  describe('calculateTargetQuestionCount', () => {
    it('returns minimum for 1 day with few requirements', () => {
      const target = calculateTargetQuestionCount(1, sampleRequirements.slice(0, 2));
      expect(target).toBeGreaterThanOrEqual(1);
      expect(target).toBeLessThanOrEqual(2);
    });

    it('returns minimum for 7 days with few requirements', () => {
      const target = calculateTargetQuestionCount(7, sampleRequirements.slice(0, 3));
      expect(target).toBeGreaterThanOrEqual(7);
      expect(target).toBeLessThanOrEqual(10);
    });

    it('returns higher target for 25 days with many requirements', () => {
      const manyReqs = Array.from({ length: 12 }, (_, i) => ({
        id: `r${i + 1}`,
        text: `Requirement ${i + 1}`,
        kind: 'technical' as const,
        priority: 'must' as const,
      }));
      const target = calculateTargetQuestionCount(25, manyReqs);
      expect(target).toBeGreaterThanOrEqual(25);
      expect(target).toBeLessThanOrEqual(75);
    });

    it('caps maximum at 120 for 60 days', () => {
      const manyReqs = Array.from({ length: 20 }, (_, i) => ({
        id: `r${i + 1}`,
        text: `Requirement ${i + 1}`,
        kind: 'technical' as const,
        priority: 'must' as const,
      }));
      const target = calculateTargetQuestionCount(60, manyReqs);
      expect(target).toBeLessThanOrEqual(120);
    });

    it('uses 1.3x multiplier for 5-9 requirements', () => {
      const target = calculateTargetQuestionCount(10, sampleRequirements);
      expect(target).toBeGreaterThanOrEqual(10);
      expect(target).toBeLessThanOrEqual(13);
    });

    it('uses 1.5x multiplier for 10+ requirements', () => {
      const manyReqs = Array.from({ length: 10 }, (_, i) => ({
        id: `r${i + 1}`,
        text: `Requirement ${i + 1}`,
        kind: 'technical' as const,
        priority: 'must' as const,
      }));
      const target = calculateTargetQuestionCount(10, manyReqs);
      expect(target).toBeGreaterThanOrEqual(10);
      expect(target).toBeLessThanOrEqual(15);
    });
  });

  describe('allocateSchedule', () => {
    it('produces exactly 1 day for a 1-day schedule with valid sequential day numbers', () => {
      const schedule = allocateSchedule({ days_available: 1, questions: sampleQuestions });

      expect(schedule.days_available).toBe(1);
      expect(schedule.days).toHaveLength(1);
      expect(schedule.days[0].day).toBe(1);
      expect(schedule.days[0].minutes).toBeGreaterThan(0);
      expect(Number.isInteger(schedule.days[0].minutes)).toBe(true);
    });

    it('produces exactly 5 days for a 5-day schedule and distributes all questions', () => {
      const schedule = allocateSchedule({ days_available: 5, questions: sampleQuestions });

      expect(schedule.days_available).toBe(5);
      expect(schedule.days).toHaveLength(5);

      // Verify sequential day numbers 1..5
      schedule.days.forEach((day, idx) => {
        expect(day.day).toBe(idx + 1);
        expect(day.minutes).toBeGreaterThan(0);
        expect(Number.isInteger(day.minutes)).toBe(true);
      });

      // Collect all scheduled question IDs
      const scheduledQIds = schedule.days.flatMap((d) => d.question_ids);

      // All scheduled IDs must be valid members of input questions
      const validQIds = new Set(sampleQuestions.map((q) => q.id));
      scheduledQIds.forEach((qId) => {
        expect(validQIds.has(qId)).toBe(true);
      });

      // Total unique questions scheduled equals sampleQuestions count
      expect(new Set(scheduledQIds).size).toBe(5);
    });

    it('throws error when questions < days_available', () => {
      expect(() => allocateSchedule({ days_available: 10, questions: sampleQuestions })).toThrow(
        'Insufficient questions'
      );
    });

    it('ensures every day has at least 1 question when questions >= days', () => {
      const manyQuestions: Question[] = Array.from({ length: 25 }, (_, i) => ({
        id: `q${i + 1}`,
        requirement_ids: [`r${(i % 5) + 1}`],
        category: ['technical', 'behavioural', 'system-design', 'company-fit'][i % 4] as any,
        prompt: `Prompt ${i + 1}`,
        answer_outline: `Outline ${i + 1}`,
        difficulty: (i % 3) + 1 as 1 | 2 | 3,
      }));

      const schedule = allocateSchedule({ days_available: 25, questions: manyQuestions });

      expect(schedule.days_available).toBe(25);
      expect(schedule.days).toHaveLength(25);

      // Every day must have at least 1 question
      schedule.days.forEach((day) => {
        expect(day.question_ids.length).toBeGreaterThanOrEqual(1);
        expect(day.minutes).toBeGreaterThan(0);
        expect(Number.isInteger(day.minutes)).toBe(true);
      });
    });

    it('handles 7 days with 7 questions (exact match)', () => {
      const sevenQuestions: Question[] = Array.from({ length: 7 }, (_, i) => ({
        id: `q${i + 1}`,
        requirement_ids: [`r${i + 1}`],
        category: 'technical',
        prompt: `Prompt ${i + 1}`,
        answer_outline: `Outline ${i + 1}`,
        difficulty: 1,
      }));

      const schedule = allocateSchedule({ days_available: 7, questions: sevenQuestions });

      expect(schedule.days_available).toBe(7);
      expect(schedule.days).toHaveLength(7);
      
      schedule.days.forEach((day) => {
        expect(day.question_ids.length).toBe(1);
        expect(day.minutes).toBeGreaterThan(0);
        expect(Number.isInteger(day.minutes)).toBe(true);
      });
    });

    it('handles 60-day maximum schedule with sufficient questions', () => {
      const manyQuestions: Question[] = Array.from({ length: 70 }, (_, i) => ({
        id: `q${i + 1}`,
        requirement_ids: [`r${(i % 5) + 1}`],
        category: 'technical',
        prompt: `Prompt ${i + 1}`,
        answer_outline: `Outline ${i + 1}`,
        difficulty: 1,
      }));

      const schedule = allocateSchedule({ days_available: 60, questions: manyQuestions });

      expect(schedule.days_available).toBe(60);
      expect(schedule.days).toHaveLength(60);

      // Every day must have at least 1 question
      schedule.days.forEach((day) => {
        expect(day.question_ids.length).toBeGreaterThanOrEqual(1);
        expect(day.minutes).toBeGreaterThan(0);
        expect(Number.isInteger(day.minutes)).toBe(true);
      });
    });

    it('produces identical output for identical inputs (deterministic reproducibility)', () => {
      const manyQuestions: Question[] = Array.from({ length: 10 }, (_, i) => ({
        id: `q${i + 1}`,
        requirement_ids: [`r${(i % 5) + 1}`],
        category: 'technical',
        prompt: `Prompt ${i + 1}`,
        answer_outline: `Outline ${i + 1}`,
        difficulty: 1,
      }));

      const run1 = allocateSchedule({ days_available: 10, questions: manyQuestions });
      const run2 = allocateSchedule({ days_available: 10, questions: manyQuestions });

      expect(run1).toEqual(run2);
    });

    it('throws an error for invalid days_available (e.g. 0 or > 60)', () => {
      expect(() => allocateSchedule({ days_available: 0, questions: sampleQuestions })).toThrow();
      expect(() => allocateSchedule({ days_available: 61, questions: sampleQuestions })).toThrow();
      expect(() => allocateSchedule({ days_available: 3.5, questions: sampleQuestions })).toThrow();
    });

    it('maintains all question IDs as valid references', () => {
      const manyQuestions: Question[] = Array.from({ length: 15 }, (_, i) => ({
        id: `q${i + 1}`,
        requirement_ids: [`r${(i % 5) + 1}`],
        category: 'technical',
        prompt: `Prompt ${i + 1}`,
        answer_outline: `Outline ${i + 1}`,
        difficulty: 1,
      }));

      const schedule = allocateSchedule({ days_available: 10, questions: manyQuestions });
      const validQIds = new Set(manyQuestions.map((q) => q.id));

      schedule.days.forEach((day) => {
        day.question_ids.forEach((qId) => {
          expect(validQIds.has(qId)).toBe(true);
        });
      });
    });

    it('does not repeat question IDs across days', () => {
      const manyQuestions: Question[] = Array.from({ length: 15 }, (_, i) => ({
        id: `q${i + 1}`,
        requirement_ids: [`r${(i % 5) + 1}`],
        category: 'technical',
        prompt: `Prompt ${i + 1}`,
        answer_outline: `Outline ${i + 1}`,
        difficulty: 1,
      }));

      const schedule = allocateSchedule({ days_available: 10, questions: manyQuestions });
      const allScheduledIds = schedule.days.flatMap((d) => d.question_ids);
      const uniqueIds = new Set(allScheduledIds);

      expect(allScheduledIds.length).toBe(uniqueIds.size);
    });

    it('distributes questions approximately evenly when questions > days', () => {
      const manyQuestions: Question[] = Array.from({ length: 30 }, (_, i) => ({
        id: `q${i + 1}`,
        requirement_ids: [`r${(i % 5) + 1}`],
        category: 'technical',
        prompt: `Prompt ${i + 1}`,
        answer_outline: `Outline ${i + 1}`,
        difficulty: 1,
      }));

      const schedule = allocateSchedule({ days_available: 25, questions: manyQuestions });

      const questionCounts = schedule.days.map((d) => d.question_ids.length);
      const maxCount = Math.max(...questionCounts);
      const minCount = Math.min(...questionCounts);

      // Distribution should be reasonably balanced (not all on one day)
      expect(maxCount - minCount).toBeLessThanOrEqual(2);
    });
  });
});
