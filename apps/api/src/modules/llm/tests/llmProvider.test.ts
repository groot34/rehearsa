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

  describe('normalizeLlmJsonKeys Helper', () => {
    it('normalizes common role and requirement key variations', async () => {
      const { normalizeLlmJsonKeys } = await import('../geminiProvider');
      const input = {
        job_title: 'Staff Platform Engineer',
        seniority_level: 'Staff',
        core_responsibilities: ['Build distributed systems'],
        prioritized_requirements: [
          {
            id: 'r1',
            description: 'Deep Go concurrency',
            category: 'technical',
            priority: 'must',
          },
        ],
      };

      const normalized = normalizeLlmJsonKeys(input);
      expect(normalized).toEqual({
        title: 'Staff Platform Engineer',
        seniority: 'Staff',
        responsibilities: ['Build distributed systems'],
        requirements: [
          {
            id: 'r1',
            text: 'Deep Go concurrency',
            kind: 'technical',
            priority: 'must',
          },
        ],
      });
    });

    it('preserves untouched keys for question objects', async () => {
      const { normalizeLlmJsonKeys } = await import('../geminiProvider');
      const question = {
        id: 'q1',
        category: 'technical',
        prompt: 'Explain channels in Go',
        difficulty: 2,
      };

      const normalized = normalizeLlmJsonKeys(question);
      expect(normalized.category).toBe('technical');
      expect(normalized.prompt).toBe('Explain channels in Go');
    });

    it('handles null, non-object, and empty primitives gracefully', async () => {
      const { normalizeLlmJsonKeys } = await import('../geminiProvider');
      expect(normalizeLlmJsonKeys(null)).toBeNull();
      expect(normalizeLlmJsonKeys('string')).toBe('string');
      expect(normalizeLlmJsonKeys(42)).toBe(42);
      expect(normalizeLlmJsonKeys(undefined)).toBeUndefined();
    });
  });
});

