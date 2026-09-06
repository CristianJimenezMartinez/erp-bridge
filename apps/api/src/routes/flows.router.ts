import { Router, Request, Response, NextFunction } from 'express';
import { FlowService } from '@erp-bridge/core';

export const flowsRouter = Router();
const flowService = new FlowService();

function getOrgId(req: Request): string {
  return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || 'org_default';
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
    const flow = await flowService.createFlow({
      organizationId: orgId,
      name: req.body.name,
      description: req.body.description,
      triggerEventType: req.body.triggerEventType,
      filters: req.body.filters,
      actions: req.body.actions,
      isEnabled: req.body.isEnabled,
    });
    res.status(201).json({ data: flow });
  } catch (error) {
    next(error);
  }
});

flowsRouter.put('/flows/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const flow = await flowService.toggleFlow(orgId, req.params['id']!, req.body.isEnabled);
    res.json({ data: flow });
  } catch (error) {
    next(error);
  }
});

flowsRouter.post('/flows/:id/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const result = await flowService.testFlow(orgId, req.params['id']!, req.body.sampleData || {});
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});
