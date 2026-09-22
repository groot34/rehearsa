import { Question, Schedule, ScheduleDay } from '../schemas/kit.schema';

export interface ScheduleAllocationOptions {
  days_available: number;
  questions: Question[];
  role_title?: string;
}

// Category to focus title map for deterministic focus labeling
const CATEGORY_FOCUS_MAP: Record<string, string> = {
  technical: 'Technical Concepts & Coding Practice',
  behavioural: 'Behavioural Stories & Leadership Scenarios',
  'system-design': 'System Design & Architectural Patterns',
  'company-fit': 'Company Culture & Strategic Alignment',
};

const DEFAULT_MINUTES_PER_DIFFICULTY: Record<number, number> = {
  1: 15,
  2: 25,
  3: 35,
};

/**
 * Deterministically allocates interview questions into a study schedule.
 * 
 * Rules:
 * 1. Produces exactly `days_available` days (1..60).
 * 2. Day numbers are sequential integers starting from 1 to `days_available`.
 * 3. Question IDs used in the schedule strictly exist in the input `questions` array.
 * 4. Questions are grouped into contiguous category blocks across days so daily focus labels are meaningful.
 * 5. Daily study minutes are calculated as positive integers based on difficulty or minimum threshold.
 * 6. Daily focus labels are derived deterministically from the predominant question category of that day.
 * 7. Handles 0 questions safely without crashing.
 */
export function allocateSchedule(options: ScheduleAllocationOptions): Schedule {
  const { days_available, questions = [], role_title } = options;

  if (typeof days_available !== 'number' || !Number.isInteger(days_available) || days_available < 1 || days_available > 60) {
    throw new Error(`Invalid days_available: ${days_available}. Must be an integer between 1 and 60.`);
  }

  // Deduplicate and filter valid questions with non-empty string IDs
  const seenIds = new Set<string>();
  const validQuestions: Question[] = [];
  for (const q of questions || []) {
    if (q && typeof q.id === 'string' && q.id.trim() !== '' && !seenIds.has(q.id)) {
      seenIds.add(q.id);
      validQuestions.push(q);
    }
  }

  const days: ScheduleDay[] = [];

  if (validQuestions.length === 0) {
    // Zero questions edge case: generate empty scheduled days with default study time & focus
    for (let dayNum = 1; dayNum <= days_available; dayNum++) {
      days.push({
        day: dayNum,
        focus: role_title ? `${role_title} — General Preparation` : 'General Interview Preparation',
        question_ids: [],
        minutes: 45,
      });
    }

    return {
      days_available,
      days,
    };
  }

  // Sort questions deterministically by category then difficulty then ID
  const sortedQuestions = [...validQuestions].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    if (a.difficulty !== b.difficulty) {
      return a.difficulty - b.difficulty;
    }
    return a.id.localeCompare(b.id);
  });

  // Bucketing questions into days_available bins using contiguous block allocation
  const dayQuestionBins: Question[][] = Array.from({ length: days_available }, () => []);

  if (sortedQuestions.length >= days_available) {
    // Contiguous block allocation: keeps same-category questions together on the same or adjacent days
    sortedQuestions.forEach((q, idx) => {
      const binIdx = Math.floor((idx * days_available) / sortedQuestions.length);
      const clampedBinIdx = Math.min(binIdx, days_available - 1);
      dayQuestionBins[clampedBinIdx].push(q);
    });
  } else {
    // Fewer questions than days: assign 1 question per day for first N days
    sortedQuestions.forEach((q, idx) => {
      dayQuestionBins[idx].push(q);
    });
  }

  // Construct each ScheduleDay
  for (let dayNum = 1; dayNum <= days_available; dayNum++) {
    const dayQuestions = dayQuestionBins[dayNum - 1];
    const question_ids = dayQuestions.map((q) => q.id);

    // Calculate daily minutes based on assigned question difficulties
    let calculatedMinutes = dayQuestions.reduce((sum, q) => {
      const diffTime = DEFAULT_MINUTES_PER_DIFFICULTY[q.difficulty] || 20;
      return sum + diffTime;
    }, 0);

    // Ensure a minimum daily study block (30 min) when 0 questions on that day
    if (calculatedMinutes === 0) {
      calculatedMinutes = 30;
    }

    // Determine day focus based on predominant category in dayQuestions
    const categoryCounts: Record<string, number> = {};
    for (const q of dayQuestions) {
      categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
    }

    let topCategory: string | null = null;
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topCategory = cat;
      }
    }

    let focusLabel: string;
    if (topCategory && CATEGORY_FOCUS_MAP[topCategory]) {
      focusLabel = CATEGORY_FOCUS_MAP[topCategory];
    } else if (dayQuestions.length === 0) {
      focusLabel = 'Review, Mock Practice & Concept Revision';
    } else {
      focusLabel = 'Mixed Question Review & Practice';
    }

    days.push({
      day: dayNum,
      focus: focusLabel,
      question_ids,
      minutes: Math.round(calculatedMinutes),
    });
  }

  return {
    days_available,
    days,
  };
}
