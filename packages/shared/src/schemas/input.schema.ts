import { z } from 'zod';

export const CreateKitInputSchema = z.object({
  jobDescription: z.string().min(20, 'Job description must be at least 20 characters'),
  companyUrl: z.string().url('A valid company URL is required'),
  daysAvailable: z.number().int().min(1).max(60, 'Days available must be between 1 and 60'),
});

export type CreateKitInput = z.infer<typeof CreateKitInputSchema>;
