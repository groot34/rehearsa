import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../app';
import { Server } from 'http';

describe('POST /api/interview-prep/generate Route', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('returns HTTP 400 when required payload fields are missing', async () => {
    const res = await fetch(`${baseUrl}/api/interview-prep/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('returns HTTP 400 when jobDescription is too short', async () => {
    const res = await fetch(`${baseUrl}/api/interview-prep/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobDescription: 'Too short',
        companyUrl: 'https://example.com',
        daysAvailable: 5,
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBeDefined();
  });

  it('returns HTTP 200 with valid kit envelope on valid payload', async () => {
    const res = await fetch(`${baseUrl}/api/interview-prep/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobDescription: 'We are seeking a Senior Full Stack Engineer proficient in TypeScript, React, Node.js, and cloud infrastructure.',
        companyUrl: 'https://example.com',
        daysAvailable: 7,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.kit).toBeDefined();
    expect(body.kit.source).toBeDefined();
    expect(body.kit.schedule.days_available).toBe(7);
  });
});
