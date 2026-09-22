import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { MockLlmProvider } from '../mockProvider';
import { createLlmProvider } from '../llmFactory';
import { GeminiProvider } from '../geminiProvider';

describe('LlmProvider Abstraction', () => {
  it('instantiates MockLlmProvider when no API key is set', () => {
    const provider = createLlmProvider('mock');
    expect(provider.name).toBe('Mock LLM Provider');
  });

  it('MockLlmProvider generates schema-validated structured JSON for role extraction', async () => {
    const provider = new MockLlmProvider();
    const TestSchema = z.object({
      title: z.string(),
      requirements: z.array(z.object({ id: z.string(), text: z.string() })),
    });

    const res = await provider.generateStructuredJson('Extract role and requirements from JD', 'System prompt', TestSchema);

    expect(res.title).toBeDefined();
    expect(res.requirements.length).toBeGreaterThan(0);
    expect(res.requirements[0].id).toBeDefined();
  });

  it('GeminiProvider throws descriptive error when GEMINI_API_KEY is missing', async () => {
    const provider = new GeminiProvider('', 'gemini-1.5-flash');
    const TestSchema = z.object({ key: z.string() });

    await expect(provider.generateStructuredJson('test', 'sys', TestSchema)).rejects.toThrow('Gemini API key is not configured');
  });
});
