import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRoutes } from './routes/health.routes';
import { config } from './config';

export const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check routes
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes);

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Rehearsa API Service',
      version: '1.0.0',
      description: 'Full-stack AI-powered interview preparation platform API',
      health: '/api/health',
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
