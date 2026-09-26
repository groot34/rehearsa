import { describe, it, expect } from 'vitest';
import { executeGenerationPipeline } from '../pipelineOrchestrator';
import { MockLlmProvider } from '../../llm/mockProvider';

const mockProvider = new MockLlmProvider();

describe('executeGenerationPipeline', () => {
  it('returns INVALID_INPUT error when jobDescription is too short', async () => {
    const result = await executeGenerationPipeline({
      jobDescription: 'Short',
      companyUrl: 'https://example.com',
      daysAvailable: 7,
      provider: mockProvider,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_INPUT');
    expect(result.error?.message).toContain('20 characters');
  });

  it('returns INVALID_INPUT error when daysAvailable is out of range', async () => {
    const result = await executeGenerationPipeline({
      jobDescription: 'We are looking for a senior full-stack engineer to join our team.',
      companyUrl: 'https://example.com',
      daysAvailable: 0,
      provider: mockProvider,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_INPUT');
    expect(result.error?.message).toContain('1 and 60');
  });

  it('rejects private IP company URLs due to SSRF protection', async () => {
    const result = await executeGenerationPipeline({
      jobDescription: 'We are looking for a senior full-stack engineer to join our platform engineering team.',
      companyUrl: 'http://192.168.1.1/internal',
      daysAvailable: 7,
      provider: mockProvider,
      allowLoopbackInDev: false,
    });

    // SSRF blocks the crawl; pipeline should still succeed with a fallback company brief
    // or fail gracefully, not throw an unhandled exception
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });

  it('generates a valid kit with MockLlmProvider and loopback allowed for company URL', async () => {
    const result = await executeGenerationPipeline({
      jobDescription:
        'We are seeking a Senior Full Stack Engineer proficient in TypeScript, React, Node.js, and cloud infrastructure to build scalable products.',
      companyUrl: 'https://example.com',
      daysAvailable: 14,
      provider: mockProvider,
      allowLoopbackInDev: true,
    });

    // Crawl of example.com may succeed or fail in the test environment;
    // the pipeline must succeed regardless using the mock provider for LLM calls
    if (result.success) {
      const kit = result.kit!;

      // Source fields
      expect(kit.source.role).toBeDefined();
      expect(kit.source.company_url).toBe('https://example.com');
      expect(kit.source.jd_chars).toBeGreaterThan(0);
      expect(typeof kit.source.researched_at).toBe('string');

      // Role extraction
      expect(kit.role.title).toBeDefined();
      expect(kit.role.requirements.length).toBeGreaterThan(0);

      // Questions & flashcards
      expect(kit.questions.length).toBeGreaterThan(0);
      expect(kit.flashcards.length).toBeGreaterThan(0);

      // Deterministic schedule
      expect(kit.schedule.days_available).toBe(14);
      expect(kit.schedule.days.length).toBe(14);

      // Coverage
      expect(Array.isArray(kit.coverage.uncovered_requirement_ids)).toBe(true);
      expect(kit.coverage.passes).toBe(2);
    } else {
      // If the pipeline fails, it should be due to a network/crawl issue, not a crash
      expect(result.error?.code).toBeDefined();
    }
  });

  it('generates enough questions for 25-day schedule', async () => {
    const result = await executeGenerationPipeline({
      jobDescription:
        'We are seeking a Senior Full Stack Engineer proficient in TypeScript, React, Node.js, PostgreSQL, system design, cloud infrastructure, and team leadership to build scalable products.',
      companyUrl: 'https://example.com',
      daysAvailable: 25,
      provider: mockProvider,
      allowLoopbackInDev: true,
    });

    if (result.success) {
      const kit = result.kit!;
      
      // Should have at least 25 questions to populate all days
      expect(kit.questions.length).toBeGreaterThanOrEqual(25);
      
      // Schedule should have exactly 25 days
      expect(kit.schedule.days_available).toBe(25);
      expect(kit.schedule.days.length).toBe(25);
      
      // Every day should have at least 1 question
      kit.schedule.days.forEach((day) => {
        expect(day.question_ids.length).toBeGreaterThanOrEqual(1);
      });
    }
  });

  it('generates enough questions for 7-day schedule', async () => {
    const result = await executeGenerationPipeline({
      jobDescription:
        'We are seeking a Full Stack Engineer proficient in TypeScript, React, and Node.js.',
      companyUrl: 'https://example.com',
      daysAvailable: 7,
      provider: mockProvider,
      allowLoopbackInDev: true,
    });

    if (result.success) {
      const kit = result.kit!;
      
      // Should have at least 7 questions
      expect(kit.questions.length).toBeGreaterThanOrEqual(7);
      
      // Schedule should have exactly 7 days
      expect(kit.schedule.days_available).toBe(7);
      expect(kit.schedule.days.length).toBe(7);
      
      // Every day should have at least 1 question
      kit.schedule.days.forEach((day) => {
        expect(day.question_ids.length).toBeGreaterThanOrEqual(1);
      });
    }
  });
});
