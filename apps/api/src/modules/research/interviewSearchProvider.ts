/**
 * Public Interview Discussion Search Provider Interface
 * 
 * Abstracts external search for public interview discussions (Glassdoor, Blind, Reddit, etc.)
 * Implementations must mock gracefully for tests and degrade gracefully if unavailable.
 */

export interface InterviewSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string; // e.g., 'Glassdoor', 'Reddit', 'Blind'
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
