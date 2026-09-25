import axios from 'axios';
import { IPublicInterviewSearchProvider, InterviewSearchResult } from './interviewSearchProvider';

/**
 * Tavily Search API provider for public interview discussion search.
 * Requires TAVILY_API_KEY environment variable.
 * Falls back gracefully if credentials are not configured or requests fail.
 */
export class TavilySearchProvider implements IPublicInterviewSearchProvider {
  public name = 'Tavily Search';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async searchInterviewDiscussions(
    companyName: string,
    role?: string
  ): Promise<InterviewSearchResult[]> {
    if (!this.isConfigured()) {
      throw new Error('Tavily Search not configured. Set TAVILY_API_KEY in .env');
    }

    // Build bounded search queries
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

    // Execute queries (respect rate limits with per-query error isolation)
    for (const query of queries) {
      try {
        const results = await this.executeSearch(query);
        for (const result of results) {
          if (result.url && !seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            allResults.push(result);
          }
        }
      } catch (err) {
        // Log query failure and continue with other queries
        console.warn(`[TavilySearch] Query failed: ${query}`, err instanceof Error ? err.message : String(err));
      }
    }

    // Return up to 10 most relevant results
    return allResults.slice(0, 10);
  }

  private async executeSearch(query: string): Promise<InterviewSearchResult[]> {
    const url = 'https://api.tavily.com/search';
    const payload = {
      api_key: this.apiKey,
      query,
      search_depth: 'basic',
      include_answer: false,
      include_images: false,
      include_raw_content: false,
      max_results: 5,
    };

    const res = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const items = res.data?.results || [];
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({
        title: String(item.title || ''),
        url: String(item.url || ''),
        snippet: String(item.content || item.snippet || ''),
        source: this.extractSource(String(item.url || '')),
      }));
  }

  private extractSource(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes('glassdoor')) return 'Glassdoor';
    if (lower.includes('reddit')) return 'Reddit';
    if (lower.includes('blind') || lower.includes('teamblind')) return 'Blind';
    if (lower.includes('indeed')) return 'Indeed';
    if (lower.includes('leetcode')) return 'LeetCode';
    return 'Web';
  }
}
