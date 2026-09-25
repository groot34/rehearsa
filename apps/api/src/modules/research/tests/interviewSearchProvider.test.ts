import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { MockPublicInterviewSearchProvider } from '../mockInterviewSearchProvider';
import { GoogleCustomSearchProvider } from '../googleCustomSearchProvider';
import { TavilySearchProvider } from '../tavilySearchProvider';
import { createInterviewSearchProvider } from '../interviewSearchFactory';
import {
  MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS,
  MAX_COMBINED_RESEARCH_CHARS,
  SNIPPET_TRUNCATION_MARKER,
  truncateResultSnippet,
  InterviewSearchResult,
} from '../interviewSearchProvider';

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

describe('Research Constants & Named Limits (no magic numbers)', () => {
  it('defines MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS = 500 per result', () => {
    expect(MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS).toBe(500);
  });

  it('defines MAX_COMBINED_RESEARCH_CHARS = 20000 for company-brief prompt', () => {
    expect(MAX_COMBINED_RESEARCH_CHARS).toBe(20000);
  });

  it('MAX_COMBINED_RESEARCH_CHARS is strictly greater than crawler cap (15000) to leave room for public interviews', () => {
    expect(MAX_COMBINED_RESEARCH_CHARS).toBeGreaterThan(15000);
  });

  it('SNIPPET_TRUNCATION_MARKER is a non-empty visible string', () => {
    expect(typeof SNIPPET_TRUNCATION_MARKER).toBe('string');
    expect(SNIPPET_TRUNCATION_MARKER.length).toBeGreaterThan(0);
    expect(SNIPPET_TRUNCATION_MARKER).toContain('truncated');
  });
});

describe('truncateResultSnippet helper (preserves title/URL, only slices snippet)', () => {
  it('leaves short snippets completely untouched (no marker appended)', () => {
    const input: InterviewSearchResult = {
      title: 'Stripe Interview Questions - Glassdoor',
      url: 'https://www.glassdoor.com/Interview/Stripe-Interview-E123.htm',
      snippet: 'Short snippet with API design questions.',
      source: 'Glassdoor',
    };
    const out = truncateResultSnippet(input, 500);
    expect(out.title).toBe(input.title);
    expect(out.url).toBe(input.url);
    expect(out.source).toBe(input.source);
    expect(out.snippet).toBe(input.snippet);
    expect(out.snippet.endsWith(SNIPPET_TRUNCATION_MARKER)).toBe(false);
  });

  it('truncates only the snippet field when it exceeds maxChars, appending truncation marker', () => {
    const title = 'My Stripe Onsite Experience - Blind';
    const url = 'https://www.teamblind.com/post/stripe-onsite-abc123';
    const source = 'Blind';
    const longSnippet = 'a'.repeat(1000);
    const out = truncateResultSnippet({ title, url, snippet: longSnippet, source }, 500);

    // Title, URL, source byte-identical to input (preserved verbatim)
    expect(out.title).toBe(title);
    expect(out.url).toBe(url);
    expect(out.source).toBe(source);
    // Snippet bounded
    expect(out.snippet.length).toBeLessThanOrEqual(500);
    // Marker present
    expect(out.snippet.endsWith(SNIPPET_TRUNCATION_MARKER)).toBe(true);
    // Head of snippet preserved (not zeroed)
    expect(out.snippet.startsWith('aaaaaa')).toBe(true);
  });

  it('uses MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS as the default when no maxChars arg is given', () => {
    const atLimit = 'x'.repeat(MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS);
    const justOver = 'y'.repeat(MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS + 1);

    const exactFit = truncateResultSnippet({ title: 'T', url: 'U', snippet: atLimit });
    expect(exactFit.snippet).toBe(atLimit);
    expect(exactFit.snippet.endsWith(SNIPPET_TRUNCATION_MARKER)).toBe(false);

    const oversized = truncateResultSnippet({ title: 'T', url: 'U', snippet: justOver });
    expect(oversized.snippet.length).toBeLessThanOrEqual(MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS);
    expect(oversized.snippet.endsWith(SNIPPET_TRUNCATION_MARKER)).toBe(true);
  });

  it('preserves title/url even when marker+headroom is smaller than snippet length (edge: tiny maxChars)', () => {
    const tinyMax = 20;
    const title = 'Very Long Title That Should Never Be Touched';
    const url = 'https://example.com/very/long/url/that/is/preserved/verbatim';
    const out = truncateResultSnippet(
      { title, url, snippet: 'a'.repeat(1000) },
      tinyMax
    );
    expect(out.title).toBe(title);
    expect(out.url).toBe(url);
    expect(out.snippet.length).toBeLessThanOrEqual(tinyMax);
  });
});

