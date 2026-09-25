import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRoutes } from './routes/health.routes';
import { interviewPrepRoutes } from './routes/interviewPrep.routes';
import { authRoutes } from './routes/auth.routes';
import { kitsRoutes } from './routes/kits.routes';
import { config } from './config';

export const createApp = (): Express => {
  const app = express();

  // ---------------------------------------------------------------------------
  // Reverse-proxy trust configuration
  // ---------------------------------------------------------------------------
  // Render (and most PaaS providers) deploy Express behind a load-balancer /
  // reverse-proxy that appends an X-Forwarded-For header.  express-rate-limit
  // v6+ throws a ValidationError when that header is present but Express's
  // 'trust proxy' setting is false (the default).  Setting it to 1 tells
  // Express to trust the first hop in the proxy chain, which:
  //   1. Silences the rate-limiter ValidationError that caused non-JSON
  //      "An error occurred…" text responses in production.
  //   2. Ensures rate-limit counters are keyed on the real client IP rather
  //      than the proxy/load-balancer IP.
  // The value 1 is intentional — we trust exactly one proxy (Render's edge).
  // Do NOT set this to `true` (unlimited hops) in public-internet deployments.
  app.set('trust proxy', 1);

  // Middleware
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check routes (public — no auth required)
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes);

  // Authentication routes (public — register/login must be reachable without a token)
  app.use('/auth', authRoutes);

  // Kit generation + regeneration routes (public — preserves batch evaluator contract)
  // Decision: generation itself does not require auth so the headless batch evaluator
  // (npm run evaluate) continues to work without credentials. Saving a kit requires auth.
  app.use('/api/interview-prep', interviewPrepRoutes);

  // Persistent kit CRUD routes (authenticated — all routes behind requireAuth)
  app.use('/api/kits', kitsRoutes);

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Rehearsa API Service',
      version: '1.0.0',
      description: 'Full-stack AI-powered interview preparation platform API',
      health: '/api/health',
      auth: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
        logout: 'POST /auth/logout',
        me: 'GET /auth/me',
      },
      generate: 'POST /api/interview-prep/generate',
      kits: {
        save: 'POST /api/kits',
        list: 'GET /api/kits',
        get: 'GET /api/kits/:id',
        update: 'PUT /api/kits/:id',
        delete: 'DELETE /api/kits/:id',
      },
    });
  });

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested API route does not exist.',
      },
    });
  });

  // Global Error Handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: config.isDev ? err.message : 'An unexpected error occurred.',
      },
    });
  });

  return app;
};
