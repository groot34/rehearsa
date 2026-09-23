import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRoutes } from './routes/health.routes';
import { interviewPrepRoutes } from './routes/interviewPrep.routes';
import { authRoutes } from './routes/auth.routes';
import { kitsRoutes } from './routes/kits.routes';
import { config } from './config';

export const createApp = (): Express => {
  const app = express();

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
