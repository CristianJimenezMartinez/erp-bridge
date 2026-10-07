import { Router, Request, Response, NextFunction } from 'express';
import { ConnectionService } from '@erp-bridge/core';
import {
  CreateConnectionDtoSchema,
  TestConnectionDtoSchema,
  UpdateConnectionDtoSchema,
} from '@erp-bridge/shared';
import { requireAuth, AuthenticatedRequest } from './auth.router';
import { resolveOrgId } from './org-scope';

export const connectionsRouter = Router();
const connectionService = new ConnectionService();

// Require JWT authentication for all connection operations
connectionsRouter.use('/connections', requireAuth);

// Helper to extract organizationId header or fallback
function getOrgId(req: Request): string {
  return resolveOrgId(req);
}

connectionsRouter.get('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const list = await connectionService.list(orgId);
    res.json({ data: list });
  } catch (error) {
    next(error);
  }
});

connectionsRouter.post('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const authReq = req as AuthenticatedRequest;
    const isSuper = authReq.user?.role === 'SUPERADMIN' || authReq.user?.role === 'ADMIN';
    const targetOrgId = isSuper && req.body.organizationId ? req.body.organizationId : orgId;
    const body = { ...req.body, organizationId: targetOrgId };
    const validated = CreateConnectionDtoSchema.parse(body);
    const conn = await connectionService.create(validated);
    res.status(201).json({ data: conn });
  } catch (error) {
    next(error);
  }
});

connectionsRouter.get('/connections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const conn = await connectionService.getById(orgId, req.params['id']!);
    res.json({ data: conn });
  } catch (error) {
    next(error);
  }
});

connectionsRouter.put('/connections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const authReq = req as AuthenticatedRequest;
    const isSuper = authReq.user?.role === 'SUPERADMIN' || authReq.user?.role === 'ADMIN';
    const body = { ...req.body };
    if (!isSuper && 'organizationId' in body) {
      body.organizationId = orgId;
    }
    const validated = UpdateConnectionDtoSchema.parse(body);
    const conn = await connectionService.update(orgId, req.params['id']!, validated);
    res.json({ data: conn });
  } catch (error) {
    next(error);
  }
});

connectionsRouter.delete('/connections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const success = await connectionService.delete(orgId, req.params['id']!);
    res.json({ success });
  } catch (error) {
    next(error);
  }
});

connectionsRouter.post('/connections/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = TestConnectionDtoSchema.parse(req.body);
    const result = await connectionService.testConnection(
      validated.connectorId,
      validated.configuration,
      validated.credentials
    );
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

connectionsRouter.post('/connections/:id/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const result = await connectionService.testExistingConnection(orgId, req.params['id']!);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});
