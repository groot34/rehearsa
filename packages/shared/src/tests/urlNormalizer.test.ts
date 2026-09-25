import { describe, it, expect } from 'vitest';
import { normalizeCompanyUrl } from '../utils/urlNormalizer';

describe('normalizeCompanyUrl', () => {
  // -------------------------------------------------------------------------
  // Scheme-less inputs — should gain https://
  // -------------------------------------------------------------------------
  it('prepends https:// to a bare domain', () => {
    expect(normalizeCompanyUrl('google.com')).toBe('https://google.com');
  });

  it('prepends https:// to a www domain', () => {
    expect(normalizeCompanyUrl('www.google.com')).toBe('https://www.google.com');
  });

  it('prepends https:// to a subdomain path', () => {
    expect(normalizeCompanyUrl('careers.example.com/jobs')).toBe('https://careers.example.com/jobs');
  });

  it('trims surrounding whitespace then prepends https://', () => {
    expect(normalizeCompanyUrl('  example.com  ')).toBe('https://example.com');
  });

  // -------------------------------------------------------------------------
  // Explicit https:// — must be preserved unchanged
  // -------------------------------------------------------------------------
  it('preserves an https:// URL unchanged', () => {
    expect(normalizeCompanyUrl('https://google.com')).toBe('https://google.com');
  });

  it('preserves an https:// URL with path unchanged', () => {
    expect(normalizeCompanyUrl('https://example.com/about')).toBe('https://example.com/about');
  });

  // -------------------------------------------------------------------------
  // Explicit http:// — must be preserved unchanged (validation rejects later)
  // -------------------------------------------------------------------------
  it('preserves an http:// URL unchanged', () => {
    expect(normalizeCompanyUrl('http://google.com')).toBe('http://google.com');
  });

  it('preserves an http:// URL with port unchanged', () => {
    expect(normalizeCompanyUrl('http://example.com:8080')).toBe('http://example.com:8080');
  });

  // -------------------------------------------------------------------------
  // Other schemes — must be preserved unchanged (downstream validation rejects)
  // -------------------------------------------------------------------------
  it('preserves ftp:// unchanged so downstream validation rejects it', () => {
    expect(normalizeCompanyUrl('ftp://example.com')).toBe('ftp://example.com');
  });

  it('preserves file:// unchanged so downstream validation rejects it', () => {
    expect(normalizeCompanyUrl('file:///etc/passwd')).toBe('file:///etc/passwd');
  });

  // -------------------------------------------------------------------------
  // Edge / empty inputs
  // -------------------------------------------------------------------------
  it('returns an empty string unchanged', () => {
    expect(normalizeCompanyUrl('')).toBe('');
  });

  it('returns a whitespace-only string as empty after trim', () => {
    // trim turns it to '' which has no scheme, so it would become 'https://'
    // but we return the trimmed empty string without prepending
    expect(normalizeCompanyUrl('   ')).toBe('');
  });

  // -------------------------------------------------------------------------
  // Inputs that look like private hosts — normalise only; SSRF guard rejects
  // -------------------------------------------------------------------------
  it('normalises localhost (SSRF guard must reject it downstream)', () => {
    // normalisation is not the SSRF gate — it just makes the URL parseable
    expect(normalizeCompanyUrl('localhost')).toBe('https://localhost');
  });

  it('normalises a private IP string (SSRF guard must reject it downstream)', () => {
    // Raw "192.168.1.1" has no scheme — gets normalised so SSRF check can parse it
    expect(normalizeCompanyUrl('192.168.1.1')).toBe('https://192.168.1.1');
  });
});
