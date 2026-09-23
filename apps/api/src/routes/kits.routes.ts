import { Router, Request, Response, NextFunction } from 'express';
import { SaveKitInputSchema, UpdateKitInputSchema } from '@rehearsa/shared';
import { requireAuth } from '../modules/auth/auth.middleware';
import { saveKit, listKits, getKitById, updateKit, deleteKit } from '../modules/kits/kit.service';

const router = Router();

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

export const kitsRoutes = router;
