import { Router, Request, Response, NextFunction } from 'express';
import { LicenseService } from '@erp-bridge/core';
import {
  CreateLicenseDtoSchema,
  LicenseActivationRequestSchema,
  LicenseValidationRequestSchema,
} from '@erp-bridge/shared';

export const licensesRouter = Router();
const licenseService = new LicenseService();

function getOrgId(req: Request): string {
  return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || 'org_default';
}

// 1. List all licenses for organization
licensesRouter.get('/licenses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const list = await licenseService.listLicenses(orgId);
    res.json({ data: list });
  } catch (error) {
    next(error);
  }
});

// 2. Create a new license
licensesRouter.post('/licenses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const validated = CreateLicenseDtoSchema.parse({
      ...req.body,
      organizationId: req.body.organizationId || orgId,
    });
    const license = await licenseService.createLicense(validated);
    res.status(201).json({ data: license });
  } catch (error) {
    next(error);
  }
});

// 3. Get license details and its activations
licensesRouter.get('/licenses/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params['key']!;
    const license = await licenseService.getLicenseByKey(key);
    if (!license) {
      return res.status(404).json({ error: { message: 'Licencia no encontrada' } });
    }
    const activations = await licenseService.listActivations(license.id);
    return res.json({ data: { ...license, activations } });
  } catch (error) {
    return next(error);
  }
});

// 4. Activate a license from an Agent
licensesRouter.post('/licenses/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = LicenseActivationRequestSchema.parse(req.body);
    const result = await licenseService.activateLicense(validated);
    if (!result.success) {
      return res.status(400).json({ error: { message: result.error } });
    }
    return res.status(200).json({ data: result });
  } catch (error) {
    return next(error);
  }
});

// 5. Periodic token validation and renewal from an Agent
licensesRouter.post('/licenses/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = LicenseValidationRequestSchema.parse(req.body);
    const result = await licenseService.validateLicense(validated);
    if (!result.valid) {
      return res.status(403).json({ error: { message: result.message }, data: result });
    }
    return res.status(200).json({ data: result });
  } catch (error) {
    return next(error);
  }
});

// 6. Deactivate a machine activation
licensesRouter.post('/licenses/deactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { licenseKey, hwid } = req.body as { licenseKey: string; hwid: string };
    if (!licenseKey || !hwid) {
      return res.status(400).json({ error: { message: 'Se requiere licenseKey y hwid' } });
    }
    const result = await licenseService.deactivateLicense(licenseKey, hwid);
    if (!result.success) {
      return res.status(400).json({ error: { message: result.message } });
    }
    return res.json({ data: result });
  } catch (error) {
    return next(error);
  }
});

// 7. Revoke license (admin)
licensesRouter.post('/licenses/:id/revoke', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reason = (req.body.reason as string) || 'Revocada por el administrador';
    const revoked = await licenseService.revokeLicense(req.params['id']!, reason);
    res.json({ data: revoked });
  } catch (error) {
    next(error);
  }
});
