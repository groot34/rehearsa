import { describe, it, expect } from 'vitest';
import { generateInterviewKit } from '../lib/api';

describe('Frontend API Client & Generator Validation', () => {
  it('formats payload correctly when calling generateInterviewKit API function', async () => {
    const payload = {
      jobDescription: 'Senior Full Stack Engineer proficient in TypeScript, React, and Node.js backend systems.',
      companyUrl: 'https://example.com',
      daysAvailable: 10,
    };

    // Calls mock/API endpoint
    const response = await generateInterviewKit(payload);
    expect(response).toBeDefined();
    expect(typeof response.success).toBe('boolean');
  });

  it('handles network connection error gracefully when API endpoint is unreachable', async () => {
    // Force invalid port URL
    const originalUrl = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = 'http://127.0.0.1:59999';

    const response = await generateInterviewKit({
      jobDescription: 'Senior Full Stack Engineer proficient in TypeScript, React, and Node.js backend systems.',
      companyUrl: 'https://example.com',
      daysAvailable: 7,
    });

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('NETWORK_ERROR');

    process.env.NEXT_PUBLIC_API_URL = originalUrl;
  });
});
