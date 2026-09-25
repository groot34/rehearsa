import axios from 'axios';
import {
  IPublicInterviewSearchProvider,
  InterviewSearchResult,
  truncateResultSnippet,
} from './interviewSearchProvider';

/**
 * Google Custom Search API provider for public interview discussion search.
 * Requires GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX environment variables.
 * Falls back gracefully if credentials are not configured.
 */
export class GoogleCustomSearchProvider implements IPublicInterviewSearchProvider {
  public name = 'Google Custom Search';
  private apiKey: string;
  private cx: string; // Custom Search Engine ID

  constructor(apiKey?: string, cx?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_SEARCH_API_KEY || '';
    this.cx = cx || process.env.GOOGLE_SEARCH_CX || '';
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.cx);
  }

  async searchInterviewDiscussions(
    companyName: string,
    role?: string
  ): Promise<InterviewSearchResult[]> {
    if (!this.isConfigured()) {
      throw new Error('Google Custom Search not configured. Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX in .env');
    }

    // Build focused search queries
    const queries = [
      `${companyName} interview questions`,
      `${companyName} interview experience`,
      `${companyName} hiring process`,
    ];

    if (role) {
      queries.push(`${companyName} ${role} interview`);
    }

    const allResults: InterviewSearchResult[] = [];
    const seenUrls = new Set<string>();

    // Execute queries in parallel (limit to 3 concurrent to respect rate limits)
    for (const query of queries) {
      try {
        const results = await this.executeSearch(query);
        for (const result of results) {
          if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            allResults.push(result);
          }
        }
      } catch (err) {
        // Log but continue with other queries
        console.warn(`[GoogleSearch] Query failed: ${query}`, err instanceof Error ? err.message : String(err));
      }
    }

    // Return up to 10 most relevant results
    return allResults.slice(0, 10);
  }

  private async executeSearch(query: string): Promise<InterviewSearchResult[]> {
    const url = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      key: this.apiKey,
      cx: this.cx,
      q: query,
      num: 5, // Limit results per query
    };

    const res = await axios.get(url, { params, timeout: 10000 });

    const items = res.data?.items || [];
    return items.map((item: any) => {
      const raw: InterviewSearchResult = {
        title: item.title || '',
        url: item.link || '',
        snippet: item.snippet || '',
        source: this.extractSource(item.link),
      };
      return truncateResultSnippet(raw);
    });
  }

  private extractSource(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes('glassdoor')) return 'Glassdoor';
    if (lower.includes('reddit')) return 'Reddit';
    if (lower.includes('blind')) return 'Blind';
    if (lower.includes('indeed')) return 'Indeed';
    if (lower.includes('leetcode')) return 'LeetCode';
    return 'Web';
  }
}
