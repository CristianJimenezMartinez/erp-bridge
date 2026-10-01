import { Router, Request, Response, NextFunction } from 'express';
import { AuditService } from '@erp-bridge/core';
import { requireAuth, requireRole, AuthenticatedRequest } from './auth.router';

export const auditRouter = Router();
const auditService = new AuditService();

function getOrgId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user && authReq.user.role === 'TENANT_CLIENT') {
    return authReq.user.organizationId;
  }
  return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || (authReq.user ? authReq.user.organizationId : 'org_default');
}

auditRouter.get('/audit-logs', requireAuth, requireRole(['SUPERADMIN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const explicitOrg = (req.query['organizationId'] as string) || (req.headers['x-organization-id'] as string);
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 100;
    const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : 0;

    let logs;
    if (!explicitOrg && (authReq.user?.role === 'SUPERADMIN' || authReq.user?.role === 'ADMIN')) {
      logs = await auditService.listAllLogs(limit);
    } else {
      const orgId = explicitOrg || authReq.user?.organizationId || 'org_default';
      logs = await auditService.listLogs(orgId, limit, offset);
    }
    res.json({ data: logs });
  } catch (error) {
    next(error);
  }
});

auditRouter.get('/events', requireAuth, requireRole(['SUPERADMIN', 'ADMIN']), (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;
    const events = auditService.listEvents(orgId, limit);
    res.json({ data: events });
  } catch (error) {
    next(error);
  }
});
