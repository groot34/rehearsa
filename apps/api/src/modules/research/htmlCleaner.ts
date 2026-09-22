import * as cheerio from 'cheerio';

export interface CleanHtmlResult {
  title: string;
  text: string;
  links: string[];
}

/**
 * Cleans HTML content, extracts readable body text, and discovers candidate internal links.
 */
export function cleanHtml(html: string, baseUrl: string): CleanHtmlResult {
  if (!html || typeof html !== 'string') {
    return { title: '', text: '', links: [] };
  }

  const $ = cheerio.load(html);

  // Extract page title
  const title = $('title').text().trim() || '';

  // Discover candidate links before removing DOM elements
  const linksSet = new Set<string>();
  let baseHostname = '';
  try {
    baseHostname = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    // Ignore invalid base URL
  }

  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href');
    if (!rawHref) return;

    try {
      const resolved = new URL(rawHref, baseUrl);
      // Filter out non-http protocols (mailto:, tel:, javascript:)
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        // Only collect internal domain links
        if (baseHostname && resolved.hostname.toLowerCase() === baseHostname) {
          // Strip fragment hash
          resolved.hash = '';
          linksSet.add(resolved.toString());
        }
      }
    } catch {
      // Ignore malformed hrefs
    }
  });

  // Remove non-content tags
  $('script, style, noscript, iframe, svg, nav, header, footer, form').remove();

  // Extract text body
  const bodyText = $('body').length ? $('body').text() : $.text();

  // Normalize whitespace: collapse multiple spaces and newlines
  const text = bodyText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  return {
    title,
    text,
    links: Array.from(linksSet),
  };
}
