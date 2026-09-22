import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { BatchOutputEnvelopeSchema } from '@rehearsa/shared';

describe('Batch Evaluator CLI Integration', () => {
  const scratchDir = path.resolve(__dirname, '../../scratch');
  const inputPath = path.join(scratchDir, 'test-cli-cases.json');
  const outputPath = path.join(scratchDir, 'test-cli-output.json');

  beforeAll(() => {
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const sampleCases = [
      {
        id: 'eval-case-01',
        jd: 'We need a Senior Full Stack Engineer with strong TypeScript, React, and Node.js experience to lead system design.',
        company_url: 'https://example.com',
        days: 5,
      },
      {
        id: 'eval-case-02-invalid',
        jd: 'Too short',
        company_url: 'https://example.com',
        days: 5,
      },
    ];

    fs.writeFileSync(inputPath, JSON.stringify(sampleCases, null, 2), 'utf-8');
  });

  afterAll(() => {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  });

  it('executes batch evaluation and outputs valid Appendix B envelope with per-case failure isolation', () => {
    const rootDir = path.resolve(__dirname, '../..');
    const cmd = `npx tsx scripts/evaluator.ts --input "${inputPath}" --output "${outputPath}"`;

    execSync(cmd, { cwd: rootDir, encoding: 'utf-8' });

    expect(fs.existsSync(outputPath)).toBe(true);

    const rawOutput = fs.readFileSync(outputPath, 'utf-8');
    const envelope = JSON.parse(rawOutput);

    // Validate Appendix B schema
    const parsed = BatchOutputEnvelopeSchema.safeParse(envelope);
    expect(parsed.success).toBe(true);

    expect(envelope.version).toBe('1.0');
    expect(envelope.kits.length).toBe(2);

    // Case 1 should succeed
    const case1 = envelope.kits.find((k: any) => k.id === 'eval-case-01');
    expect(case1).toBeDefined();
    expect(case1.status).toBe('ok');
    expect(case1.kit).toBeDefined();

    // Case 2 should fail gracefully without crashing the batch
    const case2 = envelope.kits.find((k: any) => k.id === 'eval-case-02-invalid');
    expect(case2).toBeDefined();
    expect(case2.status).toBe('failed');
    expect(case2.error).toBeDefined();
    expect(case2.error.code).toBe('INVALID_CASE_INPUT');
  });
});
