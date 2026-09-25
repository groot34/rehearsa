/**
 * Company URL normalisation utility.
 *
 * Users frequently paste scheme-less web addresses such as:
 *   google.com
 *   www.google.com
 *
 * These are valid web hostnames but are rejected by URL parsers (and Zod's
 * .url() validator) because they lack a scheme.  This module provides a
 * pure deterministic helper that prepends `https://` to scheme-less inputs
 * before further validation.
 *
 * Security note:
 *   Normalisation NEVER bypasses SSRF or URL-validity checks.  The normalised
 *   string must still pass through Zod's .url() validator and the SSRF guard
 *   (validateUrlSsrf) before any network request is made.  This helper only
 *   makes scheme detection unambiguous; it does not weaken any downstream gate.
 */

/** Simple regex: starts with a word-char (letter/digit/_) that is NOT
 *  followed by "://" — i.e. a bare hostname or path without a scheme. */
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//;

/**
 * Normalise a raw company URL string.
 *
 * Rules:
 *  1. If the input already has a recognised scheme (`http://` or `https://`)
 *     it is returned unchanged.
 *  2. If the input has any other scheme (e.g. `ftp://`, `file://`) it is
 *     returned unchanged so that downstream Zod / SSRF validation rejects it
 *     with the correct error.
 *  3. If the input has NO scheme at all, `https://` is prepended.
 *  4. Empty / whitespace-only inputs are returned as-is (Zod will reject them).
 *
 * @param raw  - The raw string from the user or batch input file.
 * @returns    The normalised URL string.
 */
export function normalizeCompanyUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  // Already has any scheme — preserve it and let downstream validation decide
  if (SCHEME_RE.test(trimmed)) {
    return trimmed;
  }

  // No scheme detected — prepend https://
  return `https://${trimmed}`;
}
