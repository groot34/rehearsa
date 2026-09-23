import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app';
import { UserModel } from '../../modules/auth/user.model';

// ---------------------------------------------------------------------------
// In-memory MongoDB + Express server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-for-auth-route-tests-32chars!!';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const post = (path: string, body: unknown, token?: string) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const get = (path: string, token?: string) =>
  fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

describe('POST /auth/register', () => {
  it('returns 201 with token and user on valid registration', async () => {
    const res = await post('/auth/register', {
      email: 'alice@example.com',
      password: 'securePass123',
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(body.user.email).toBe('alice@example.com');
    expect(body.user.id).toBeTruthy();
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('returns 400 on missing email', async () => {
    const res = await post('/auth/register', { password: 'securePass123' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on invalid email format', async () => {
    const res = await post('/auth/register', {
      email: 'not-an-email',
      password: 'securePass123',
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when password is too short (< 8 chars)', async () => {
    const res = await post('/auth/register', {
      email: 'alice@example.com',
      password: 'short',
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 on duplicate email registration', async () => {
    await post('/auth/register', {
      email: 'alice@example.com',
      password: 'securePass123',
    });
    const res = await post('/auth/register', {
      email: 'alice@example.com',
      password: 'differentPass456',
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('EMAIL_TAKEN');
  });

  it('normalises email to lowercase', async () => {
    const res = await post('/auth/register', {
      email: 'ALICE@EXAMPLE.COM',
      password: 'securePass123',
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.user.email).toBe('alice@example.com');
  });

  it('does not return passwordHash in the response body', async () => {
    const res = await post('/auth/register', {
      email: 'alice@example.com',
      password: 'securePass123',
    });
    const text = await res.text();
    expect(text).not.toContain('passwordHash');
    expect(text).not.toContain('securePass123');
  });
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await post('/auth/register', {
      email: 'bob@example.com',
      password: 'bobsPass456',
    });
  });

  it('returns 200 with token and user on correct credentials', async () => {
    const res = await post('/auth/login', {
      email: 'bob@example.com',
      password: 'bobsPass456',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(body.user.email).toBe('bob@example.com');
  });

  it('returns 401 on wrong password', async () => {
    const res = await post('/auth/login', {
      email: 'bob@example.com',
      password: 'wrongPassword!',
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 on unknown email', async () => {
    const res = await post('/auth/login', {
      email: 'nobody@example.com',
      password: 'bobsPass456',
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns same error code for wrong password and unknown email', async () => {
    const wrongPw = (await (
      await post('/auth/login', { email: 'bob@example.com', password: 'wrong!' })
    ).json()) as any;
    const unknownEmail = (await (
      await post('/auth/login', { email: 'nobody@example.com', password: 'bobsPass456' })
    ).json()) as any;

    expect(wrongPw.error.code).toBe(unknownEmail.error.code);
  });

  it('returns 400 on missing fields', async () => {
    const res = await post('/auth/login', { email: 'bob@example.com' });
    expect(res.status).toBe(400);
  });

  it('does not return passwordHash in the response body', async () => {
    const res = await post('/auth/login', {
      email: 'bob@example.com',
      password: 'bobsPass456',
    });
    const text = await res.text();
    expect(text).not.toContain('passwordHash');
    expect(text).not.toContain('bobsPass456');
  });

  it('accepts email with different casing', async () => {
    const res = await post('/auth/login', {
      email: 'BOB@EXAMPLE.COM',
      password: 'bobsPass456',
    });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------

describe('POST /auth/logout', () => {
  it('returns 200 when called with a valid token', async () => {
    const regRes = await post('/auth/register', {
      email: 'carol@example.com',
      password: 'carolPass789',
    });
    const { token } = (await regRes.json()) as any;

    const res = await post('/auth/logout', {}, token);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
  });

  it('returns 401 when called without a token', async () => {
    const res = await post('/auth/logout', {});
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('MISSING_TOKEN');
  });

  it('returns 401 when called with an invalid token', async () => {
    const res = await post('/auth/logout', {}, 'invalid.token.value');
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 on an expired token', async () => {
    const expiredToken = jwt.sign(
      { sub: 'abc123', email: 'carol@example.com' },
      process.env.JWT_SECRET!,
      { expiresIn: '0s' }
    );
    await new Promise((r) => setTimeout(r, 10));

    const res = await post('/auth/logout', {}, expiredToken);
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('TOKEN_EXPIRED');
  });
});

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------

describe('GET /auth/me', () => {
  it('returns authenticated user identity with a valid token', async () => {
    const regRes = await post('/auth/register', {
      email: 'dave@example.com',
      password: 'davesPass321',
    });
    const { token, user } = (await regRes.json()) as any;

    const res = await get('/auth/me', token);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.user.sub).toBe(user.id);
    expect(body.user.email).toBe('dave@example.com');
  });

  it('returns 401 with MISSING_TOKEN when no token is provided', async () => {
    const res = await get('/auth/me');
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('MISSING_TOKEN');
  });

  it('returns 401 with INVALID_TOKEN on a malformed token', async () => {
    const res = await get('/auth/me', 'malformed.token.here');
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 with TOKEN_EXPIRED on an expired token', async () => {
    const expiredToken = jwt.sign(
      { sub: 'abc123', email: 'dave@example.com' },
      process.env.JWT_SECRET!,
      { expiresIn: '0s' }
    );
    await new Promise((r) => setTimeout(r, 10));

    const res = await get('/auth/me', expiredToken);
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('TOKEN_EXPIRED');
  });
});

// ---------------------------------------------------------------------------
// Existing public endpoints remain accessible without auth
// ---------------------------------------------------------------------------

describe('Public endpoints remain accessible without auth', () => {
  it('GET /health returns 200 without a token', async () => {
    const res = await get('/health');
    expect(res.status).toBe(200);
  });

  it('GET /api/health returns 200 without a token', async () => {
    const res = await get('/api/health');
    expect(res.status).toBe(200);
  });
});
