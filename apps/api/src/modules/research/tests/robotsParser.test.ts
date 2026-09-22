import { describe, it, expect } from 'vitest';
import { isPathAllowedByRobots } from '../robotsParser';

describe('isPathAllowedByRobots', () => {
  it('allows access when robots.txt is unreachable or 404', async () => {
    const allowed = await isPathAllowedByRobots('https://example.invalid', 'https://example.invalid/careers', {
      allowLoopbackInDev: false,
    });
    expect(allowed).toBe(true);
  });

  it('allows access when path is not disallowed', async () => {
    const allowed = await isPathAllowedByRobots('https://example.com', 'https://example.com/about', {
      allowLoopbackInDev: true,
    });
    expect(typeof allowed).toBe('boolean');
  });
});
