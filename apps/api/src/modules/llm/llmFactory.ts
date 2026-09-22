import { ILlmProvider } from './ILlmProvider';
import { GeminiProvider } from './geminiProvider';
import { MockLlmProvider } from './mockProvider';

/**
 * Creates an instance of an LLM Provider based on environment configuration or explicit provider parameter.
 */
export function createLlmProvider(overrideProvider?: string): ILlmProvider {
  const providerName = (overrideProvider || process.env.LLM_PROVIDER || 'mock').toLowerCase();

  if (providerName === 'gemini' && process.env.GEMINI_API_KEY) {
    return new GeminiProvider();
  }

  // Fallback to MockLlmProvider for offline development, tests, or missing keys
  return new MockLlmProvider();
}
