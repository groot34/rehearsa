import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { z } from 'zod';
import { MockLlmProvider } from '../mockProvider';
import { createLlmProvider } from '../llmFactory';
import {
  GeminiProvider,
  DEFAULT_GEMINI_TIMEOUT_MS,
  GEMINI_MAX_ATTEMPTS,
  geminiRetryDelayMs,
} from '../geminiProvider';

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

describe('GeminiProvider Timeout Configuration', () => {
  let originalTimeout: string | undefined;

  beforeEach(() => {
    originalTimeout = process.env.GEMINI_TIMEOUT_MS;
  });

  afterEach(() => {
    if (originalTimeout === undefined) {
      delete process.env.GEMINI_TIMEOUT_MS;
    } else {
      process.env.GEMINI_TIMEOUT_MS = originalTimeout;
    }
  });

  it('falls back to DEFAULT_GEMINI_TIMEOUT_MS (60000) when env var is absent', () => {
    delete process.env.GEMINI_TIMEOUT_MS;
    const provider = new GeminiProvider('test-key', 'gemini-1.5-flash');
    expect(provider.getRequestTimeoutMs()).toBe(DEFAULT_GEMINI_TIMEOUT_MS);
    expect(DEFAULT_GEMINI_TIMEOUT_MS).toBe(60000);
  });

  it('picks up GEMINI_TIMEOUT_MS env var when valid and >= 1000', () => {
    process.env.GEMINI_TIMEOUT_MS = '90000';
    const provider = new GeminiProvider('test-key', 'gemini-1.5-flash');
    expect(provider.getRequestTimeoutMs()).toBe(90000);
  });

  it('falls back to default when env var is below 1000 ms clamp', () => {
    process.env.GEMINI_TIMEOUT_MS = '500';
    const provider = new GeminiProvider('test-key', 'gemini-1.5-flash');
    expect(provider.getRequestTimeoutMs()).toBe(DEFAULT_GEMINI_TIMEOUT_MS);
  });

  it('falls back to default when env var is non-numeric garbage', () => {
    process.env.GEMINI_TIMEOUT_MS = 'banana';
    const provider = new GeminiProvider('test-key', 'gemini-1.5-flash');
    expect(provider.getRequestTimeoutMs()).toBe(DEFAULT_GEMINI_TIMEOUT_MS);
  });

  it('explicit constructor timeoutMs 3rd arg overrides env var and default', () => {
    process.env.GEMINI_TIMEOUT_MS = '120000';
    const provider = new GeminiProvider('test-key', 'gemini-1.5-flash', 30000);
    expect(provider.getRequestTimeoutMs()).toBe(30000);
  });
});

describe('Gemini Retry Delay (Exponential Backoff + Jitter)', () => {
  it('attempt 1 always returns 0 (first attempt, no prior delay)', () => {
    for (let i = 0; i < 20; i++) {
      expect(geminiRetryDelayMs(1)).toBe(0);
    }
    expect(geminiRetryDelayMs(0)).toBe(0);
    expect(geminiRetryDelayMs(-5)).toBe(0);
  });

  it('attempt 2 returns delay in [1000, 2000) ms range (exponential base 1000 + 0..999 jitter)', () => {
    const samples: number[] = [];
    for (let i = 0; i < 50; i++) {
      const d = geminiRetryDelayMs(2);
      samples.push(d);
      expect(d).toBeGreaterThanOrEqual(1000);
      expect(d).toBeLessThan(2000);
      expect(Number.isInteger(d)).toBe(true);
    }
    // Very low probability both min and max never appear in 50 samples
    expect(samples.some((d) => d < 1200)).toBe(true);
    expect(samples.some((d) => d >= 1700)).toBe(true);
  });

  it('attempt 3 returns delay in [2000, 3000) ms range (exponential base 2000 + 0..999 jitter)', () => {
    for (let i = 0; i < 50; i++) {
      const d = geminiRetryDelayMs(3);
      expect(d).toBeGreaterThanOrEqual(2000);
      expect(d).toBeLessThan(3000);
    }
  });

  it('GEMINI_MAX_ATTEMPTS is exactly 3 (bounded retries, no infinite loop)', () => {
    expect(GEMINI_MAX_ATTEMPTS).toBe(3);
  });
});

