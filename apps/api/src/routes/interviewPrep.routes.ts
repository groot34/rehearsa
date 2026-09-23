import { Router, Request, Response } from 'express';
import { CreateKitInputSchema, RegenerateKitSectionInputSchema } from '@rehearsa/shared';
import { executeGenerationPipeline, regenerateKitSection } from '../modules/interview-prep';
import { config } from '../config';

const router = Router();

/**
 * POST /api/interview-prep/generate
 * Generates an interview preparation kit from job description, company URL, and days available.
 */
router.post('/generate', async (req: Request, res: Response) => {
  const parseResult = CreateKitInputSchema.safeParse({
    jobDescription: req.body.jobDescription || req.body.jd,
    companyUrl: req.body.companyUrl || req.body.company_url,
    daysAvailable: req.body.daysAvailable || req.body.days,
  });

  if (!parseResult.success) {
    const errorMsgs = parseResult.error.issues.map((i) => i.message).join(', ');
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: `Validation failed: ${errorMsgs}`,
        details: parseResult.error.issues,
      },
    });
  }

  const { jobDescription, companyUrl, daysAvailable } = parseResult.data;

  const result = await executeGenerationPipeline({
    jobDescription,
    companyUrl,
    daysAvailable,
    allowLoopbackInDev: config.crawl.allowLoopbackInDev,
  });

  if (!result.success || !result.kit) {
    const statusCode = result.error?.code === 'INVALID_INPUT' ? 400 : 500;
    return res.status(statusCode).json({
      error: result.error || { code: 'GENERATION_FAILED', message: 'Failed to generate kit.' },
    });
  }

  return res.status(200).json({
    success: true,
    kit: result.kit,
  });
});

/**
 * POST /api/interview-prep/regenerate-section
 *
 * Regenerates a single kit section ('questions' or 'flashcards') while
 * preserving manually edited and user-added items.
 *
 * The client submits the full current Appendix A kit, the target section,
 * and an explicit list of item IDs to preserve through regeneration.
 * On success the response contains the full updated Appendix A kit.
 * On any failure the response contains a structured error and the client
 * retains its existing kit unchanged.
 */
router.post('/regenerate-section', async (req: Request, res: Response) => {
  const parseResult = RegenerateKitSectionInputSchema.safeParse(req.body);

  if (!parseResult.success) {
    const errorMsgs = parseResult.error.issues.map((i) => i.message).join(', ');
    return res.status(400).json({
      success: false,
      error: {
        code: 'REGEN_INVALID_INPUT',
        message: `Validation failed: ${errorMsgs}`,
        details: parseResult.error.issues,
      },
    });
  }

  const { kit, section, preserved_ids } = parseResult.data;

  const result = await regenerateKitSection({
    kit,
    section,
    preserved_ids,
    // No provider override — uses the configured provider from environment
  });

  if (!result.success || !result.kit) {
    const statusCode = result.error?.code === 'REGEN_INVALID_INPUT' ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      error: result.error ?? {
        code: 'REGEN_LLM_FAILED',
        message: 'Section regeneration failed.',
      },
    });
  }

  return res.status(200).json({
    success: true,
    kit: result.kit,
  });
});

export const interviewPrepRoutes = router;
