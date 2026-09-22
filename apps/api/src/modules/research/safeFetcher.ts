import axios, { AxiosRequestConfig } from 'axios';
import http from 'http';
import https from 'https';
import { validateUrlSsrf, createSsrfLookup } from './ssrfGuard';

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBodySizeBytes?: number;
  maxRedirects?: number;
  allowLoopbackInDev?: boolean;
  userAgent?: string;
}

export interface SafeFetchResult {
  success: boolean;
  finalUrl: string;
  statusCode?: number;
  contentType?: string;
  data?: string;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_BODY_BYTES = 2097152; // 2MB
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_USER_AGENT = 'RehearsaBot/1.0 (+https://rehearsa.example.com)';

/**
 * Safely fetches a web page while enforcing strict SSRF protections, payload size limits, and redirect validation.
 */
export async function fetchPageSafely(
  targetUrl: string,
  options?: SafeFetchOptions
): Promise<SafeFetchResult> {
  const timeout = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options?.maxBodySizeBytes ?? DEFAULT_MAX_BODY_BYTES;
  const maxRedirects = options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const allowLoopback = options?.allowLoopbackInDev ?? false;
  const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;

  // Custom agents to enforce DNS lookup validation at socket connection time (DNS Rebinding protection)
  const ssrfLookup = createSsrfLookup(allowLoopback);
  const httpAgent = new http.Agent({ lookup: ssrfLookup as any });
  const httpsAgent = new https.Agent({ lookup: ssrfLookup as any });

  let currentUrl = targetUrl;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    // 1. SSRF Check before attempting connection
    const ssrfCheck = await validateUrlSsrf(currentUrl, { allowLoopbackInDev: allowLoopback });
    if (!ssrfCheck.safe) {
      return {
        success: false,
        finalUrl: currentUrl,
        error: `SSRF Blocked: ${ssrfCheck.reason}`,
      };
    }

    try {
      const config: AxiosRequestConfig = {
        url: currentUrl,
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
        },
        timeout,
        maxRedirects: 0, // Handle redirects manually to validate destination IPs!
        validateStatus: (status) => status >= 200 && status < 400,
        responseType: 'text',
        maxContentLength: maxBytes,
        httpAgent,
        httpsAgent,
      };

      const response = await axios(config);

      // Check for Redirect (301, 302, 307, 308)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers['location'];
        if (!location) {
          return {
            success: false,
            finalUrl: currentUrl,
            statusCode: response.status,
            error: 'Redirect response missing Location header',
          };
        }

        redirectCount++;
        if (redirectCount > maxRedirects) {
          return {
            success: false,
            finalUrl: currentUrl,
            statusCode: response.status,
            error: `Exceeded maximum allowed redirects (${maxRedirects})`,
          };
        }

        // Resolve relative redirect URL
        currentUrl = new URL(location, currentUrl).toString();
        continue; // Loop to validate new redirect URL with ssrfCheck
      }

      // Check Content-Type header
      const contentType = (String(response.headers['content-type'] || '')).toLowerCase();
      if (
        contentType &&
        !contentType.includes('text/html') &&
        !contentType.includes('application/xhtml+xml') &&
        !contentType.includes('text/plain')
      ) {
        return {
          success: false,
          finalUrl: currentUrl,
          statusCode: response.status,
          contentType,
          error: `Disallowed Content-Type: ${contentType}. Expected HTML or text.`,
        };
      }

      const bodyData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      if (Buffer.byteLength(bodyData, 'utf-8') > maxBytes) {
        return {
          success: false,
          finalUrl: currentUrl,
          statusCode: response.status,
          contentType,
          error: `Response size exceeds limit of ${maxBytes} bytes`,
        };
      }

      return {
        success: true,
        finalUrl: currentUrl,
        statusCode: response.status,
        contentType,
        data: bodyData,
      };
    } catch (err: any) {
      return {
        success: false,
        finalUrl: currentUrl,
        statusCode: err.response?.status,
        error: err.message || 'HTTP request failed',
      };
    }
  }

  return {
    success: false,
    finalUrl: currentUrl,
    error: 'Too many redirects',
  };
}
