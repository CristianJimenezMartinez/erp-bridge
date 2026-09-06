import { Router, Request, Response, NextFunction } from 'express';
import { AuditService } from '@erp-bridge/core';

export const auditRouter = Router();
const auditService = new AuditService();

function getOrgId(req: Request): string {
  return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || 'org_default';
}

auditRouter.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 100;
    const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0;
    const logs = await auditService.listLogs(orgId, limit, offset);
    res.json({ data: logs });
  } catch (error) {
    next(error);
  }
});

auditRouter.get('/events', (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;
    const events = auditService.listEvents(orgId, limit);
    res.json({ data: events });
  } catch (error) {
    next(error);
  }
});
