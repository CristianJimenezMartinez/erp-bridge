import { Router, Request, Response, NextFunction } from 'express';
import { OrganizationService } from '@erp-bridge/core';
import { CreateOrganizationDtoSchema } from '@erp-bridge/shared';
import { requireAuth, requireRole } from './auth.router';

export const organizationsRouter = Router();
const orgService = new OrganizationService();

organizationsRouter.get('/organizations', requireAuth, requireRole(['SUPERADMIN', 'ADMIN']), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await orgService.list();
    res.json({ data: list });
  } catch (error) {
    next(error);
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
