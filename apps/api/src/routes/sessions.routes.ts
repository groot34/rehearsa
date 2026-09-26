import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../modules/auth/auth.middleware';
import {
  createSession,
  getSessionById,
  convertSessionToKit,
  updateSessionQuestionConfidence,
  reorderSessionQuestions,
  updateSessionFlashcardConfidence,
} from '../modules/sessions/session.service';
import { SaveKitInputSchema, UpdateKitInputSchema } from '@rehearsa/shared';

const router = Router();

// Session token cookie name
const SESSION_TOKEN_COOKIE = 'rehearsa_session_token';

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

// ---------------------------------------------------------------------------
// Async error wrapper
// ---------------------------------------------------------------------------
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ---------------------------------------------------------------------------
// POST /api/sessions  — create a new generation session (public, no auth)
// ---------------------------------------------------------------------------

/**
 * Creates a new anonymous generation session with a high-entropy session ID.
 * Generates a session token and sets it as an HttpOnly cookie for ownership verification.
 * Sessions are public (no auth required) to support the batch evaluator contract.
 * Session-to-kit conversion requires authentication.
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

  const result = await createSession(parseResult.data.kit);
  if (!result.success) {
    res.status(result.statusCode).json({
      error: { code: result.code, message: result.message },
    });
    return;
  }

  // Set HttpOnly cookie with session token
  res.cookie(SESSION_TOKEN_COOKIE, result.data.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  res.status(201).json({ success: true, sessionId: result.data.sessionId });
}));

// ---------------------------------------------------------------------------
// GET /api/sessions/:id  — fetch a session by ID (public, no auth)
// ---------------------------------------------------------------------------

/**
 * Fetches a session by its opaque session ID.
 * Requires session token from HttpOnly cookie for ownership verification.
 * Updates lastAccessedAt for TTL tracking.
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const sessionToken = req.cookies[SESSION_TOKEN_COOKIE];
  const result = await getSessionById(req.params.id, sessionToken);
  if (!result.success) {
    res.status(result.statusCode).json({
      error: { code: result.code, message: result.message },
    });
    return;
  }
  res.status(200).json({ success: true, ...result.data });
}));

// ---------------------------------------------------------------------------
// POST /api/sessions/:id/save  — convert session to saved kit (requires auth)
// ---------------------------------------------------------------------------

/**
 * Converts an anonymous session to a user-owned saved kit.
 * After successful conversion, the session is deleted.
 * Requires authentication to associate the kit with a user.
 */
router.post('/:id/save', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const result = await convertSessionToKit(req.params.id, req.user!.sub);
  if (!result.success) {
    res.status(result.statusCode).json({
      error: { code: result.code, message: result.message },
    });
    return;
  }
  res.status(201).json({ success: true, ...result.data });
}));

// ---------------------------------------------------------------------------
// PUT /api/sessions/:id/confidence  — update confidence for a session question (public)
// ---------------------------------------------------------------------------

/**
 * Updates the confidence level for a specific question within a session.
 * Requires session token from HttpOnly cookie for ownership verification.
 */
router.put('/:id/confidence', asyncHandler(async (req: Request, res: Response) => {
  const sessionToken = req.cookies[SESSION_TOKEN_COOKIE];
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

  const result = await updateSessionQuestionConfidence(
    req.params.id,
    sessionToken,
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
// PUT /api/sessions/:id/reorder  — reorder questions in a session (public)
// ---------------------------------------------------------------------------

/**
 * Reorders questions within a session by setting an explicit ordered array of question IDs.
 * Requires session token from HttpOnly cookie for ownership verification.
 */
router.put('/:id/reorder', asyncHandler(async (req: Request, res: Response) => {
  const sessionToken = req.cookies[SESSION_TOKEN_COOKIE];
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

  const result = await reorderSessionQuestions(req.params.id, sessionToken, parseResult.data.questionIds);
  if (!result.success) {
    res.status(result.statusCode).json({
      error: { code: result.code, message: result.message },
    });
    return;
  }
  res.status(200).json({ success: true, updated: true });
}));

// ---------------------------------------------------------------------------
// PUT /api/sessions/:id/flashcard-confidence  — set confidence tier for a session flashcard (public)
// ---------------------------------------------------------------------------

/**
 * Updates the confidence tier for a specific flashcard within a session.
 * Requires session token from HttpOnly cookie for ownership verification.
 */
router.put('/:id/flashcard-confidence', asyncHandler(async (req: Request, res: Response) => {
  const sessionToken = req.cookies[SESSION_TOKEN_COOKIE];
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

  const result = await updateSessionFlashcardConfidence(
    req.params.id,
    sessionToken,
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

export const sessionsRoutes = router;
