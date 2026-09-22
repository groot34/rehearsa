import { z } from 'zod';

export const RequirementKindEnum = z.enum(['technical', 'behavioural', 'domain']);
export type RequirementKind = z.infer<typeof RequirementKindEnum>;

export const RequirementPriorityEnum = z.enum(['must', 'nice']);
export type RequirementPriority = z.infer<typeof RequirementPriorityEnum>;

export const QuestionCategoryEnum = z.enum([
  'technical',
  'behavioural',
  'system-design',
  'company-fit',
]);
export type QuestionCategory = z.infer<typeof QuestionCategoryEnum>;

export const SourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int().nonnegative(),
  researched_at: z.string(),
  pages_used: z.array(z.string()),
});

export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

export const RoleRequirementSchema = z.object({
  id: z.string().min(1, 'Requirement ID cannot be empty'),
  text: z.string().min(1, 'Requirement text cannot be empty'),
  kind: RequirementKindEnum,
  priority: RequirementPriorityEnum,
});

export const RoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RoleRequirementSchema),
});

export const QuestionSchema = z.object({
  id: z.string().min(1, 'Question ID cannot be empty'),
  requirement_ids: z.array(z.string()),
  category: QuestionCategoryEnum,
  prompt: z.string().min(1, 'Question prompt cannot be empty'),
  answer_outline: z.string().min(1, 'Answer outline cannot be empty'),
  difficulty: z.number().int().min(1).max(3),
});

export const FlashcardSchema = z.object({
  id: z.string().min(1, 'Flashcard ID cannot be empty'),
  front: z.string().min(1, 'Flashcard front text cannot be empty'),
  back: z.string().min(1, 'Flashcard back text cannot be empty'),
  requirement_ids: z.array(z.string()),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string().min(1, 'Schedule focus cannot be empty'),
  question_ids: z.array(z.string()),
  minutes: z.number().int().positive('Schedule day minutes must be a positive integer'),
});

export const ScheduleSchema = z.object({
  days_available: z.number().int().min(1).max(60),
  days: z.array(ScheduleDaySchema),
}).refine((val) => val.days.length === val.days_available, {
  message: 'Schedule days array length must exactly match days_available',
  path: ['days'],
});

export const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().positive('Coverage passes must be a positive integer'),
});

export const KitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema,
}).superRefine((data, ctx) => {
  // 1. Check requirement ID uniqueness
  const seenReqIds = new Set<string>();
  data.role.requirements.forEach((req, idx) => {
    if (seenReqIds.has(req.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate requirement ID found: ${req.id}`,
        path: ['role', 'requirements', idx, 'id'],
      });
    }
    seenReqIds.add(req.id);
  });

  // 2. Check question ID uniqueness
  const seenQuestionIds = new Set<string>();
  data.questions.forEach((q, idx) => {
    if (seenQuestionIds.has(q.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate question ID found: ${q.id}`,
        path: ['questions', idx, 'id'],
      });
    }
    seenQuestionIds.add(q.id);
  });

  // 3. Check flashcard ID uniqueness
  const seenFlashcardIds = new Set<string>();
  data.flashcards.forEach((f, idx) => {
    if (seenFlashcardIds.has(f.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate flashcard ID found: ${f.id}`,
        path: ['flashcards', idx, 'id'],
      });
    }
    seenFlashcardIds.add(f.id);
  });

  // 4. Validate referential integrity: question requirement_ids exist in role.requirements
  data.questions.forEach((question, idx) => {
    question.requirement_ids.forEach((reqId) => {
      if (!seenReqIds.has(reqId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Question ${question.id} references invalid requirement ID: ${reqId}`,
          path: ['questions', idx, 'requirement_ids'],
        });
      }
    });
  });

  // 5. Validate referential integrity: flashcard requirement_ids exist in role.requirements
  data.flashcards.forEach((card, idx) => {
    card.requirement_ids.forEach((reqId) => {
      if (!seenReqIds.has(reqId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Flashcard ${card.id} references invalid requirement ID: ${reqId}`,
          path: ['flashcards', idx, 'requirement_ids'],
        });
      }
    });
  });

  // 6. Validate referential integrity: schedule question_ids exist in questions
  data.schedule.days.forEach((day, dayIdx) => {
    day.question_ids.forEach((qId) => {
      if (!seenQuestionIds.has(qId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Schedule day ${day.day} references unknown question ID: ${qId}`,
          path: ['schedule', 'days', dayIdx, 'question_ids'],
        });
      }
    });
  });
});

export type Kit = z.infer<typeof KitSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type RoleRequirement = z.infer<typeof RoleRequirementSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
