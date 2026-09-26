import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '@rehearsa/shared';
import { verifyToken } from './auth.service';

// ---------------------------------------------------------------------------
// Extend Express Request to carry the authenticated user identity
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by requireAuth middleware after successful JWT verification. */
      user?: Pick<JwtPayload, 'sub' | 'email'>;
    }
  }
}

// ---------------------------------------------------------------------------
// requireAuth middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware that enforces JWT authentication.
 *
 * Expects:  Authorization: Bearer <token>
 *
 * On success: populates req.user = { sub, email } and calls next().
 * On failure: responds 401 with a structured error; does not call next().
 *
 * This middleware does NOT perform database lookups — it only verifies the
 * token signature and expiry.  A deleted user whose token has not yet expired
 * will still pass this check.  Milestone 9 (kit persistence) can add a DB
 * lookup if revocation is required.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Try cookie first (HttpOnly cookie auth)
  const token = req.cookies?.rehearsa_token;

  // Fall back to Authorization header (for test compatibility)
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const finalToken = token || headerToken;

  if (!finalToken) {
    res.status(401).json({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authentication required.',
      },
    });
    return;
  }

  try {
    const payload = verifyToken(finalToken);
    req.user = { sub: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please log in again.',
        },
      });
      return;
    }
    // JsonWebTokenError, NotBeforeError, or any other JWT error
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token.',
      },
    });
  }
}
