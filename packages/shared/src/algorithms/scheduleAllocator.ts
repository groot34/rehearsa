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
 * Builds a deterministic array of phase-based focus labels for empty schedule days.
 * Labels are based on the actual categories present in the question set.
 */
function buildPhaseFocusLabels(categories: Set<string>, days_available: number): string[] {
  const labels: string[] = [];
  
  // Phase 1: Category-specific review (based on actual categories present)
  const categoryArray = Array.from(categories).sort();
  for (const cat of categoryArray) {
    if (CATEGORY_FOCUS_MAP[cat]) {
      labels.push(`${CATEGORY_FOCUS_MAP[cat]} Review`);
    }
  }
  
  // Phase 2: Mock interview practice
  if (days_available >= 7) {
    labels.push('Technical Mock Interview');
    labels.push('Behavioural Mock Interview');
    labels.push('Mixed Mock Interview');
  }
  
  // Phase 3: Weak area and flashcard revision
  if (days_available >= 14) {
    labels.push('Weak Area & Flashcard Revision');
  }
  
  // Phase 4: Final revision
  if (days_available >= 21) {
    labels.push('Final Revision & Interview Readiness');
  }
  
  // Fallback if no categories or very short schedule
  if (labels.length === 0) {
    labels.push('General Interview Preparation');
  }
  
  return labels;
}

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
    // Zero questions edge case: generate empty scheduled days with phase-based focus labels
    const emptyCategories = new Set<string>();
    const phaseLabels = buildPhaseFocusLabels(emptyCategories, days_available);
    
    for (let dayNum = 1; dayNum <= days_available; dayNum++) {
      const focusIndex = (dayNum - 1) % phaseLabels.length;
      days.push({
        day: dayNum,
        focus: phaseLabels[focusIndex],
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
    // Fewer questions than days: spread questions evenly across all days
    sortedQuestions.forEach((q, idx) => {
      const binIdx = Math.floor((idx * days_available) / sortedQuestions.length);
      const clampedBinIdx = Math.min(binIdx, days_available - 1);
      dayQuestionBins[clampedBinIdx].push(q);
    });
  }

  // Extract unique categories from all questions for phase label generation
  const presentCategories = new Set<string>();
  for (const q of validQuestions) {
    presentCategories.add(q.category);
  }
  
  // Build phase-based focus labels for empty days
  const phaseLabels = buildPhaseFocusLabels(presentCategories, days_available);

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
      // Use phase-based focus label for empty days
      const phaseIndex = (dayNum - 1) % phaseLabels.length;
      focusLabel = phaseLabels[phaseIndex];
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
