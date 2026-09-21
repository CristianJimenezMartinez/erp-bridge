import { Router, Request, Response, NextFunction } from 'express';
import { AgentService, UpdateService, DatabaseService } from '@erp-bridge/core';
import { AgentHeartbeatPayloadSchema, AgentPairingRequestSchema } from '@erp-bridge/shared';
import { requireAuth, requireRole, AuthenticatedRequest } from './auth.router';

export const agentsRouter = Router();
const agentService = new AgentService();
const updateService = new UpdateService();

function getOrgId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user && authReq.user.role === 'TENANT_CLIENT') {
    return authReq.user.organizationId;
  }
  return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || (authReq.user ? authReq.user.organizationId : 'org_default');
}

// 1. List agents (Protected)
agentsRouter.get('/agents', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    // Superadmin puede listar todos si no se especifica org
    if ((req.user?.role === 'SUPERADMIN' || req.user?.role === 'ADMIN') && !req.query['organizationId']) {
      const all = await agentService.listAllAgents();
      return res.json({ data: all });
    }
    const list = await agentService.listAgents(orgId);
    return res.json({ data: list });
  } catch (error) {
    return next(error);
  }
});

// 2. Get agent details (Protected)
agentsRouter.get('/agents/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const agent = await agentService.getAgentById(orgId, req.params['id']!);
    return res.json({ data: agent });
  } catch (error) {
    return next(error);
  }
});

// 2.1 Get fleet errors for Superadmin
agentsRouter.get('/admin/fleet/errors', requireAuth, requireRole(['SUPERADMIN', 'ADMIN']), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      const result = await db.query(
        `SELECT e.id, e.agent_id, e.organization_id, e.error_code, e.message, e.details, e.resolved, e.created_at,
                a.name as agent_name, a.platform, o.name as org_name
         FROM fleet_error_events e
         LEFT JOIN agents a ON e.agent_id = a.id
         LEFT JOIN organizations o ON e.organization_id = o.id
         ORDER BY e.created_at DESC
         LIMIT 100`
      ).catch(() => ({ rows: [] }));
      return res.json({ data: result.rows });
    }
    return res.json({ data: [] });
  } catch (error) {
    return next(error);
  }
});

// 2.2 Report agent error event (from Agent or local monitor)
agentsRouter.post('/fleet/report-error', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentId, organizationId, errorCode, message, details } = req.body as {
      agentId?: string;
      organizationId?: string;
      errorCode?: string;
      message?: string;
      details?: any;
    };
    if (!errorCode || !message) {
      return res.status(400).json({ error: { message: 'errorCode y message son requeridos' } });
    }
    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      await db.query(
        `INSERT INTO fleet_error_events (agent_id, organization_id, error_code, message, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [agentId || null, organizationId || 'org_default', errorCode, message, details ? JSON.stringify(details) : null]
      ).catch(() => {});
    }
    return res.status(201).json({ success: true });
  } catch (error) {
    return next(error);
  }
});

// 3. Generate pairing token (Protected)
agentsRouter.post('/agents/pairing-token', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const tokenData = await agentService.generatePairingToken(orgId, req.body.createdById);
    return res.status(201).json({ data: tokenData });
  } catch (error) {
    return next(error);
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
