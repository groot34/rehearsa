import { describe, it, expect } from 'vitest';
import { allocateSchedule } from '../algorithms/scheduleAllocator';
import { Question } from '../schemas/kit.schema';

describe('ScheduleAllocator', () => {
  const sampleQuestions: Question[] = [
    { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Prompt 1', answer_outline: 'Outline 1', difficulty: 1 },
    { id: 'q2', requirement_ids: ['r2'], category: 'technical', prompt: 'Prompt 2', answer_outline: 'Outline 2', difficulty: 2 },
    { id: 'q3', requirement_ids: ['r3'], category: 'behavioural', prompt: 'Prompt 3', answer_outline: 'Outline 3', difficulty: 1 },
    { id: 'q4', requirement_ids: ['r4'], category: 'system-design', prompt: 'Prompt 4', answer_outline: 'Outline 4', difficulty: 3 },
    { id: 'q5', requirement_ids: ['r5'], category: 'company-fit', prompt: 'Prompt 5', answer_outline: 'Outline 5', difficulty: 2 },
  ];

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

  it('handles more days than questions without crashing or inventing fake question IDs', () => {
    const schedule = allocateSchedule({ days_available: 10, questions: sampleQuestions });

    expect(schedule.days_available).toBe(10);
    expect(schedule.days).toHaveLength(10);

    const validQIds = new Set(sampleQuestions.map((q) => q.id));
    schedule.days.forEach((day) => {
      day.question_ids.forEach((qId) => {
        expect(validQIds.has(qId)).toBe(true);
      });
    });
  });

  it('handles 0 questions safely by producing empty question_ids per day and sensible defaults', () => {
    const schedule = allocateSchedule({ days_available: 3, questions: [] });

    expect(schedule.days_available).toBe(3);
    expect(schedule.days).toHaveLength(3);

    schedule.days.forEach((day, idx) => {
      expect(day.day).toBe(idx + 1);
      expect(day.question_ids).toEqual([]);
      expect(day.minutes).toBeGreaterThan(0);
      expect(typeof day.focus).toBe('string');
      expect(day.focus.length).toBeGreaterThan(0);
    });
  });

  it('produces identical output for identical inputs (deterministic reproducibility)', () => {
    const run1 = allocateSchedule({ days_available: 7, questions: sampleQuestions });
    const run2 = allocateSchedule({ days_available: 7, questions: sampleQuestions });

    expect(run1).toEqual(run2);
  });

  it('throws an error for invalid days_available (e.g. 0 or > 60)', () => {
    expect(() => allocateSchedule({ days_available: 0, questions: sampleQuestions })).toThrow();
    expect(() => allocateSchedule({ days_available: 61, questions: sampleQuestions })).toThrow();
    expect(() => allocateSchedule({ days_available: 3.5, questions: sampleQuestions })).toThrow();
  });
});
