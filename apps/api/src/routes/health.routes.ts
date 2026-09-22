import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'rehearsa-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  });
});

export const healthRoutes = router;
