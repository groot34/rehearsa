import {
  Kit,
  Question,
  Flashcard,
  QuestionSchema,
  FlashcardSchema,
  checkRequirementCoverage,
} from '@rehearsa/shared';

export interface KitEditResult {
  success: boolean;
  kit?: Kit;
  error?: string;
}

/**
 * Updates an existing interview question within a Kit immutably.
 * Validates the updated question against QuestionSchema and updates requirement coverage.
 */
export function updateQuestionInKit(kit: Kit, updatedQuestion: Question): KitEditResult {
  const parseResult = QuestionSchema.safeParse(updatedQuestion);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return { success: false, error: `Validation failed: ${errorMsg}` };
  }

  const existingIdx = kit.questions.findIndex((q) => q.id === updatedQuestion.id);
  if (existingIdx === -1) {
    return { success: false, error: `Question with ID ${updatedQuestion.id} not found.` };
  }

  const newQuestions = [...kit.questions];
  newQuestions[existingIdx] = parseResult.data;

  const coverageRes = checkRequirementCoverage(kit.role.requirements, newQuestions);

  const updatedKit: Kit = {
    ...kit,
    questions: newQuestions,
    coverage: {
      ...kit.coverage,
      uncovered_requirement_ids: coverageRes.uncovered_requirement_ids,
    },
  };

  return { success: true, kit: updatedKit };
}

/**
 * Adds a new custom question to a Kit with a generated ID.
 * Validates referential integrity against the role's requirements.
 */
export function addQuestionToKit(
  kit: Kit,
  questionData: Omit<Question, 'id'>,
  customId?: string
): KitEditResult {
  const id = customId || `q_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const candidateQuestion: Question = {
    id,
    ...questionData,
  };

  const parseResult = QuestionSchema.safeParse(candidateQuestion);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return { success: false, error: `Validation failed: ${errorMsg}` };
  }

  // Verify that linked requirement IDs exist in role requirements
  const validReqIds = new Set(kit.role.requirements.map((r) => r.id));
  const invalidRefs = candidateQuestion.requirement_ids.filter((rid) => !validReqIds.has(rid));
  if (invalidRefs.length > 0) {
    return {
      success: false,
      error: `Question references unknown requirement ID(s): ${invalidRefs.join(', ')}`,
    };
  }

  const newQuestions = [...kit.questions, parseResult.data];
  const coverageRes = checkRequirementCoverage(kit.role.requirements, newQuestions);

  const updatedKit: Kit = {
    ...kit,
    questions: newQuestions,
    coverage: {
      ...kit.coverage,
      uncovered_requirement_ids: coverageRes.uncovered_requirement_ids,
    },
  };

  return { success: true, kit: updatedKit };
}

/**
 * Deletes a question from a Kit.
 * Cleans up references to the question in the study schedule and recalculates requirement coverage.
 */
export function deleteQuestionFromKit(kit: Kit, questionId: string): KitEditResult {
  const existingIdx = kit.questions.findIndex((q) => q.id === questionId);
  if (existingIdx === -1) {
    return { success: false, error: `Question with ID ${questionId} not found.` };
  }

  const newQuestions = kit.questions.filter((q) => q.id !== questionId);

  // Clean up references in the study schedule so referential integrity is preserved
  const updatedScheduleDays = kit.schedule.days.map((day) => ({
    ...day,
    question_ids: day.question_ids.filter((qid) => qid !== questionId),
  }));

  const coverageRes = checkRequirementCoverage(kit.role.requirements, newQuestions);

  const updatedKit: Kit = {
    ...kit,
    questions: newQuestions,
    schedule: {
      ...kit.schedule,
      days: updatedScheduleDays,
    },
    coverage: {
      ...kit.coverage,
      uncovered_requirement_ids: coverageRes.uncovered_requirement_ids,
    },
  };

  return { success: true, kit: updatedKit };
}

/**
 * Updates an existing flashcard within a Kit immutably.
 */
export function updateFlashcardInKit(kit: Kit, updatedCard: Flashcard): KitEditResult {
  const parseResult = FlashcardSchema.safeParse(updatedCard);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return { success: false, error: `Validation failed: ${errorMsg}` };
  }

  const existingIdx = kit.flashcards.findIndex((f) => f.id === updatedCard.id);
  if (existingIdx === -1) {
    return { success: false, error: `Flashcard with ID ${updatedCard.id} not found.` };
  }

  const newFlashcards = [...kit.flashcards];
  newFlashcards[existingIdx] = parseResult.data;

  const updatedKit: Kit = {
    ...kit,
    flashcards: newFlashcards,
  };

  return { success: true, kit: updatedKit };
}

/**
 * Adds a new custom flashcard to a Kit with a generated ID.
 */
export function addFlashcardToKit(
  kit: Kit,
  cardData: Omit<Flashcard, 'id'>,
  customId?: string
): KitEditResult {
  const id = customId || `f_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const candidateCard: Flashcard = {
    id,
    ...cardData,
  };

  const parseResult = FlashcardSchema.safeParse(candidateCard);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return { success: false, error: `Validation failed: ${errorMsg}` };
  }

  const validReqIds = new Set(kit.role.requirements.map((r) => r.id));
  const invalidRefs = candidateCard.requirement_ids.filter((rid) => !validReqIds.has(rid));
  if (invalidRefs.length > 0) {
    return {
      success: false,
      error: `Flashcard references unknown requirement ID(s): ${invalidRefs.join(', ')}`,
    };
  }

  const newFlashcards = [...kit.flashcards, parseResult.data];

  const updatedKit: Kit = {
    ...kit,
    flashcards: newFlashcards,
  };

  return { success: true, kit: updatedKit };
}

/**
 * Deletes a flashcard from a Kit.
 */
export function deleteFlashcardFromKit(kit: Kit, cardId: string): KitEditResult {
  const existingIdx = kit.flashcards.findIndex((f) => f.id === cardId);
  if (existingIdx === -1) {
    return { success: false, error: `Flashcard with ID ${cardId} not found.` };
  }

  const newFlashcards = kit.flashcards.filter((f) => f.id !== cardId);

  const updatedKit: Kit = {
    ...kit,
    flashcards: newFlashcards,
  };

  return { success: true, kit: updatedKit };
}
