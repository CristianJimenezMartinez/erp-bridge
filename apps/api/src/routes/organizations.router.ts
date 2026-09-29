import { Router, Request, Response, NextFunction } from 'express';
import { OrganizationService, DatabaseService } from '@erp-bridge/core';
import { CreateOrganizationDtoSchema } from '@erp-bridge/shared';
import { requireAuth, requireRole } from './auth.router';

export const organizationsRouter = Router();
const orgService = new OrganizationService();

organizationsRouter.get('/organizations', requireAuth, requireRole(['SUPERADMIN', 'ADMIN']), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      const result = await db.query(`
        SELECT o.id, o.name, o.slug, o.tax_id, o.legal_name, o.reseller_id, o.plan, o.status, o.created_at, o.updated_at,
               COUNT(l.id)::int as total_licenses,
               COUNT(CASE WHEN l.status = 'active' AND (l.billing_status = 'ACTIVE' OR l.billing_status IS NULL) THEN 1 END)::int as active_licenses
        FROM organizations o
        LEFT JOIN licenses l ON o.id = l.organization_id
        GROUP BY o.id, o.name, o.slug, o.tax_id, o.legal_name, o.reseller_id, o.plan, o.status, o.created_at, o.updated_at
        ORDER BY o.created_at DESC
      `).then(r => r.rows).catch(() => null);

      if (result) {
        return res.json({ data: result });
      }
    }

    const list = await orgService.list();
    return res.json({ data: list });
  } catch (error) {
    return next(error);
  }
});

organizationsRouter.post('/organizations', requireAuth, requireRole(['SUPERADMIN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = CreateOrganizationDtoSchema.parse(req.body);
    const org = await orgService.create(validated);
    res.status(201).json({ data: org });
  } catch (error) {
    next(error);
  }
});
