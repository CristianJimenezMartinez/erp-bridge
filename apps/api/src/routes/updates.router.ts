import { Router, Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { UpdateService, compareSemver } from '@erp-bridge/core';
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
    let result = await updateService.checkForUpdates(validated);

    // Fallback de alta resiliencia: Si la base de datos no tiene una versión superior, comprobar releases/latest.json en disco
    if (!result.available) {
      try {
        const candidatePaths = [
          path.resolve(__dirname, '../../../../releases/latest.json'),
          path.resolve(__dirname, '../../../releases/latest.json'),
          path.resolve(process.cwd(), 'releases/latest.json'),
          '/app/releases/latest.json',
        ];
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            const latestData = JSON.parse(fs.readFileSync(p, 'utf8'));
            const manifest = latestData.stable || latestData;
            if (manifest && manifest.version && compareSemver(manifest.version, validated.currentVersion) > 0) {
              result = {
                available: true,
                version: manifest.version,
                downloadUrl: manifest.downloadUrl,
                sha256: manifest.sha256,
                signature: manifest.signature,
                fileSize: manifest.fileSize,
                releaseNotes: manifest.releaseNotes,
                mandatory: manifest.mandatory,
                minVersion: manifest.minVersion,
                channel: manifest.channel || 'stable',
              };
              break;
            }
          }
        }
      } catch {}
    }

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
