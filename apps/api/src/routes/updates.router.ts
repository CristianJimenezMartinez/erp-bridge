import { Router, Request, Response, NextFunction } from 'express';
import { UpdateService } from '@erp-bridge/core';
import {
  UpdateCheckRequestSchema,
  UpdateConfirmRequestSchema,
  UpdateManifestSchema,
} from '@erp-bridge/shared';
import { requireAuth } from './auth.router';

export const updatesRouter = Router();
const updateService = new UpdateService();

// 1. Agent checks for updates
updatesRouter.post('/updates/check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = UpdateCheckRequestSchema.parse(req.body);
    const result = await updateService.checkForUpdates(validated);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// 2. Agent reports update result (success or rollback)
updatesRouter.post('/updates/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = UpdateConfirmRequestSchema.parse(req.body);
    const result = await updateService.recordConfirmation(validated);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// 3. Admin publishes a new update manifest (Protected)
updatesRouter.post('/updates/publish', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = UpdateManifestSchema.parse(req.body);
    const result = await updateService.publishManifest(validated);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

// 4. List update history (Protected)
updatesRouter.get('/updates/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = req.query['agentId'] as string | undefined;
    const history = await updateService.listUpdateHistory(agentId);
    res.json({ data: history });
  } catch (error) {
    next(error);
  }
});

// 5. List update manifests (Protected)
updatesRouter.get('/updates/manifests', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channel = req.query['channel'] as string | undefined;
    const manifests = await updateService.listManifests(channel);
    res.json({ data: manifests });
  } catch (error) {
    next(error);
  }
});
