import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SaveKitInputSchema, UpdateKitInputSchema } from '@rehearsa/shared';
import { requireAuth } from '../modules/auth/auth.middleware';
import { saveKit, listKits, getKitById, updateKit, deleteKit, updateQuestionConfidence, reorderQuestions, updateFlashcardConfidence } from '../modules/kits/kit.service';

const router = Router();

// Confidence validation schema
const QuestionConfidenceSchema = z.enum(['unknown', 'not-ready', 'somewhat-ready', 'ready']);
const UpdateConfidenceInputSchema = z.object({
  questionId: z.string().min(1, 'Question ID cannot be empty'),
  confidence: QuestionConfidenceSchema,
});

// Reorder validation schema
const ReorderQuestionsInputSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1, 'Question order must be a non-empty array'),
});

// Flashcard confidence validation schema
const FlashcardConfidenceTierSchema = z.enum(['easy', 'medium', 'hard']);
const UpdateFlashcardConfidenceInputSchema = z.object({
  flashcardId: z.string().min(1, 'Flashcard ID cannot be empty'),
  confidence: FlashcardConfidenceTierSchema,
});

// All kit routes require valid authentication.
// req.user.sub is the authenticated user's MongoDB _id (string).
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Async error wrapper
// ---------------------------------------------------------------------------
// Express 4 does NOT catch unhandled promise rejections from async route
// handlers. Wrapping every handler ensures any thrown error (e.g. a MongoDB
// connection failure mid-request) is forwarded to the global error handler
// instead of crashing the process or hanging the request indefinitely.
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ---------------------------------------------------------------------------
// POST /api/kits  — save a new kit
// ---------------------------------------------------------------------------

/**
 * Saves a validated Appendix A kit for the authenticated user.
 * The owner is derived exclusively from the JWT — never from the request body.
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const parseResult = SaveKitInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    const details = parseResult.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid kit payload.', details },
    });
    return;
  }

  const result = await saveKit(req.user!.sub, parseResult.data.kit);
  if (!result.success) {
    res.status(500).json({
      error: { code: 'SAVE_FAILED', message: 'Failed to save kit.' },
    });
    return;
  }
  res.status(201).json({ success: true, ...result.data });
}));

// ---------------------------------------------------------------------------
// GET /api/kits  — list the authenticated user's kits (summaries only)
// ---------------------------------------------------------------------------

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const result = await listKits(req.user!.sub);
  if (!result.success) {
    res.status(500).json({
      error: { code: 'LIST_FAILED', message: 'Failed to retrieve kits.' },
    });
    return;
  }
  res.status(200).json({ success: true, kits: result.data });
}));

// ---------------------------------------------------------------------------
// GET /api/kits/:id  — fetch one owned kit
// ---------------------------------------------------------------------------

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = await getKitById(req.user!.sub, req.params.id);
  if (!result.success) {
    res.status(result.statusCode).json({
      error: { code: result.code, message: result.message },
    });
    return;
  }
  res.status(200).json({ success: true, ...result.data });
}));

// ---------------------------------------------------------------------------
// PUT /api/kits/:id  — update an owned kit after editing / regeneration
// ---------------------------------------------------------------------------

/**
 * Replaces the kit payload on an owned document.
 * The owner cannot be changed — userId always comes from the JWT.
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const parseResult = UpdateKitInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    const details = parseResult.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid kit payload.', details },
    });
    return;
  }

  const result = await updateKit(req.user!.sub, req.params.id, parseResult.data.kit);
  if (!result.success) {
    res.status(result.statusCode).json({
      error: { code: result.code, message: result.message },
    });
    return;
  }
  res.status(200).json({ success: true, ...result.data });
}));

// ---------------------------------------------------------------------------
// DELETE /api/kits/:id  — delete an owned kit
// ---------------------------------------------------------------------------

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = await deleteKit(req.user!.sub, req.params.id);
  if (!result.success) {
    res.status(result.statusCode).json({
      error: { code: result.code, message: result.message },
    });
    return;
  }
  res.status(200).json({ success: true, deleted: true });
}));

// ---------------------------------------------------------------------------
// PUT /api/kits/:id/confidence  — update confidence for a specific question
// ---------------------------------------------------------------------------

/**
 * Updates the confidence level for a specific question within an owned kit.
 * Confidence is stored outside the Appendix A kit payload to preserve schema compliance.
 */
router.put('/:id/confidence', asyncHandler(async (req: Request, res: Response) => {
  const parseResult = UpdateConfidenceInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    const details = parseResult.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid confidence update payload.', details },
    });
    return;
  }

  const result = await updateQuestionConfidence(
    req.user!.sub,
    req.params.id,
    parseResult.data.questionId,
    parseResult.data.confidence
  );
  if (!result.success) {
    res.status(result.statusCode).json({
      error: { code: result.code, message: result.message },
    });
    return;
  }
  res.status(200).json({ success: true, updated: true });
}));

// ---------------------------------------------------------------------------
// PUT /api/kits/:id/reorder  — reorder questions in an owned kit
// ---------------------------------------------------------------------------

/**
 * Reorders questions within an owned kit by setting an explicit ordered array of question IDs.
 * Order is stored outside the Appendix A kit payload to preserve schema compliance.
 */
router.put('/:id/reorder', asyncHandler(async (req: Request, res: Response) => {
  const parseResult = ReorderQuestionsInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    const details = parseResult.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid reorder payload.', details },
    });
    return;
  }

  const result = await reorderQuestions(
    req.user!.sub,
    req.params.id,
    parseResult.data.questionIds
  );
  if (!result.success) {
    res.status(result.statusCode).json({
      error: { code: result.code, message: result.message },
    });
    return;
  }
  res.status(200).json({ success: true, updated: true });
}));

// ---------------------------------------------------------------------------
// PUT /api/kits/:id/flashcard-confidence  — set confidence tier for a flashcard
// ---------------------------------------------------------------------------

/**
 * Updates the confidence tier for a specific flashcard within an owned kit.
 * Confidence is stored outside the Appendix A kit payload to preserve schema compliance.
 * The owner is derived exclusively from the JWT — never from the request body.
 */
router.put('/:id/flashcard-confidence', asyncHandler(async (req: Request, res: Response) => {
  const parseResult = UpdateFlashcardConfidenceInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    const details = parseResult.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid flashcard confidence payload.', details },
    });
    return;
  }

  const result = await updateFlashcardConfidence(
    req.user!.sub,
    req.params.id,
    parseResult.data.flashcardId,
    parseResult.data.confidence
  );
  if (!result.success) {
    res.status(result.statusCode).json({
      error: { code: result.code, message: result.message },
    });
    return;
  }
  res.status(200).json({ success: true, updated: true });
}));

export const kitsRoutes = router;
