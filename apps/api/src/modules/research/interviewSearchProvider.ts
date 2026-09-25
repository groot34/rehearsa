/**
 * Public Interview Discussion Search Provider Interface
 *
 * Abstracts external search for public interview discussions (Glassdoor, Blind, Reddit, etc.)
 * Implementations must mock gracefully for tests and degrade gracefully if unavailable.
 */

/**
 * Maximum characters allowed in a single public-interview search snippet before
 * it is truncated for LLM prompt injection. Title and URL are always preserved
 * verbatim; only the snippet body is truncated.
 */
export const MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS = 500;

/**
 * Hard maximum combined length of company-crawl extracted text plus concatenated
 * public-interview discussion text before it is sliced for the company-brief
 * Gemini prompt. Kept well above the observed legitimate worst-case (~19.6K)
 * while strictly preventing unbounded growth that can trigger 25s timeouts.
 */
export const MAX_COMBINED_RESEARCH_CHARS = 20000;

/**
 * Marker appended to a snippet body (after slicing) when it exceeds the per-result
 * cap, so the LLM can see the context was abbreviated rather than hallucinating
 * completeness.
 */
export const SNIPPET_TRUNCATION_MARKER = '... [truncated]';

export interface InterviewSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string; // e.g., 'Glassdoor', 'Reddit', 'Blind'
}

/**
 * Deterministically truncate a search result's `snippet` field to the given limit
 * while preserving `title`, `url`, and `source` verbatim.
 *
 * If the snippet fits within the cap it is returned unchanged (no marker).
 * If it exceeds the cap, the body is sliced and the truncation marker is appended
 * so downstream prompt consumers can distinguish partial context from full context.
 */
export function truncateResultSnippet(
  result: InterviewSearchResult,
  maxChars: number = MAX_PUBLIC_INTERVIEW_SNIPPET_CHARS
): InterviewSearchResult {
  const { title, url, source } = result;
  const snippet = result.snippet ?? '';
  if (snippet.length <= maxChars) {
    return { title, url, snippet, source };
  }
  const usable = Math.max(0, maxChars - SNIPPET_TRUNCATION_MARKER.length);
  const sliced = snippet.slice(0, usable);
  return {
    title,
    url,
    snippet: sliced + SNIPPET_TRUNCATION_MARKER,
    source,
  };
}

export interface IPublicInterviewSearchProvider {
  name: string;

  /**
   * Search for public interview discussions about a company/role.
   * Returns deduplicated search results. Does NOT fetch page content.
   * URLs returned here may be fetched separately via safeFetcher if needed.
   */
  searchInterviewDiscussions(
    companyName: string,
    role?: string
  ): Promise<InterviewSearchResult[]>;
}
