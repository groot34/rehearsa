import { describe, it, expect } from 'vitest';
import { MockPublicInterviewSearchProvider } from '../mockInterviewSearchProvider';
import { GoogleCustomSearchProvider } from '../googleCustomSearchProvider';
import { createInterviewSearchProvider } from '../interviewSearchFactory';

describe('MockPublicInterviewSearchProvider', () => {
  it('should return mock results for Google', async () => {
    const provider = new MockPublicInterviewSearchProvider();
    const results = await provider.searchInterviewDiscussions('Google', 'Software Engineer');

    expect(results).toHaveLength(2);
    expect(results[0].title).toContain('Google');
    expect(results[0].url).toContain('google');
    expect(results[0].snippet).toBeTruthy();
    expect(results[0].source).toBe('MockSource');
  });

  it('should return mock results for Amazon', async () => {
    const provider = new MockPublicInterviewSearchProvider();
    const results = await provider.searchInterviewDiscussions('Amazon');

    expect(results).toHaveLength(1);
    expect(results[0].title).toContain('Amazon');
    expect(results[0].snippet).toContain('Leadership Principles');
  });

  it('should return generic mock results for unknown company', async () => {
    const provider = new MockPublicInterviewSearchProvider();
    const results = await provider.searchInterviewDiscussions('UnknownCorp');

    expect(results).toHaveLength(2);
    expect(results[0].title).toContain('UnknownCorp');
    expect(results[1].title).toContain('UnknownCorp');
  });

  it('should handle role parameter without error', async () => {
    const provider = new MockPublicInterviewSearchProvider();
    const results = await provider.searchInterviewDiscussions('Google', 'Frontend Engineer');

    expect(results).toHaveLength(2);
  });
});

describe('GoogleCustomSearchProvider', () => {
  it('should report not configured when credentials missing', () => {
    const provider = new GoogleCustomSearchProvider();
    expect(provider.isConfigured()).toBe(false);
  });

  it('should report configured when credentials provided', () => {
    const provider = new GoogleCustomSearchProvider('test-key', 'test-cx');
    expect(provider.isConfigured()).toBe(true);
  });

  it('should throw error when searching without credentials', async () => {
    const provider = new GoogleCustomSearchProvider();
    await expect(provider.searchInterviewDiscussions('Google')).rejects.toThrow('not configured');
  });

  it('should extract source from URL', () => {
    const provider = new GoogleCustomSearchProvider('test-key', 'test-cx');
    const extractSource = (provider as any).extractSource.bind(provider);

    expect(extractSource('https://www.glassdoor.com/interview')).toBe('Glassdoor');
    expect(extractSource('https://reddit.com/r/cscareerquestions')).toBe('Reddit');
    expect(extractSource('https://teamblind.com/post')).toBe('Blind');
    expect(extractSource('https://indeed.com/interview')).toBe('Indeed');
    expect(extractSource('https://leetcode.com/discuss')).toBe('LeetCode');
    expect(extractSource('https://example.com/page')).toBe('Web');
  });
});

describe('createInterviewSearchProvider', () => {
  it('should return mock provider by default', () => {
    const provider = createInterviewSearchProvider();
    expect(provider.name).toBe('Mock Interview Search Provider');
  });

  it('should return mock provider when google requested but not configured', () => {
    // Temporarily clear env vars
    const originalKey = process.env.GOOGLE_SEARCH_API_KEY;
    const originalCx = process.env.GOOGLE_SEARCH_CX;
    delete process.env.GOOGLE_SEARCH_API_KEY;
    delete process.env.GOOGLE_SEARCH_CX;

    const provider = createInterviewSearchProvider('google');
    expect(provider.name).toBe('Mock Interview Search Provider');

    // Restore
    if (originalKey) process.env.GOOGLE_SEARCH_API_KEY = originalKey;
    if (originalCx) process.env.GOOGLE_SEARCH_CX = originalCx;
  });

  it('should return mock provider when mock explicitly requested', () => {
    const provider = createInterviewSearchProvider('mock');
    expect(provider.name).toBe('Mock Interview Search Provider');
  });
});
