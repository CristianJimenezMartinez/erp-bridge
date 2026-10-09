import { Router, Request, Response } from 'express';
import { DatabaseService } from '@erp-bridge/core';
import { getLatestReleasedVersion } from '../utils/version.util';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  const dbHealth = await DatabaseService.getInstance().checkHealth();
  const isHealthy = dbHealth.healthy;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'OK' : 'DEGRADED',
    version: getLatestReleasedVersion(),
    timestamp: new Date().toISOString(),
  });
});
