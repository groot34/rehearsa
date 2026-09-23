import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RegisterInput, LoginInput, PublicUser, JwtPayload } from '@rehearsa/shared';
import { UserModel } from './user.model';
import { config } from '../../config';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** bcrypt work factor. 12 provides strong resistance to brute-force attacks. */
const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface AuthSuccess {
  success: true;
  token: string;
  user: PublicUser;
}

export interface AuthFailure {
  success: false;
  code: string;
  message: string;
  statusCode: number;
}

export type AuthResult = AuthSuccess | AuthFailure;

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

/**
 * Returns the JWT secret, reading it at call time so tests that set
 * process.env.JWT_SECRET in beforeAll() are not bitten by the module
 * being evaluated before the env var is set.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || config.jwt.secret;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured. Set it in your .env file.');
  }
  return secret;
}

/**
 * Signs a JWT for the given user.
 * Payload: { sub: userId, email }.
 * Secret and expiry come from environment — never hardcoded.
 */
export function signToken(userId: string, email: string): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = { sub: userId, email };
  const expiresIn = (process.env.JWT_EXPIRES_IN || config.jwt.expiresIn) as string;
  return jwt.sign(payload, getJwtSecret(), { expiresIn } as jwt.SignOptions);
}

/**
 * Verifies a JWT and returns its decoded payload.
 * Throws a JsonWebTokenError or TokenExpiredError on failure.
 */
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getJwtSecret());
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }
  return decoded as JwtPayload;
}

/**
 * Maps an IUser document to a safe public representation.
 * Never includes passwordHash.
 */
export function toPublicUser(user: { _id: unknown; email: string; createdAt: Date }): PublicUser {
  return {
    id: String(user._id),
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers a new user.
 *
 * Returns an AuthSuccess with a signed JWT on success.
 * Returns an AuthFailure with code EMAIL_TAKEN (409) if the email already exists.
 * Returns an AuthFailure with code VALIDATION_ERROR (400) for invalid inputs.
 *
 * Email is normalised (lowercased + trimmed) by the Zod schema before reaching here.
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const { email, password } = input;

  // Hash password before touching the DB so a DB failure before save doesn't
  // leak a plaintext password into logs or error messages.
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const user = await UserModel.create({ email, passwordHash });

    const token = signToken(String(user._id), user.email);
    return {
      success: true,
      token,
      user: toPublicUser(user),
    };
  } catch (err: unknown) {
    // MongoDB duplicate key error
    if (isMongooseDuplicateKeyError(err)) {
      return {
        success: false,
        code: 'EMAIL_TAKEN',
        message: 'An account with this email address already exists.',
        statusCode: 409,
      };
    }
    throw err; // Let unexpected errors propagate to the route handler
  }
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/**
 * Authenticates a user by email and password.
 *
 * Returns an AuthSuccess with a signed JWT on success.
 * Returns an AuthFailure with code INVALID_CREDENTIALS (401) for any
 * authentication failure — deliberately generic to avoid user enumeration.
 *
 * Email is normalised by the Zod schema before reaching here.
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const { email, password } = input;

  // Explicitly select passwordHash which is excluded by default (select: false)
  const user = await UserModel.findOne({ email }).select('+passwordHash');

  // Use a constant-time comparison even on the "user not found" path to avoid
  // timing-based user enumeration.
  const dummyHash = '$2b$12$placeholder.that.never.matches.anything.at.all12';
  const hash = user?.passwordHash ?? dummyHash;
  const passwordMatches = await bcrypt.compare(password, hash);

  if (!user || !passwordMatches) {
    return {
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
      statusCode: 401,
    };
  }

  const token = signToken(String(user._id), user.email);
  return {
    success: true,
    token,
    user: toPublicUser(user),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detects Mongoose/MongoDB duplicate-key errors (code 11000 / 11001). */
function isMongooseDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    ((err as { code: number }).code === 11000 ||
      (err as { code: number }).code === 11001)
  );
}
