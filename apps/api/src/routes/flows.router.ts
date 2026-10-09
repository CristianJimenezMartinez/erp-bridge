import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FlowService } from '@erp-bridge/core';
import { requireAuth } from './auth.router';
import { resolveOrgId } from './org-scope';

const CreateFlowSchema = z.object({
  name: z.string().trim().min(1, 'El nombre del flujo es obligatorio').max(100),
  description: z.string().trim().max(500).optional(),
  triggerEventType: z.string().trim().min(1, 'triggerEventType es obligatorio').max(100),
  filters: z.array(z.any()).optional(),
  actions: z.array(z.any()).min(1, 'Al menos una acción es obligatoria'),
  isEnabled: z.boolean().optional(),
});

const ToggleFlowSchema = z.object({
  isEnabled: z.boolean(),
});

const TestFlowSchema = z.object({
  sampleData: z.record(z.any()).optional(),
});

export const flowsRouter = Router();
const flowService = new FlowService();

flowsRouter.use('/flows', requireAuth);

function getOrgId(req: Request): string {
  return resolveOrgId(req);
}

flowsRouter.get('/flows', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const list = await flowService.listFlows(orgId);
    res.json({ data: list });
  } catch (error) {
    next(error);
  }
});

flowsRouter.get('/flows/executions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const flowId = req.query['flowId'] as string | undefined;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;
    const list = await flowService.listExecutions(orgId, flowId, limit);
    res.json({ data: list });
  } catch (error) {
    next(error);
  }
});

flowsRouter.get('/flows/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const flow = await flowService.getFlowById(orgId, req.params['id']!);
    res.json({ data: flow });
  } catch (error) {
    next(error);
  }
});

flowsRouter.post('/flows', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const body = CreateFlowSchema.parse(req.body);
    const flow = await flowService.createFlow({
      organizationId: orgId,
      name: body.name,
      description: body.description,
      triggerEventType: body.triggerEventType as any,
      filters: body.filters,
      actions: body.actions,
      isEnabled: body.isEnabled,
    });
    res.status(201).json({ data: flow });
  } catch (error) {
    next(error);
  }
});

flowsRouter.put('/flows/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const body = ToggleFlowSchema.parse(req.body);
    const flow = await flowService.toggleFlow(orgId, req.params['id']!, body.isEnabled);
    res.json({ data: flow });
  } catch (error) {
    next(error);
  }
});

flowsRouter.post('/flows/:id/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const body = TestFlowSchema.parse(req.body || {});
    const result = await flowService.testFlow(orgId, req.params['id']!, body.sampleData || {});
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});
