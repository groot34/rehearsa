import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { BatchCaseInputSchema, BatchOutputEnvelope, BatchKitResult, normalizeCompanyUrl } from '../packages/shared/src';
import { executeGenerationPipeline } from '../apps/api/src/modules/interview-prep';
import { MockPublicInterviewSearchProvider } from '../apps/api/src/modules/research/mockInterviewSearchProvider';

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      output: { type: 'string', short: 'o' },
    },
    strict: false,
  });

  if (!values.input || !values.output) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), values.input as string);
  const outputPath = path.resolve(process.cwd(), values.output as string);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`[Rehearsa Batch Evaluator] Reading evaluation cases from ${inputPath}...`);
  const rawInput = fs.readFileSync(inputPath, 'utf-8');
  let casesData: unknown;

  try {
    casesData = JSON.parse(rawInput);
  } catch (err) {
    console.error(`Invalid JSON in input file: ${(err as Error).message}`);
    process.exit(1);
  }

  if (!Array.isArray(casesData)) {
    console.error('Input cases file must contain a JSON array of cases.');
    process.exit(1);
  }

  console.log(`[Rehearsa Batch Evaluator] Processing ${casesData.length} evaluation case(s)...`);

  const results: BatchKitResult[] = [];
  const startTime = Date.now();

  for (let index = 0; index < casesData.length; index++) {
    const caseStartTime = Date.now();
    const rawCase = casesData[index];
    const parsed = BatchCaseInputSchema.safeParse(rawCase);

    if (!parsed.success) {
      const caseId = (rawCase && typeof rawCase === 'object' && 'id' in rawCase) ? String(rawCase.id) : `case-${index + 1}`;
      const elapsed = Date.now() - caseStartTime;
      console.warn(`[Rehearsa Batch Evaluator] Case ${caseId}: FAILED schema validation (${elapsed}ms)`);
      results.push({
        id: caseId,
        status: 'failed',
        kit: null,
        error: {
          code: 'INVALID_CASE_INPUT',
          message: `Case input schema error: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        },
      });
      continue;
    }

    const { id, jd, company_url, days } = parsed.data;
    const normalizedUrl = normalizeCompanyUrl(company_url);

    try {
      console.log(`[Rehearsa Batch Evaluator] Case ${id}: Executing pipeline (${normalizedUrl}, ${days} days)...`);

      const pipelineRes = await executeGenerationPipeline({
        jobDescription: jd,
        companyUrl: normalizedUrl,
        daysAvailable: days,
        allowLoopbackInDev: true,
        interviewSearchProvider: new MockPublicInterviewSearchProvider(),
      });

      const elapsed = Date.now() - caseStartTime;

      if (pipelineRes.success && pipelineRes.kit) {
        console.log(`[Rehearsa Batch Evaluator] Case ${id}: OK (${elapsed}ms)`);
        results.push({
          id,
          status: 'ok',
          kit: pipelineRes.kit,
          error: null,
        });
      } else {
        const errCode = pipelineRes.error?.code || 'GENERATION_FAILED';
        console.warn(`[Rehearsa Batch Evaluator] Case ${id}: FAILED - ${errCode} (${elapsed}ms)`);
        results.push({
          id,
          status: 'failed',
          kit: null,
          error: pipelineRes.error || {
            code: 'GENERATION_FAILED',
            message: 'Pipeline failed to produce a valid prep kit.',
          },
        });
      }
    } catch (err: any) {
      const elapsed = Date.now() - caseStartTime;
      console.error(`[Rehearsa Batch Evaluator] Case ${id}: EXCEPTION - ${err.message} (${elapsed}ms)`);
      results.push({
        id,
        status: 'failed',
        kit: null,
        error: {
          code: 'UNHANDLED_CASE_EXCEPTION',
          message: err.message || 'Unexpected exception during case evaluation.',
        },
      });
    }
  }

  const totalElapsed = Date.now() - startTime;
  const okCount = results.filter((r) => r.status === 'ok').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  const envelope: BatchOutputEnvelope = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results,
  };

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(envelope, null, 2), 'utf-8');
  console.log(`\n==================================================`);
  console.log(`[Rehearsa Batch Evaluator] Execution Summary:`);
  console.log(`Total Cases : ${results.length}`);
  console.log(`Successful  : ${okCount}`);
  console.log(`Failed      : ${failedCount}`);
  console.log(`Total Time  : ${totalElapsed}ms`);
  console.log(`Envelope written to: ${outputPath}`);
  console.log(`==================================================\n`);
}

main().catch((err) => {
  console.error('Unhandled evaluator error:', err);
  process.exit(1);
});
