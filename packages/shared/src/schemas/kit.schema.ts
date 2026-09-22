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
  id: z.string(),
  text: z.string(),
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
  id: z.string(),
  requirement_ids: z.array(z.string()),
  category: QuestionCategoryEnum,
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3),
});

export const FlashcardSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string()),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().positive(),
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
  passes: z.number().int().positive(),
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
  // Validate referential integrity: question requirement_ids exist in role.requirements
  const validRequirementIds = new Set(data.role.requirements.map((r) => r.id));
  const validQuestionIds = new Set(data.questions.map((q) => q.id));

  data.questions.forEach((question, idx) => {
    question.requirement_ids.forEach((reqId) => {
      if (!validRequirementIds.has(reqId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Question ${question.id} references invalid requirement ID: ${reqId}`,
          path: ['questions', idx, 'requirement_ids'],
        });
      }
    });
  });

  data.flashcards.forEach((card, idx) => {
    card.requirement_ids.forEach((reqId) => {
      if (!validRequirementIds.has(reqId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Flashcard ${card.id} references invalid requirement ID: ${reqId}`,
          path: ['flashcards', idx, 'requirement_ids'],
        });
      }
    });
  });

  data.schedule.days.forEach((day, dayIdx) => {
    day.question_ids.forEach((qId) => {
      if (!validQuestionIds.has(qId)) {
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
