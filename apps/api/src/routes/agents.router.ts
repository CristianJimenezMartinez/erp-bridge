import { Router, Request, Response, NextFunction } from 'express';
import { AgentService, UpdateService } from '@erp-bridge/core';
import { AgentHeartbeatPayloadSchema, AgentPairingRequestSchema } from '@erp-bridge/shared';

export const agentsRouter = Router();
const agentService = new AgentService();
const updateService = new UpdateService();

function getOrgId(req: Request): string {
  return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || 'org_default';
}

agentsRouter.get('/agents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const list = await agentService.listAgents(orgId);
    res.json({ data: list });
  } catch (error) {
    next(error);
  }
});

agentsRouter.get('/agents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const agent = await agentService.getAgentById(orgId, req.params['id']!);
    res.json({ data: agent });
  } catch (error) {
    next(error);
  }
});

agentsRouter.post('/agents/pairing-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const tokenData = await agentService.generatePairingToken(orgId, req.body.createdById);
    res.status(201).json({ data: tokenData });
  } catch (error) {
    next(error);
  }
});

agentsRouter.post('/agents/pair', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = AgentPairingRequestSchema.parse(req.body);
    const result = await agentService.pairAgent(validated);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

agentsRouter.post('/agents/:id/heartbeat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = AgentHeartbeatPayloadSchema.parse({
      ...req.body,
      agentId: req.params['id'] || req.body.agentId,
    });
    const result = await agentService.recordHeartbeat(validated);

    // Detección inmediata piggybacked: notifica al agente en < 30 segundos
    const agentVersion = validated.version || (req.body.version as string) || '0.1.0';
    let updateAvailable = false;
    let targetVersion: string | undefined;
    let updateInfo: any = undefined;

    try {
      const check = await updateService.checkForUpdates({
        agentId: validated.agentId,
        currentVersion: agentVersion,
        platform: 'win32',
        arch: 'x64',
        channel: 'stable',
      });
      if (check.available) {
        updateAvailable = true;
        targetVersion = check.version;
        updateInfo = check;
      }
    } catch {
      // Si la tabla de manifiestos está vacía o hay fallo transitorio, continuar
    }

    res.json({
      data: {
        ...result,
        updateAvailable,
        targetVersion,
        updateInfo,
      },
    });
  } catch (error) {
    next(error);
  }
});