describe('GeminiProvider Retry Behaviour (no sleep after final attempt)', () => {
  let postSpy: any;
  let setTimeoutSpy: any;
  const TestSchema = z.object({ ok: z.literal(true) });

  beforeEach(() => {
    vi.useFakeTimers();
    postSpy = vi
      .spyOn(axios, 'post')
      .mockImplementation(() => Promise.reject(new Error('timeout of 60000ms exceeded')));
    setTimeoutSpy = vi.spyOn(global, 'setTimeout');
  });

  afterEach(() => {
    postSpy.mockRestore();
    setTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  function driveRetryLoop(promise: Promise<any>): Promise<void> {
    // Drive the retry loop: timers and microtasks.
    // With GEMINI_MAX_ATTEMPTS=3 and backoff at the loop TOP, setTimeout should
    // fire TWICE (before attempt 2, before attempt 3) — never after attempt 3.
    // Return a promise that resolves once the inner promise has definitely settled.
    return new Promise((resolve) => {
      promise.catch(() => {}).finally(() => resolve());
      let iter = 0;
      const tick = () => {
        iter++;
        if (iter > 30) {
          resolve();
          return;
        }
        Promise.resolve()
          .then(() => vi.advanceTimersByTimeAsync(10000))
          .then(tick)
          .catch(() => resolve());
      };
      tick();
    });
  }

  it('generates structured JSON with exactly 3 axios attempts and exactly 2 setTimeout sleeps (no sleep after attempt #3)', async () => {
    const provider = new GeminiProvider('test-key', 'gemini-1.5-flash', 1000);

    // Kick off the call
    const promise = provider.generateStructuredJson('prompt', 'sys', TestSchema);

    // Drive the fake-timer retry loop to completion
    await driveRetryLoop(promise);

    // Await the rejection (now already settled, no unhandled warning)
    await expect(promise).rejects.toThrow(/Gemini Provider failed after 3 attempts:/);

    // Exactly 3 axios.post calls (one per attempt)
    expect(postSpy).toHaveBeenCalledTimes(3);
    // Exactly 2 setTimeout sleeps: once before attempt 2, once before attempt 3.
    // No sleep should be scheduled AFTER the 3rd (final) failed attempt.
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
  });

  it('generateText retries 3 times and surfaces aggregate "after 3 attempts" error without extra final sleep', async () => {
    const provider = new GeminiProvider('test-key', 'gemini-1.5-flash', 1000);

    const promise = provider.generateText('prompt', 'sys');
    await driveRetryLoop(promise);

    await expect(promise).rejects.toThrow(/Gemini generateText failed after 3 attempts:/);
    expect(postSpy).toHaveBeenCalledTimes(3);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
  });
});

describe('Existing Gemini and Mock Provider Behaviour (Compatibility / Not Weakened)', () => {
  it('createLlmProvider still returns Mock LLM Provider explicitly', () => {
    const p = createLlmProvider('mock');
    expect(p.name).toBe('Mock LLM Provider');
  });

  it('GeminiProvider still throws on missing API key (unchanged error contract)', async () => {
    const provider = new GeminiProvider('', 'gemini-1.5-flash');
    const Schema = z.object({ k: z.string() });
    await expect(provider.generateStructuredJson('x', 'y', Schema)).rejects.toThrow(
      'Gemini API key is not configured'
    );
    await expect(provider.generateText('x', 'y')).rejects.toThrow(
      'Gemini API key is not configured'
    );
  });

  it('MockLlmProvider still produces schema-validated structured data end-to-end (role extraction prompt keyword path)', async () => {
    const Schema = z.object({
      title: z.string(),
      requirements: z.array(z.object({ id: z.string(), text: z.string() })),
    });
    const provider = new MockLlmProvider();
    // Use a prompt that contains the role-extraction keywords so MockProvider
    // returns the role-shaped output (not default questions/flashcards).
    const res = await provider.generateStructuredJson(
      'Please extract role and requirements from the job description',
      'system instruction',
      Schema
    );
    expect(typeof res.title).toBe('string');
    expect(Array.isArray(res.requirements)).toBe(true);
    expect(res.requirements.length).toBeGreaterThan(0);
  });
});

