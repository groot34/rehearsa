import { IPublicInterviewSearchProvider } from './interviewSearchProvider';
import { MockPublicInterviewSearchProvider } from './mockInterviewSearchProvider';
import { GoogleCustomSearchProvider } from './googleCustomSearchProvider';

/**
 * Creates an interview search provider based on environment configuration.
 * Returns Mock provider by default if no credentials are configured.
 */
export function createInterviewSearchProvider(
  overrideProvider?: string
): IPublicInterviewSearchProvider {
  const providerName = (overrideProvider || process.env.INTERVIEW_SEARCH_PROVIDER || 'mock').toLowerCase();

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
