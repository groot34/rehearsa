import { fetchPageSafely } from './safeFetcher';
import { cleanHtml } from './htmlCleaner';
import { isPathAllowedByRobots } from './robotsParser';

export interface CrawlOptions {
  maxPages?: number;
  timeoutMs?: number;
  allowLoopbackInDev?: boolean;
}

export interface ResearchResult {
  seed_url: string;
  company_name_from_url: string;
  pages_used: string[];
  extracted_text: string;
  sources: string[];
  partial_failure?: string;
}

const RELEVANCE_KEYWORDS = [
  'about',
  'career',
  'jobs',
  'hiring',
  'interview',
  'culture',
  'engineering',
  'team',
  'values',
  'technology',
  'product',
];

/**
 * Score a link URL by relevance to company research & hiring information.
 */
function scoreLinkRelevance(urlStr: string): number {
  const lower = urlStr.toLowerCase();
  let score = 0;
  for (const kw of RELEVANCE_KEYWORDS) {
    if (lower.includes(kw)) {
      score += 10;
    }
  }
  // Penalize deep query params or asset extensions
  if (lower.includes('?') || lower.includes('#')) score -= 2;
  if (/\.(pdf|png|jpg|zip|css|js)$/i.test(lower)) score -= 100;

  return score;
}

/**
 * Perform bounded, SSRF-safe crawling on a target company website.
 */
export async function crawlCompanySite(
  companyUrl: string,
  options?: CrawlOptions
): Promise<ResearchResult> {
  const maxPages = options?.maxPages ?? 5;
  const allowLoopback = options?.allowLoopbackInDev ?? false;

  let companyName = 'Company';
  try {
    const host = new URL(companyUrl).hostname.replace(/^www\./, '');
    companyName = host.split('.')[0] || 'Company';
    companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
  } catch {
    // Default name
  }

  // 1. Fetch Seed Page
  const seedFetch = await fetchPageSafely(companyUrl, { allowLoopbackInDev: allowLoopback });

  if (!seedFetch.success || !seedFetch.data) {
    return {
      seed_url: companyUrl,
      company_name_from_url: companyName,
      pages_used: [],
      extracted_text: `[Seed page unreachable: ${seedFetch.error || 'Connection failed'}]`,
      sources: [],
      partial_failure: seedFetch.error || 'Seed URL unreachable',
    };
  }

  const pagesUsed: string[] = [seedFetch.finalUrl];
  const sources: string[] = [seedFetch.finalUrl];
  const textSegments: string[] = [];

  const seedCleaned = cleanHtml(seedFetch.data, seedFetch.finalUrl);
  if (seedCleaned.text) {
    textSegments.push(`--- Page: ${seedFetch.finalUrl} (${seedCleaned.title || 'Home'}) ---\n${seedCleaned.text}`);
  }

  // 2. Discover and Rank Candidate Internal Links
  const candidateLinks = seedCleaned.links
    .filter((link) => link !== seedFetch.finalUrl)
    .map((link) => ({ url: link, score: scoreLinkRelevance(link) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // 3. Fetch up to maxPages - 1 candidate links
  const linksToCrawl = candidateLinks.slice(0, maxPages - 1);
  let partialFailure: string | undefined;

  for (const candidate of linksToCrawl) {
    // Check robots.txt
    const allowed = await isPathAllowedByRobots(companyUrl, candidate.url, { allowLoopbackInDev: allowLoopback });
    if (!allowed) {
      continue;
    }

    const pageFetch = await fetchPageSafely(candidate.url, { allowLoopbackInDev: allowLoopback, timeoutMs: 5000 });
    if (pageFetch.success && pageFetch.data) {
      const pageCleaned = cleanHtml(pageFetch.data, pageFetch.finalUrl);
      if (pageCleaned.text) {
        pagesUsed.push(pageFetch.finalUrl);
        sources.push(pageFetch.finalUrl);
        textSegments.push(`--- Page: ${pageFetch.finalUrl} (${pageCleaned.title || 'Page'}) ---\n${pageCleaned.text}`);
      }
    } else {
      partialFailure = `Some secondary pages failed to load: ${pageFetch.error}`;
    }
  }

  // Combined text capped at ~15,000 characters to prevent prompt bloat
  const combinedText = textSegments.join('\n\n').slice(0, 15000);

  return {
    seed_url: companyUrl,
    company_name_from_url: companyName,
    pages_used: pagesUsed,
    extracted_text: combinedText,
    sources,
    partial_failure: partialFailure,
  };
}
