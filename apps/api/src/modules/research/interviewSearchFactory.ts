import { IPublicInterviewSearchProvider } from './interviewSearchProvider';
import { MockPublicInterviewSearchProvider } from './mockInterviewSearchProvider';
import { GoogleCustomSearchProvider } from './googleCustomSearchProvider';
import { TavilySearchProvider } from './tavilySearchProvider';

/**
 * Creates an interview search provider based on environment configuration.
 * Returns Mock provider by default if no credentials are configured.
 */
export function createInterviewSearchProvider(
  overrideProvider?: string
): IPublicInterviewSearchProvider {
  const providerName = (overrideProvider || process.env.INTERVIEW_SEARCH_PROVIDER || 'mock').toLowerCase();

  if (providerName === 'tavily') {
    const tavilyProvider = new TavilySearchProvider();
    if (tavilyProvider.isConfigured()) {
      return tavilyProvider;
    }
    // Fall back to mock if Tavily credentials missing
    console.warn('[InterviewSearch] Tavily Search requested but credentials not configured. Using mock provider.');
  }

  if (providerName === 'google') {
    const googleProvider = new GoogleCustomSearchProvider();
    if (googleProvider.isConfigured()) {
      return googleProvider;
    }
    // Fall back to mock if Google credentials missing
    console.warn('[InterviewSearch] Google Custom Search requested but credentials not configured. Using mock provider.');
  }

  // Default to mock provider
  return new MockPublicInterviewSearchProvider();
}