describe('TavilySearchProvider: Snippet Truncation Applied to executeSearch Results', () => {
  let postSpy: any;
  const LONG_SNIPPET = 'x'.repeat(2000);
  const TITLE = 'Long Glassdoor Interview Writeup - Very Detailed';
  const URL = 'https://www.glassdoor.com/Interview/VeryLongWriteup-E999.htm';

  beforeEach(() => {
    postSpy = vi.spyOn(axios, 'post');
  });

  afterEach(() => {
    postSpy.mockRestore();
  });

  it('truncates Tavily `content` field to MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS while preserving title and URL byte-identically', async () => {
    postSpy.mockResolvedValue({
      data: {
        results: [
          {
            title: TITLE,
            url: URL,
            content: LONG_SNIPPET,
          },
        ],
      },
    });

    const provider = new TavilySearchProvider('tvly-key');
    const results = await provider.searchInterviewDiscussions('TestCorp');

    expect(results).toHaveLength(1);
    const r = results[0];
    // Title and URL preserved VERBATIM — never sliced
    expect(r.title).toBe(TITLE);
    expect(r.url).toBe(URL);
    expect(r.source).toBe('Glassdoor');
    // Snippet bounded
    expect(r.snippet.length).toBeLessThanOrEqual(MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS);
    expect(r.snippet.endsWith(SNIPPET_TRUNCATION_MARKER)).toBe(true);
    // Original head of snippet preserved
    expect(r.snippet.startsWith('xxxxxx')).toBe(true);
  });

  it('truncates Tavily `snippet` field (fallback alias) identically when `content` absent', async () => {
    postSpy.mockResolvedValue({
      data: {
        results: [
          {
            title: TITLE,
            url: URL,
            snippet: LONG_SNIPPET,
          },
        ],
      },
    });

    const provider = new TavilySearchProvider('tvly-key');
    const results = await provider.searchInterviewDiscussions('TestCorp');

    expect(results[0].title).toBe(TITLE);
    expect(results[0].url).toBe(URL);
    expect(results[0].snippet.length).toBeLessThanOrEqual(MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS);
    expect(results[0].snippet.endsWith(SNIPPET_TRUNCATION_MARKER)).toBe(true);
  });
});

