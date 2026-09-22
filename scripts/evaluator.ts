import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { BatchCaseInputSchema, BatchOutputEnvelope, BatchKitResult } from '../packages/shared/src';
import { executeGenerationPipeline } from '../apps/api/src/modules/interview-prep';

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

  for (let index = 0; index < casesData.length; index++) {
    const rawCase = casesData[index];
    const parsed = BatchCaseInputSchema.safeParse(rawCase);

    if (!parsed.success) {
      const caseId = (rawCase && typeof rawCase === 'object' && 'id' in rawCase) ? String(rawCase.id) : `case-${index + 1}`;
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

    try {
      console.log(`[Rehearsa Batch Evaluator] Executing pipeline for case: ${id} (${company_url}, ${days} days)...`);

      const pipelineRes = await executeGenerationPipeline({
        jobDescription: jd,
        companyUrl: company_url,
        daysAvailable: days,
        allowLoopbackInDev: true,
      });

      if (pipelineRes.success && pipelineRes.kit) {
        results.push({
          id,
          status: 'ok',
          kit: pipelineRes.kit,
          error: null,
        });
      } else {
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
  console.log(`[Rehearsa Batch Evaluator] Complete! Batch envelope written to ${outputPath}`);
}

main().catch((err) => {
  console.error('Unhandled evaluator error:', err);
  process.exit(1);
});
