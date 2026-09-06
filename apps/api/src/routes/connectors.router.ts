import { Router, Request, Response, NextFunction } from 'express';
import { ConnectorRegistry } from '@erp-bridge/core';

export const connectorsRouter = Router();

connectorsRouter.get('/connectors', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const connectors = ConnectorRegistry.getInstance().getAvailableConnectors();
    res.json({ data: connectors });
  } catch (error) {
    next(error);
  }
});
