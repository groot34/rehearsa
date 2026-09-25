import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { MockPublicInterviewSearchProvider } from '../mockInterviewSearchProvider';
import { GoogleCustomSearchProvider } from '../googleCustomSearchProvider';
import { TavilySearchProvider } from '../tavilySearchProvider';
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

describe('TavilySearchProvider', () => {
  let postSpy: any;

  beforeEach(() => {
    postSpy = vi.spyOn(axios, 'post');
  });

  afterEach(() => {
    postSpy.mockRestore();
  });

  it('should report not configured when API key is missing', () => {
    const original = process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_API_KEY;

    const provider = new TavilySearchProvider();
    expect(provider.isConfigured()).toBe(false);

    if (original) process.env.TAVILY_API_KEY = original;
  });

  it('should report configured when API key provided in constructor or env', () => {
    const providerFromParam = new TavilySearchProvider('tvly-test-key-123');
    expect(providerFromParam.isConfigured()).toBe(true);

    const original = process.env.TAVILY_API_KEY;
    process.env.TAVILY_API_KEY = 'tvly-test-env-key';
    const providerFromEnv = new TavilySearchProvider();
    expect(providerFromEnv.isConfigured()).toBe(true);

    if (original) process.env.TAVILY_API_KEY = original;
    else delete process.env.TAVILY_API_KEY;
  });

  it('should throw error when searching without configuration', async () => {
    const original = process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_API_KEY;

    const provider = new TavilySearchProvider('');
    await expect(provider.searchInterviewDiscussions('Acme Corp')).rejects.toThrow('Tavily Search not configured');

    if (original) process.env.TAVILY_API_KEY = original;
  });

  it('should extract source from various interview platform URLs', () => {
    const provider = new TavilySearchProvider('tvly-test-key');
    const extractSource = (provider as any).extractSource.bind(provider);

    expect(extractSource('https://www.glassdoor.com/Interview/Stripe-Questions-E123.htm')).toBe('Glassdoor');
    expect(extractSource('https://www.reddit.com/r/cscareerquestions/comments/xyz')).toBe('Reddit');
    expect(extractSource('https://www.teamblind.com/post/stripe-interview-tips-123')).toBe('Blind');
    expect(extractSource('https://www.indeed.com/cmp/Stripe/interviews')).toBe('Indeed');
    expect(extractSource('https://leetcode.com/discuss/interview-question/123456')).toBe('LeetCode');
    expect(extractSource('https://techblog.com/my-experience')).toBe('Web');
  });

  it('should parse successful Tavily response and return structured results', async () => {
    postSpy.mockResolvedValue({
      data: {
        query: 'Stripe interview questions',
        results: [
          {
            title: 'Stripe Software Engineer Interview Questions - Glassdoor',
            url: 'https://www.glassdoor.com/Interview/Stripe-Software-Engineer-Interview-Questions-E671461.htm',
            content: 'Questions on API design, concurrency, and architecture for Stripe backend roles.',
            score: 0.95,
          },
          {
            title: 'My Stripe Onsite Experience - Blind',
            url: 'https://www.teamblind.com/post/stripe-onsite-experience',
            snippet: 'Breakdown of the 5 interview rounds: coding, system design, bug squash, integration, culture.',
            score: 0.88,
          },
        ],
      },
    });

    const provider = new TavilySearchProvider('tvly-test-key');
    const results = await provider.searchInterviewDiscussions('Stripe', 'Backend Engineer');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toEqual({
      title: 'Stripe Software Engineer Interview Questions - Glassdoor',
      url: 'https://www.glassdoor.com/Interview/Stripe-Software-Engineer-Interview-Questions-E671461.htm',
      snippet: 'Questions on API design, concurrency, and architecture for Stripe backend roles.',
      source: 'Glassdoor',
    });
    expect(results[1]).toEqual({
      title: 'My Stripe Onsite Experience - Blind',
      url: 'https://www.teamblind.com/post/stripe-onsite-experience',
      snippet: 'Breakdown of the 5 interview rounds: coding, system design, bug squash, integration, culture.',
      source: 'Blind',
    });

    // Check payload sent to official Tavily Search API endpoint
    expect(postSpy).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        api_key: 'tvly-test-key',
        search_depth: 'basic',
        include_answer: false,
        max_results: 5,
      }),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      })
    );
  });

  it('should deduplicate results across queries by URL', async () => {
    postSpy.mockResolvedValue({
      data: {
        results: [
          {
            title: 'Duplicate Page',
            url: 'https://example.com/same-url',
            content: 'Content 1',
          },
        ],
      },
    });

    const provider = new TavilySearchProvider('tvly-test-key');
    const results = await provider.searchInterviewDiscussions('Acme', 'Staff Engineer');

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com/same-url');
  });

  it('should handle empty results gracefully without throwing', async () => {
    postSpy.mockResolvedValue({
      data: {
        results: [],
      },
    });

    const provider = new TavilySearchProvider('tvly-test-key');
    const results = await provider.searchInterviewDiscussions('NonExistentCorp');

    expect(results).toEqual([]);
  });

  it('should handle malformed or non-array responses gracefully', async () => {
    postSpy.mockResolvedValueOnce({
      data: null,
    }).mockResolvedValueOnce({
      data: { results: 'invalid string' },
    }).mockResolvedValueOnce({
      data: { results: [null, { title: 'Valid', url: 'https://example.com/valid', content: 'Snippet' }] },
    });

    const provider = new TavilySearchProvider('tvly-test-key');
    const results = await provider.searchInterviewDiscussions('AcmeCorp');

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Valid');
    expect(results[0].url).toBe('https://example.com/valid');
  });

  it('should isolate HTTP errors and continue with other queries', async () => {
    postSpy
      .mockRejectedValueOnce(new Error('Request failed with status code 401'))
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              title: 'Fallback Result',
              url: 'https://reddit.com/r/cscareerquestions/post1',
              content: 'Helpful interview context',
            },
          ],
        },
      });

    const provider = new TavilySearchProvider('tvly-test-key');
    const results = await provider.searchInterviewDiscussions('TechCorp');

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Fallback Result');
  });

  it('should isolate timeout/network failures and return empty list if all fail', async () => {
    postSpy.mockRejectedValue(new Error('connect ETIMEDOUT'));

    const provider = new TavilySearchProvider('tvly-test-key');
    const results = await provider.searchInterviewDiscussions('SlowCorp');

    expect(results).toEqual([]);
  });
});

