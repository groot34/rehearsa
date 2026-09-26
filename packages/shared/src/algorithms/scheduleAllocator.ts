import { Question, Schedule, ScheduleDay, RoleRequirement } from '../schemas/kit.schema';

export interface ScheduleAllocationOptions {
  days_available: number;
  questions: Question[];
  role_title?: string;
}

/**
 * Calculates target question count based on days_available and available requirements.
 * Ensures enough questions to populate all days while avoiding excessive generation.
 */
export function calculateTargetQuestionCount(days_available: number, requirements: RoleRequirement[]): number {
  // Minimum: at least one question per day
  const minimum = days_available;
  
  // Base multiplier based on requirement count (more requirements = more potential depth)
  const reqCount = requirements.length;
  let multiplier = 1.0; // Default: exactly minimum for small requirements
  
  if (reqCount >= 10) {
    multiplier = 1.5; // Rich requirements: 50% more questions
  } else if (reqCount >= 5) {
    multiplier = 1.3; // Moderate requirements: 30% more questions
  } else if (reqCount >= 3) {
    multiplier = 1.2; // Some requirements: 20% more questions
  }
  
  // Calculate target
  let target = Math.ceil(days_available * multiplier);
  
  // Cap maximum to avoid absurd question counts (e.g., 180 questions for 60 days)
  const maximum = Math.min(days_available * 3, 120);
  target = Math.min(target, maximum);
  
  // Ensure minimum is met
  return Math.max(target, minimum);
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
 * 7. Requires at least `days_available` questions to ensure every day has study material.
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

  // Validate minimum question count
  if (validQuestions.length < days_available) {
    throw new Error(
      `Insufficient questions for ${days_available} days. Got ${validQuestions.length} questions, need at least ${days_available}. The generation pipeline should ensure minimum question count.`
    );
  }

  const days: ScheduleDay[] = [];

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

  // Bucketing questions into days_available bins ensuring every day gets at least 1 question
  const dayQuestionBins: Question[][] = Array.from({ length: days_available }, () => []);

  // First pass: ensure every day gets at least 1 question
  for (let dayIdx = 0; dayIdx < days_available; dayIdx++) {
    if (dayIdx < sortedQuestions.length) {
      dayQuestionBins[dayIdx].push(sortedQuestions[dayIdx]);
    }
  }

  // Second pass: distribute remaining questions evenly
  const remainingQuestions = sortedQuestions.slice(days_available);
  remainingQuestions.forEach((q, idx) => {
    const binIdx = idx % days_available;
    dayQuestionBins[binIdx].push(q);
  });

  // Construct each ScheduleDay
  for (let dayNum = 1; dayNum <= days_available; dayNum++) {
    const dayQuestions = dayQuestionBins[dayNum - 1];
    const question_ids = dayQuestions.map((q) => q.id);

    // Calculate daily minutes based on assigned question difficulties
    let calculatedMinutes = dayQuestions.reduce((sum, q) => {
      const diffTime = DEFAULT_MINUTES_PER_DIFFICULTY[q.difficulty] || 20;
      return sum + diffTime;
    }, 0);

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
