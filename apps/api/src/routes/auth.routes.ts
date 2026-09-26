import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { RegisterInputSchema, LoginInputSchema } from '@rehearsa/shared';
import { registerUser, loginUser } from '../modules/auth/auth.service';
import { requireAuth } from '../modules/auth/auth.middleware';

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiting — applied only to auth endpoints that accept credentials
// ---------------------------------------------------------------------------

/**
 * 10 attempts per 15 minutes per IP.
 * Provides basic protection against credential-stuffing and brute-force.
 * In production, a reverse proxy (nginx, Cloudflare) should apply additional
 * IP-level limits upstream.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please wait a moment before trying again.',
    },
  },
  skip: () => process.env.NODE_ENV === 'test', // disable in automated test suite
});

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  const parseResult = RegisterInputSchema.safeParse(req.body);

  if (!parseResult.success) {
    const details = parseResult.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid registration input.',
        details,
      },
    });
  }

  const result = await registerUser(parseResult.data);

  if (!result.success) {
    return res.status(result.statusCode).json({
      error: { code: result.code, message: result.message },
    });
  }

  // Set HttpOnly cookie
  res.cookie('rehearsa_token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000, // 1 hour
    path: '/',
  });

  return res.status(201).json({
    success: true,
    user: result.user,
  });
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const parseResult = LoginInputSchema.safeParse(req.body);

  if (!parseResult.success) {
    // Generic error — do not reveal which field failed to avoid user enumeration
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid login input.',
      },
    });
  }

  const result = await loginUser(parseResult.data);

  if (!result.success) {
    return res.status(result.statusCode).json({
      error: { code: result.code, message: result.message },
    });
  }

  // Set HttpOnly cookie
  res.cookie('rehearsa_token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000, // 1 hour
    path: '/',
  });

  return res.status(200).json({
    success: true,
    user: result.user,
  });
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------

/**
 * Logout — stateless JWT implementation.
 *
 * IMPORTANT: This endpoint does NOT invalidate the JWT server-side.
 * JWTs are stateless by design: once issued, they remain valid until expiry
 * unless a server-side token blocklist is implemented (not in scope for M8).
 *
 * What this endpoint does:
 *   - Requires a valid token (so the client knows the logout was acknowledged)
 *   - Returns a success response signalling the client should discard its token
 *
 * What this endpoint does NOT do:
 *   - Prevent a disclosed token from being reused before its expiry
 *
 * Known limitation: if a user's device is compromised, the attacker can
 * continue using the token until it expires.  Short JWT_EXPIRES_IN values
 * (e.g. 1h) reduce this window.  A server-side blocklist can be added in a
 * future milestone if required.
 */
router.post('/logout', requireAuth, (_req: Request, res: Response) => {
  // Clear HttpOnly cookie
  res.clearCookie('rehearsa_token', { path: '/' });

  return res.status(200).json({
    success: true,
    message: 'Logged out.',
  });
});

// ---------------------------------------------------------------------------
// GET /auth/me — identity check (useful for frontend session verification)
// ---------------------------------------------------------------------------

router.get('/me', requireAuth, (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});

export const authRoutes = router;