describe('createInterviewSearchProvider', () => {
  it('should return mock provider by default', () => {
    const provider = createInterviewSearchProvider();
    expect(provider.name).toBe('Mock Interview Search Provider');
  });

  it('should return Tavily provider when tavily requested and configured', () => {
    const originalKey = process.env.TAVILY_API_KEY;
    process.env.TAVILY_API_KEY = 'tvly-factory-test-key';

    const provider = createInterviewSearchProvider('tavily');
    expect(provider.name).toBe('Tavily Search');

    if (originalKey) process.env.TAVILY_API_KEY = originalKey;
    else delete process.env.TAVILY_API_KEY;
  });

  it('should return mock provider when tavily requested but not configured', () => {
    const originalKey = process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_API_KEY;

    const provider = createInterviewSearchProvider('tavily');
    expect(provider.name).toBe('Mock Interview Search Provider');

    if (originalKey) process.env.TAVILY_API_KEY = originalKey;
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

  it('should return Google provider when google requested and configured', () => {
    const originalKey = process.env.GOOGLE_SEARCH_API_KEY;
    const originalCx = process.env.GOOGLE_SEARCH_CX;
    process.env.GOOGLE_SEARCH_API_KEY = 'test-key';
    process.env.GOOGLE_SEARCH_CX = 'test-cx';

    const provider = createInterviewSearchProvider('google');
    expect(provider.name).toBe('Google Custom Search');

    if (originalKey) process.env.GOOGLE_SEARCH_API_KEY = originalKey;
    else delete process.env.GOOGLE_SEARCH_API_KEY;
    if (originalCx) process.env.GOOGLE_SEARCH_CX = originalCx;
    else delete process.env.GOOGLE_SEARCH_CX;
  });

  it('should return mock provider when mock explicitly requested', () => {
    const provider = createInterviewSearchProvider('mock');
    expect(provider.name).toBe('Mock Interview Search Provider');
  });
});

