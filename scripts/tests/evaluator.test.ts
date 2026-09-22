import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { BatchOutputEnvelopeSchema, validateKit } from '@rehearsa/shared';

describe('Batch Evaluator CLI Integration & Benchmark Verification', () => {
  const scratchDir = path.resolve(__dirname, '../../scratch');
  const inputPath = path.join(scratchDir, 'test-cli-cases.json');
  const outputPath = path.join(scratchDir, 'test-cli-output.json');
  const malformedInputPath = path.join(scratchDir, 'test-cli-malformed.json');

  beforeAll(() => {
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const sampleCases = [
      {
        id: 'eval-case-01-standard',
        jd: 'We need a Senior Full Stack Engineer with strong TypeScript, React, and Node.js experience to lead system design.',
        company_url: 'https://example.com',
        days: 5,
      },
      {
        id: 'eval-case-02-1day-boundary',
        jd: 'Staff Frontend Engineer with deep expertise in TypeScript, Next.js App Router, Tailwind CSS, and Core Web Vitals.',
        company_url: 'https://example.com',
        days: 1,
      },
      {
        id: 'eval-case-03-60days-boundary',
        jd: 'Principal Cloud Platform Architect with deep knowledge of Kubernetes, Terraform, AWS, and zero-trust security.',
        company_url: 'https://example.com',
        days: 60,
      },
      {
        id: 'eval-case-04-invalid-short-jd',
        jd: 'Too short',
        company_url: 'https://example.com',
        days: 5,
      },
      {
        id: 'eval-case-05-invalid-days-bound',
        jd: 'Valid job description for a backend engineer with extensive SQL and NoSQL database optimization skills.',
        company_url: 'https://example.com',
        days: 100,
      },
      {
        id: 'eval-case-06-invalid-url',
        jd: 'Valid job description for a security engineer with incident response and penetration testing experience.',
        company_url: 'ftp://invalid-protocol.local',
        days: 7,
      },
      {
        id: 'eval-case-07-unreachable-site-fallback',
        jd: 'We need a Site Reliability Engineer with Kubernetes, Terraform, and automated failover expertise.',
        company_url: 'https://unreachable-domain-xyz-987654321.org',
        days: 3,
      },
    ];

    fs.writeFileSync(inputPath, JSON.stringify(sampleCases, null, 2), 'utf-8');
    fs.writeFileSync(malformedInputPath, '{ not valid json', 'utf-8');
  });

  afterAll(() => {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    if (fs.existsSync(malformedInputPath)) fs.unlinkSync(malformedInputPath);
  });

  it('executes batch evaluation and outputs valid Appendix B envelope with per-case failure isolation', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const cmd = `npx tsx scripts/evaluator.ts --input "${inputPath}" --output "${outputPath}"`;

    execSync(cmd, { cwd: rootDir, encoding: 'utf-8' });

    expect(fs.existsSync(outputPath)).toBe(true);

    const rawOutput = fs.readFileSync(outputPath, 'utf-8');
    const envelope = JSON.parse(rawOutput);

    // 1. Validate Appendix B Envelope Schema
    const parsed = BatchOutputEnvelopeSchema.safeParse(envelope);
    expect(parsed.success).toBe(true);
    expect(envelope.version).toBe('1.0');
    expect(envelope.kits.length).toBe(7);

    // 2. Validate Standard Case (5 days)
    const case1 = envelope.kits.find((k: any) => k.id === 'eval-case-01-standard');
    expect(case1).toBeDefined();
    expect(case1.status).toBe('ok');
    expect(case1.kit).toBeDefined();
    expect(case1.error).toBeNull();

    const kit1Validation = validateKit(case1.kit);
    expect(kit1Validation.valid).toBe(true);
    expect(case1.kit.schedule.days_available).toBe(5);
    expect(case1.kit.schedule.days.length).toBe(5);

    // 3. Validate Minimum Boundary Case (1 day)
    const case2 = envelope.kits.find((k: any) => k.id === 'eval-case-02-1day-boundary');
    expect(case2).toBeDefined();
    expect(case2.status).toBe('ok');
    expect(case2.kit.schedule.days_available).toBe(1);
    expect(case2.kit.schedule.days.length).toBe(1);
    expect(validateKit(case2.kit).valid).toBe(true);

    // 4. Validate Maximum Boundary Case (60 days)
    const case3 = envelope.kits.find((k: any) => k.id === 'eval-case-03-60days-boundary');
    expect(case3).toBeDefined();
    expect(case3.status).toBe('ok');
    expect(case3.kit.schedule.days_available).toBe(60);
    expect(case3.kit.schedule.days.length).toBe(60);
    expect(validateKit(case3.kit).valid).toBe(true);

    // 5. Validate Failure Isolation on Invalid Cases
    const case4 = envelope.kits.find((k: any) => k.id === 'eval-case-04-invalid-short-jd');
    expect(case4).toBeDefined();
    expect(case4.status).toBe('failed');
    expect(case4.kit).toBeNull();
    expect(case4.error.code).toBe('INVALID_CASE_INPUT');

    const case5 = envelope.kits.find((k: any) => k.id === 'eval-case-05-invalid-days-bound');
    expect(case5).toBeDefined();
    expect(case5.status).toBe('failed');
    expect(case5.kit).toBeNull();
    expect(case5.error.code).toBe('INVALID_CASE_INPUT');

    const case6 = envelope.kits.find((k: any) => k.id === 'eval-case-06-invalid-url');
    expect(case6).toBeDefined();
    expect(case6.status).toBe('failed');
    expect(case6.kit).toBeNull();
    expect(case6.error.code).toBe('INVALID_CASE_INPUT');

    // 6. Validate Graceful Fallback on Unreachable Company Site
    const case7 = envelope.kits.find((k: any) => k.id === 'eval-case-07-unreachable-site-fallback');
    expect(case7).toBeDefined();
    expect(case7.status).toBe('ok');
    expect(case7.kit).toBeDefined();
    expect(validateKit(case7.kit).valid).toBe(true);
    expect(case7.kit.schedule.days_available).toBe(3);
    expect(case7.kit.schedule.days.length).toBe(3);
  }, 20000);

  it('exits with code 1 when input file is missing or invalid JSON', () => {
    const rootDir = path.resolve(__dirname, '../..');
    
    // Missing input file
    expect(() => {
      execSync(`npx tsx scripts/evaluator.ts --input "nonexistent.json" --output "${outputPath}"`, {
        cwd: rootDir,
        stdio: 'pipe',
      });
    }).toThrow();

    // Malformed JSON
    expect(() => {
      execSync(`npx tsx scripts/evaluator.ts --input "${malformedInputPath}" --output "${outputPath}"`, {
        cwd: rootDir,
        stdio: 'pipe',
      });
    }).toThrow();

    // Missing arguments
    expect(() => {
      execSync(`npx tsx scripts/evaluator.ts`, {
        cwd: rootDir,
        stdio: 'pipe',
      });
    }).toThrow();
  }, 20000);
});