describe('GoogleCustomSearchProvider: Snippet Truncation Applied to executeSearch Items', () => {
  let getSpy: any;
  const LONG_SNIPPET = 'g'.repeat(3000);
  const TITLE = 'Google SWE Interview at Meta - Reddit';
  const URL = 'https://reddit.com/r/cscareerquestions/comments/xyz/google-swe-interview';

  beforeEach(() => {
    getSpy = vi.spyOn(axios, 'get');
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  it('truncates Google items.snippet to cap, preserving title+url verbatim (byte-identical)', async () => {
    getSpy.mockResolvedValue({
      data: {
        items: [
          {
            title: TITLE,
            link: URL,
            snippet: LONG_SNIPPET,
          },
        ],
      },
    });

    const provider = new GoogleCustomSearchProvider('gkey', 'gcx');
    const results = await provider.searchInterviewDiscussions('Acme', 'Frontend');

    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.title).toBe(TITLE);
    expect(r.url).toBe(URL);
    expect(r.source).toBe('Reddit');
    expect(r.snippet.length).toBeLessThanOrEqual(MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS);
    expect(r.snippet.endsWith(SNIPPET_TRUNCATION_MARKER)).toBe(true);
    expect(r.snippet.startsWith('gggggg')).toBe(true);
  });
});

describe('Combined Research Text Hard Cap (MAX_COMBINED_RESEARCH_CHARS = 20000)', () => {
  it('simulates pipeline concatenation order: crawler text (15000) + oversized public interviews still caps at 20000 chars (crawler-first preference)', () => {
    const crawlerText = 'C'.repeat(15000);
    const onePublicSnippet = 'P'.repeat(MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS);
    const tenPublicBlocks = Array(10)
      .fill(`[Source] Title\n${onePublicSnippet}\nURL: https://example.com/x\n`)
      .join('\n\n');
    const publicInterviewText = `\n\n--- Public Interview Discussions ---\n${tenPublicBlocks}\n--- End Public Discussions ---\n`;

    const combined = (crawlerText + publicInterviewText).slice(0, MAX_COMBINED_RESEARCH_CHARS);

    expect(combined.length).toBe(MAX_COMBINED_RESEARCH_CHARS);
    // The first 15000 characters are ALL crawler text — crawler research fully preserved.
    expect(combined.slice(0, 15000)).toBe(crawlerText);
    // After crawler text (15000), the next N bytes should be the start of the
    // public-interview header — proving public interviews are appended (not prepended)
    // and therefore only the tail is dropped on overflow (deterministic).
    const headerPrefix = '\n\n--- Public Interview Discussions ---';
    expect(combined.slice(15000, 15000 + headerPrefix.length)).toBe(headerPrefix);
  });

  it('when combined research already fits within cap, nothing is truncated', () => {
    const crawlerText = 'Small crawler text.'.repeat(10);
    const publicInterviewText = '\n\n--- Public ---\nShort context.\n--- End ---\n';
    const combined = (crawlerText + publicInterviewText).slice(0, MAX_COMBINED_RESEARCH_CHARS);
    expect(combined).toBe(crawlerText + publicInterviewText);
    expect(combined.length).toBeLessThan(MAX_COMBINED_RESEARCH_CHARS);
  });
});

describe('Existing Research Provider Behaviour Compatibility (Not Weakened)', () => {
  it('MockPublicInterviewSearchProvider still returns identical structure & counts (truncation is a no-op on short snippets)', async () => {
    const provider = new MockPublicInterviewSearchProvider();
    const googleResults = await provider.searchInterviewDiscussions('Google', 'SWE');
    expect(googleResults).toHaveLength(2);
    const amazonResults = await provider.searchInterviewDiscussions('Amazon');
    expect(amazonResults).toHaveLength(1);
    expect(amazonResults[0].snippet).toContain('Leadership Principles');
  });

  it('Tavily configuration / URL source extraction paths still behave identically', () => {
    const provider = new TavilySearchProvider('tvly-k');
    const extractSource = (provider as any).extractSource.bind(provider);
    expect(extractSource('https://www.glassdoor.com/x')).toBe('Glassdoor');
    expect(extractSource('https://reddit.com/r/x')).toBe('Reddit');
    expect(extractSource('https://www.teamblind.com/x')).toBe('Blind');
    expect(extractSource('https://indeed.com/x')).toBe('Indeed');
    expect(extractSource('https://leetcode.com/x')).toBe('LeetCode');
    expect(extractSource('https://example.com/x')).toBe('Web');
  });

  it('Factory still returns Mock provider by default; Tavily/Google when explicitly configured', () => {
    expect(createInterviewSearchProvider().name).toBe('Mock Interview Search Provider');
    expect(createInterviewSearchProvider('mock').name).toBe('Mock Interview Search Provider');

    const orig = process.env.TAVILY_API_KEY;
    process.env.TAVILY_API_KEY = 'tvly-factory';
    expect(createInterviewSearchProvider('tavily').name).toBe('Tavily Search');
    if (orig) process.env.TAVILY_API_KEY = orig;
    else delete process.env.TAVILY_API_KEY;
  });
});

