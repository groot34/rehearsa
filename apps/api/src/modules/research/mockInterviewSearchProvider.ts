import { IPublicInterviewSearchProvider, InterviewSearchResult } from './interviewSearchProvider';

/**
 * Mock provider for testing. Returns deterministic mock search results.
 * No external API calls. Used by default in tests and when credentials unavailable.
 */
export class MockPublicInterviewSearchProvider implements IPublicInterviewSearchProvider {
  public name = 'Mock Interview Search Provider';

  async searchInterviewDiscussions(
    companyName: string,
    _role?: string
  ): Promise<InterviewSearchResult[]> {
    // Return deterministic mock results for common companies
    const companyLower = companyName.toLowerCase();

    if (companyLower.includes('google') || companyLower.includes('alphabet')) {
      return [
        {
          title: 'Google Software Engineer Interview Questions',
          url: 'https://example.com/mock/google-interview-questions',
          snippet: 'Comprehensive list of Google interview questions for software engineers including system design and coding rounds.',
          source: 'MockSource',
        },
        {
          title: 'My Google Interview Experience - Blind',
          url: 'https://example.com/mock/google-blind-experience',
          snippet: 'Shared my interview journey at Google, covering 5 onsite rounds and recruiter expectations.',
          source: 'MockSource',
        },
      ];
    }

    if (companyLower.includes('amazon')) {
      return [
        {
          title: 'Amazon Leadership Principles Interview Questions',
          url: 'https://example.com/mock/amazon-lp-questions',
          snippet: 'Behavioral interview questions aligned with Amazon Leadership Principles with STAR method examples.',
          source: 'MockSource',
        },
      ];
    }

    // Generic mock results for any company
    return [
      {
        title: `${companyName} Interview Process Overview`,
        url: `https://example.com/mock/${companyLower}-interview-process`,
        snippet: `Detailed breakdown of the interview process at ${companyName}, including technical rounds and behavioral expectations.`,
        source: 'MockSource',
      },
      {
        title: `${companyName} Software Engineer Interview Questions`,
        url: `https://example.com/mock/${companyLower}-technical-questions`,
        snippet: `Collection of technical interview questions asked at ${companyName}, covering algorithms, data structures, and system design.`,
        source: 'MockSource',
      },
    ];
  }
}
