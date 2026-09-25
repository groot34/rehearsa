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

    it('normalizes semantic requirement kind aliases conservatively to Appendix A values', async () => {
      const { normalizeRequirementKind, normalizeLlmJsonKeys } = await import('../geminiProvider');
      const { RoleSchema, KitSchema } = await import('@rehearsa/shared');

      // 1. Individual helper tests
      expect(normalizeRequirementKind('leadership')).toBe('behavioural');
      expect(normalizeRequirementKind('communication')).toBe('behavioural');
      expect(normalizeRequirementKind('management')).toBe('behavioural');
      expect(normalizeRequirementKind('mentoring')).toBe('behavioural');
      expect(normalizeRequirementKind('teamwork')).toBe('behavioural');
      expect(normalizeRequirementKind('ownership')).toBe('behavioural');
      expect(normalizeRequirementKind('collaboration')).toBe('behavioural');
      expect(normalizeRequirementKind('interpersonal')).toBe('behavioural');
      expect(normalizeRequirementKind('soft_skills')).toBe('behavioural');
      expect(normalizeRequirementKind('behavioral')).toBe('behavioural');

      // Canonical kinds remain unchanged
      expect(normalizeRequirementKind('technical')).toBe('technical');
      expect(normalizeRequirementKind('behavioural')).toBe('behavioural');
      expect(normalizeRequirementKind('domain')).toBe('domain');

      // Unknown unsupported kinds remain untouched (not blindly mapped)
      expect(normalizeRequirementKind('banana')).toBe('banana');
      expect(normalizeRequirementKind('quantum_computing')).toBe('quantum_computing');

      // 2. Integration with RoleSchema validation
      const rolePayloadWithAliases = {
        title: 'Senior Backend Engineer',
        seniority: 'Senior',
        responsibilities: ['Design backend services'],
        requirements: [
          { id: 'r1', text: 'Distributed systems in Go', kind: 'technical', priority: 'must' },
          { id: 'r2', text: 'Cross-functional team leadership', kind: 'leadership', priority: 'must' },
          { id: 'r3', text: 'Stakeholder communication', kind: 'communication', priority: 'nice' },
          { id: 'r4', text: 'Fintech domain expertise', kind: 'domain', priority: 'must' },
        ],
      };

      const normalizedRole = normalizeLlmJsonKeys(rolePayloadWithAliases);
      const roleValidated = RoleSchema.safeParse(normalizedRole);

      expect(roleValidated.success).toBe(true);
      if (roleValidated.success) {
        expect(roleValidated.data.requirements[0].kind).toBe('technical');
        expect(roleValidated.data.requirements[1].kind).toBe('behavioural');
        expect(roleValidated.data.requirements[2].kind).toBe('behavioural');
        expect(roleValidated.data.requirements[3].kind).toBe('domain');
      }

      // 3. Unknown kind still rejected by RoleSchema after normalization
      const rolePayloadWithUnknownKind = {
        title: 'Senior Backend Engineer',
        seniority: 'Senior',
        responsibilities: ['Design backend services'],
        requirements: [
          { id: 'r1', text: 'Quantum algorithms', kind: 'quantum_physics', priority: 'must' },
        ],
      };

      const normalizedUnknownRole = normalizeLlmJsonKeys(rolePayloadWithUnknownKind);
      const unknownRoleValidated = RoleSchema.safeParse(normalizedUnknownRole);

      expect(unknownRoleValidated.success).toBe(false);

      // 4. Full Appendix A Kit schema validation with normalized role requirements
      const fullKitPayload = {
        source: {
          company: 'Acme Corp',
          company_url: 'https://example.com',
          role: 'Senior Backend Engineer',
          location: 'Remote',
          jd_chars: 1200,
          researched_at: new Date().toISOString(),
          pages_used: ['https://example.com/careers'],
        },
        company_brief: {
          summary: 'Acme builds distributed fintech tools.',
          what_they_do: 'Enterprise payments infrastructure.',
          sources: ['https://example.com/about'],
        },
        role: normalizedRole,
        questions: [
          {
            id: 'q1',
            requirement_ids: ['r1'],
            category: 'technical',
            prompt: 'Explain raft consensus algorithm.',
            answer_outline: 'Discuss leader election and log replication.',
            difficulty: 3,
          },
          {
            id: 'q2',
            requirement_ids: ['r2'],
            category: 'behavioural',
            prompt: 'Tell me about a time you led a team through a crisis.',
            answer_outline: 'Describe incident response, communication, and resolution.',
            difficulty: 2,
          },
        ],
        flashcards: [
          {
            id: 'f1',
            front: 'What is Raft?',
            back: 'A consensus algorithm designed for fault-tolerant distributed systems.',
            requirement_ids: ['r1'],
          },
        ],
        schedule: {
          days_available: 2,
          days: [
            { day: 1, focus: 'Distributed Systems', question_ids: ['q1'], minutes: 30 },
            { day: 2, focus: 'Leadership & Behavior', question_ids: ['q2'], minutes: 30 },
          ],
        },
        coverage: {
          uncovered_requirement_ids: ['r3', 'r4'],
          passes: 1,
        },
      };

      const kitValidated = KitSchema.safeParse(fullKitPayload);
      expect(kitValidated.success).toBe(true);
    });
  });
});

