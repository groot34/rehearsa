import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import {
  registerUser,
  loginUser,
  signToken,
  verifyToken,
  toPublicUser,
} from '../auth.service';
import { UserModel } from '../user.model';

// ---------------------------------------------------------------------------
// In-memory MongoDB setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Use a dedicated test JWT secret so tests are independent of .env
  process.env.JWT_SECRET = 'test-secret-for-auth-service-tests-32chars!!';
  process.env.JWT_EXPIRES_IN = '1h';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clean users between tests for isolation
  await UserModel.deleteMany({});
});

// ---------------------------------------------------------------------------
// signToken / verifyToken
// ---------------------------------------------------------------------------

describe('signToken and verifyToken', () => {
  it('signs a token that verifyToken can decode', () => {
    const token = signToken('abc123', 'test@example.com');
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT format

    const payload = verifyToken(token);
    expect(payload.sub).toBe('abc123');
    expect(payload.email).toBe('test@example.com');
  });

  it('verifyToken throws on a tampered token', () => {
    const token = signToken('abc123', 'test@example.com');
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('verifyToken throws on a token signed with a different secret', () => {
    const foreignToken = jwt.sign(
      { sub: 'abc', email: 'x@x.com' },
      'completely-different-secret-value'
    );
    expect(() => verifyToken(foreignToken)).toThrow();
  });

  it('verifyToken throws on an expired token', async () => {
    const expiredToken = jwt.sign(
      { sub: 'abc123', email: 'test@example.com' },
      process.env.JWT_SECRET!,
      { expiresIn: '0s' }
    );
    // Small delay to ensure expiry
    await new Promise((r) => setTimeout(r, 10));
    expect(() => verifyToken(expiredToken)).toThrow(jwt.TokenExpiredError);
  });

  it('verifyToken throws on a completely invalid string', () => {
    expect(() => verifyToken('not.a.jwt')).toThrow();
    expect(() => verifyToken('')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// registerUser
// ---------------------------------------------------------------------------

describe('registerUser', () => {
  it('registers a new user and returns a JWT and public user', async () => {
    const result = await registerUser({
      email: 'alice@example.com',
      password: 'securePass123',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('alice@example.com');
    expect(result.user.id).toBeTruthy();
    expect(result.user.createdAt).toBeTruthy();
    // passwordHash must NEVER be in the response
    expect((result.user as any).passwordHash).toBeUndefined();
  });

  it('stores the password as a bcrypt hash, never plaintext', async () => {
    await registerUser({ email: 'alice@example.com', password: 'securePass123' });

    // Explicitly select passwordHash to inspect it
    const dbUser = await UserModel.findOne({ email: 'alice@example.com' }).select('+passwordHash');
    expect(dbUser).not.toBeNull();
    expect(dbUser!.passwordHash).not.toBe('securePass123');
    expect(dbUser!.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
  });

  it('normalises email to lowercase', async () => {
    const result = await registerUser({
      email: 'ALICE@EXAMPLE.COM',
      password: 'securePass123',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.user.email).toBe('alice@example.com');
  });

  it('returns EMAIL_TAKEN (409) for a duplicate email', async () => {
    await registerUser({ email: 'alice@example.com', password: 'firstPass123' });
    const result = await registerUser({
      email: 'alice@example.com',
      password: 'secondPass456',
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe('EMAIL_TAKEN');
    expect(result.statusCode).toBe(409);
  });

  it('returns EMAIL_TAKEN when case differs (email normalised)', async () => {
    await registerUser({ email: 'alice@example.com', password: 'firstPass123' });
    const result = await registerUser({
      email: 'ALICE@EXAMPLE.COM',
      password: 'anotherPass789',
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe('EMAIL_TAKEN');
  });

  it('JWT payload contains the correct sub and email', async () => {
    const result = await registerUser({
      email: 'bob@example.com',
      password: 'bobsPass456',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const payload = verifyToken(result.token);
    expect(payload.sub).toBe(result.user.id);
    expect(payload.email).toBe('bob@example.com');
  });
});

// ---------------------------------------------------------------------------
// loginUser
// ---------------------------------------------------------------------------

describe('loginUser', () => {
  beforeEach(async () => {
    // Seed a user for login tests
    await registerUser({ email: 'carol@example.com', password: 'carolPass789' });
  });

  it('logs in with correct credentials and returns a JWT', async () => {
    const result = await loginUser({
      email: 'carol@example.com',
      password: 'carolPass789',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('carol@example.com');
  });

  it('returned user does not include passwordHash', async () => {
    const result = await loginUser({
      email: 'carol@example.com',
      password: 'carolPass789',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect((result.user as any).passwordHash).toBeUndefined();
  });

  it('JWT payload from login contains correct sub and email', async () => {
    const result = await loginUser({
      email: 'carol@example.com',
      password: 'carolPass789',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const payload = verifyToken(result.token);
    expect(payload.sub).toBe(result.user.id);
    expect(payload.email).toBe('carol@example.com');
  });

  it('returns INVALID_CREDENTIALS (401) on wrong password', async () => {
    const result = await loginUser({
      email: 'carol@example.com',
      password: 'wrongPassword!',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe('INVALID_CREDENTIALS');
    expect(result.statusCode).toBe(401);
  });

  it('returns INVALID_CREDENTIALS (401) for unknown email', async () => {
    const result = await loginUser({
      email: 'nobody@example.com',
      password: 'somePassword123',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe('INVALID_CREDENTIALS');
    expect(result.statusCode).toBe(401);
  });

  it('returns same error code for wrong password and unknown email (no user enumeration)', async () => {
    const wrongPw = await loginUser({
      email: 'carol@example.com',
      password: 'wrongPassword!',
    });
    const unknownEmail = await loginUser({
      email: 'nobody@example.com',
      password: 'carolPass789',
    });

    expect(wrongPw.success).toBe(false);
    expect(unknownEmail.success).toBe(false);
    if (wrongPw.success || unknownEmail.success) return;

    expect(wrongPw.code).toBe(unknownEmail.code);
    expect(wrongPw.message).toBe(unknownEmail.message);
  });

  it('accepts email with different casing (normalised before lookup)', async () => {
    const result = await loginUser({
      email: 'CAROL@EXAMPLE.COM',
      password: 'carolPass789',
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// toPublicUser
// ---------------------------------------------------------------------------

describe('toPublicUser', () => {
  it('maps a user document to a public shape with no sensitive fields', () => {
    const fakeUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'dave@example.com',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const pub = toPublicUser(fakeUser);

    expect(pub.id).toBe(String(fakeUser._id));
    expect(pub.email).toBe('dave@example.com');
    expect(pub.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect((pub as any).passwordHash).toBeUndefined();
    expect((pub as any)._id).toBeUndefined();
  });
});
