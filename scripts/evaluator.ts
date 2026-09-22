import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { BatchCaseInputSchema, BatchOutputEnvelope } from '../packages/shared/src';

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

  console.log(`[Rehearsa Batch Evaluator] Found ${casesData.length} evaluation case(s).`);

  const envelope: BatchOutputEnvelope = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: casesData.map((c, index) => {
      const parsed = BatchCaseInputSchema.safeParse(c);
      const caseId = parsed.success ? parsed.data.id : `case-${index + 1}`;

      return {
        id: caseId,
        status: 'failed',
        kit: null,
        error: {
          code: 'PIPELINE_NOT_CONNECTED',
          message: 'The full research pipeline is scheduled for Milestone 3 implementation.',
        },
      };
    }),
  };

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(envelope, null, 2), 'utf-8');
  console.log(`[Rehearsa Batch Evaluator] Batch envelope written to ${outputPath}`);
}

main().catch((err) => {
  console.error('Unhandled evaluator error:', err);
  process.exit(1);
});
