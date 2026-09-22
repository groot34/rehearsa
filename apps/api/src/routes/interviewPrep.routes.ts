import { Router, Request, Response } from 'express';
import { CreateKitInputSchema } from '@rehearsa/shared';
import { executeGenerationPipeline } from '../modules/interview-prep';
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

export const interviewPrepRoutes = router;
