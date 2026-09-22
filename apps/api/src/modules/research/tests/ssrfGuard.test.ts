import { describe, it, expect } from 'vitest';
import { validateUrlSsrf } from '../ssrfGuard';

describe('SsrfGuard', () => {
  it('allows valid public HTTP and HTTPS URLs', async () => {
    const res1 = await validateUrlSsrf('https://example.com');
    expect(res1.safe).toBe(true);

    const res2 = await validateUrlSsrf('http://example.org/about');
    expect(res2.safe).toBe(true);
  });

  it('rejects unsupported URL schemes like file:, ftp:, and gopher:', async () => {
    const res1 = await validateUrlSsrf('file:///etc/passwd');
    expect(res1.safe).toBe(false);
    expect(res1.reason).toContain('Forbidden URL scheme');

    const res2 = await validateUrlSsrf('ftp://ftp.example.com');
    expect(res2.safe).toBe(false);
  });

  it('rejects localhost and loopback domains when allowLoopbackInDev is false', async () => {
    const res1 = await validateUrlSsrf('http://localhost:4000/health');
    expect(res1.safe).toBe(false);
    expect(res1.reason).toContain('prohibited');

    const res2 = await validateUrlSsrf('http://127.0.0.1/admin');
    expect(res2.safe).toBe(false);
  });

  it('allows loopback addresses only when allowLoopbackInDev option is explicitly true', async () => {
    const res = await validateUrlSsrf('http://127.0.0.1:4000/health', { allowLoopbackInDev: true });
    expect(res.safe).toBe(true);
  });

  it('rejects private IPv4 addresses (10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12)', async () => {
    const res1 = await validateUrlSsrf('http://10.0.0.1/secret');
    expect(res1.safe).toBe(false);

    const res2 = await validateUrlSsrf('http://192.168.1.254/config');
    expect(res2.safe).toBe(false);

    const res3 = await validateUrlSsrf('http://172.16.0.1/internal');
    expect(res3.safe).toBe(false);
  });

  it('rejects AWS/GCP cloud metadata IP (169.254.169.254)', async () => {
    const res = await validateUrlSsrf('http://169.254.169.254/latest/meta-data/');
    expect(res.safe).toBe(false);
    expect(res.reason).toContain('prohibited');
  });
});
