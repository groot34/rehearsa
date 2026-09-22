import { fetchPageSafely } from './safeFetcher';

/**
 * Checks if a specific target path is allowed by the site's /robots.txt disallow rules.
 */
export async function isPathAllowedByRobots(
  baseUrl: string,
  targetUrl: string,
  options?: { allowLoopbackInDev?: boolean }
): Promise<boolean> {
  try {
    const origin = new URL(baseUrl).origin;
    const robotsUrl = `${origin}/robots.txt`;

    const fetchRes = await fetchPageSafely(robotsUrl, {
      timeoutMs: 5000,
      maxBodySizeBytes: 1024 * 100, // 100KB max for robots.txt
      allowLoopbackInDev: options?.allowLoopbackInDev,
    });

    if (!fetchRes.success || !fetchRes.data) {
      // If robots.txt is 404 or unavailable, default to allowed
      return true;
    }

    const targetPath = new URL(targetUrl).pathname;
    const lines = fetchRes.data.split('\n');
    let appliesToBot = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('#') || !line) continue;

      const [key, val] = line.split(':').map((s) => s.trim());
      if (!key || !val) continue;

      if (key.toLowerCase() === 'user-agent') {
        appliesToBot = val === '*' || val.toLowerCase().includes('rehearsabot');
      } else if (appliesToBot && key.toLowerCase() === 'disallow') {
        if (val === '/') return false;
        if (val && targetPath.startsWith(val)) {
          return false;
        }
      }
    }

    return true;
  } catch {
    return true; // Fallback to allowed on error
  }
}
