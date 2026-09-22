import { z } from 'zod';

export interface ILlmProvider {
  name: string;

  /**
   * Generates a structured JSON object matching the provided Zod schema.
   */
  generateStructuredJson<T>(
    prompt: string,
    systemInstruction: string,
    schema: z.ZodType<T>
  ): Promise<T>;

  /**
   * Generates free-form text response.
   */
  generateText(prompt: string, systemInstruction?: string): Promise<string>;
}
