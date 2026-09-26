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

  // New tests for phase-based focus labels
  it('handles questions >= days (21 days with 21 questions)', () => {
    const manyQuestions: Question[] = Array.from({ length: 21 }, (_, i) => ({
      id: `q${i + 1}`,
      requirement_ids: [`r${i + 1}`],
      category: ['technical', 'behavioural', 'system-design', 'company-fit'][i % 4] as any,
      prompt: `Prompt ${i + 1}`,
      answer_outline: `Outline ${i + 1}`,
      difficulty: (i % 3) + 1 as 1 | 2 | 3,
    }));

    const schedule = allocateSchedule({ days_available: 21, questions: manyQuestions });

    expect(schedule.days_available).toBe(21);
    expect(schedule.days).toHaveLength(21);
    
    // All days should have questions
    schedule.days.forEach((day) => {
      expect(day.question_ids.length).toBeGreaterThan(0);
      expect(day.minutes).toBeGreaterThan(0);
      expect(Number.isInteger(day.minutes)).toBe(true);
    });
  });

  it('handles questions < days (21 days with 6 questions) with phase-based empty day labels', () => {
    const fewQuestions: Question[] = sampleQuestions.slice(0, 6);
    const schedule = allocateSchedule({ days_available: 21, questions: fewQuestions });

    expect(schedule.days_available).toBe(21);
    expect(schedule.days).toHaveLength(21);

    // Count days with questions vs empty days
    const daysWithQuestions = schedule.days.filter((d) => d.question_ids.length > 0);
    const emptyDays = schedule.days.filter((d) => d.question_ids.length === 0);

    expect(daysWithQuestions.length).toBeGreaterThan(0);
    expect(emptyDays.length).toBeGreaterThan(0);

    // Empty days should have meaningful focus labels
    emptyDays.forEach((day) => {
      expect(day.focus.length).toBeGreaterThan(0);
      expect(day.focus).not.toBe('Review, Mock Practice & Concept Revision');
      expect(day.minutes).toBe(30); // Minimum for empty days
      expect(Number.isInteger(day.minutes)).toBe(true);
    });

    // Check that empty days have varied focus labels (not all identical)
    const emptyDayFocuses = emptyDays.map((d) => d.focus);
    const uniqueFocuses = new Set(emptyDayFocuses);
    expect(uniqueFocuses.size).toBeGreaterThan(1);
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
      expect(day.question_ids.length).toBeGreaterThan(0);
      expect(day.minutes).toBeGreaterThan(0);
      expect(Number.isInteger(day.minutes)).toBe(true);
    });
  });

  it('handles 60-day maximum schedule with few questions', () => {
    const schedule = allocateSchedule({ days_available: 60, questions: sampleQuestions });

    expect(schedule.days_available).toBe(60);
    expect(schedule.days).toHaveLength(60);

    // All days should have valid structure
    schedule.days.forEach((day, idx) => {
      expect(day.day).toBe(idx + 1);
      expect(day.minutes).toBeGreaterThan(0);
      expect(Number.isInteger(day.minutes)).toBe(true);
      expect(day.focus.length).toBeGreaterThan(0);
    });

    // Check that empty days have varied phase-based labels
    const emptyDays = schedule.days.filter((d) => d.question_ids.length === 0);
    if (emptyDays.length > 0) {
      const uniqueFocuses = new Set(emptyDays.map((d) => d.focus));
      expect(uniqueFocuses.size).toBeGreaterThan(1);
    }
  });

  it('generates category-aware review focus labels when categories exist', () => {
    const mixedCategoryQuestions: Question[] = [
      { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Prompt 1', answer_outline: 'Outline 1', difficulty: 1 },
      { id: 'q2', requirement_ids: ['r2'], category: 'behavioural', prompt: 'Prompt 2', answer_outline: 'Outline 2', difficulty: 1 },
    ];

    const schedule = allocateSchedule({ days_available: 10, questions: mixedCategoryQuestions });

    // Find empty days
    const emptyDays = schedule.days.filter((d) => d.question_ids.length === 0);
    expect(emptyDays.length).toBeGreaterThan(0);

    // Check that focus labels include category-specific reviews
    const allFocuses = emptyDays.map((d) => d.focus).join(' ');
    expect(allFocuses).toContain('Technical');
    expect(allFocuses).toContain('Behavioural');
  });

  it('includes mock interview phases for longer schedules (21+ days)', () => {
    const schedule = allocateSchedule({ days_available: 21, questions: sampleQuestions });
    const allFocuses = schedule.days.map((d) => d.focus).join(' ');

    expect(allFocuses).toContain('Mock Interview');
  });

  it('includes final revision phase for very long schedules (21+ days)', () => {
    const schedule = allocateSchedule({ days_available: 21, questions: sampleQuestions });
    const allFocuses = schedule.days.map((d) => d.focus).join(' ');

    expect(allFocuses).toContain('Final Revision');
  });

  it('maintains all question IDs as valid references', () => {
    const schedule = allocateSchedule({ days_available: 10, questions: sampleQuestions });
    const validQIds = new Set(sampleQuestions.map((q) => q.id));

    schedule.days.forEach((day) => {
      day.question_ids.forEach((qId) => {
        expect(validQIds.has(qId)).toBe(true);
      });
    });
  });

  it('does not repeat question IDs across days', () => {
    const schedule = allocateSchedule({ days_available: 10, questions: sampleQuestions });
    const allScheduledIds = schedule.days.flatMap((d) => d.question_ids);
    const uniqueIds = new Set(allScheduledIds);

    expect(allScheduledIds.length).toBe(uniqueIds.size);
  });

  it('zero questions schedule uses phase-based labels (not generic fallback)', () => {
    const schedule = allocateSchedule({ days_available: 5, questions: [] });

    schedule.days.forEach((day) => {
      expect(day.question_ids).toEqual([]);
      expect(day.focus).not.toBe('Review, Mock Practice & Concept Revision');
      expect(day.focus.length).toBeGreaterThan(0);
    });
  });
});
