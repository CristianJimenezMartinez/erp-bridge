import { Router, Request, Response, NextFunction } from 'express';
import { ConnectionService } from '@erp-bridge/core';
import {
  CreateConnectionDtoSchema,
  TestConnectionDtoSchema,
  UpdateConnectionDtoSchema,
} from '@erp-bridge/shared';

export const connectionsRouter = Router();
const connectionService = new ConnectionService();

// Helper to extract organizationId header or fallback
function getOrgId(req: Request): string {
  return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || 'org_default';
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
    const body = { ...req.body, organizationId: req.body.organizationId || orgId };
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
    const validated = UpdateConnectionDtoSchema.parse(req.body);
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
