import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { LicenseService, DatabaseService } from '@erp-bridge/core';
import {
  CreateLicenseDtoSchema,
  LicenseActivationRequestSchema,
  LicenseValidationRequestSchema,
} from '@erp-bridge/shared';
import { requireAuth, requireRole, AuthenticatedRequest } from './auth.router';

export const licensesRouter = Router();
const licenseService = new LicenseService();

function getOrgId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user && authReq.user.role === 'TENANT_CLIENT') {
    return authReq.user.organizationId;
  }
  return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || (authReq.user ? authReq.user.organizationId : 'org_default');
}

// 0. Superadmin Overview: Total de licencias pagadas vs no pagadas y facturación estimada
licensesRouter.get('/admin/licensing/overview', requireAuth, requireRole(['SUPERADMIN', 'ADMIN']), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      const stats = await db.query(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN status = 'active' AND billing_status = 'ACTIVE' THEN 1 END)::int as active_paid,
          COUNT(CASE WHEN status = 'trial' OR billing_status = 'TRIAL' THEN 1 END)::int as trials,
          COUNT(CASE WHEN status IN ('revoked', 'suspended') OR billing_status IN ('PAST_DUE', 'CANCELED') THEN 1 END)::int as unpaid_or_canceled,
          COUNT(CASE WHEN seat_type = 'BASE' THEN 1 END)::int as base_seats,
          COUNT(CASE WHEN seat_type = 'ADDITIONAL_SEAT' THEN 1 END)::int as additional_seats
        FROM licenses
      `).then(r => r.rows[0] as Record<string, any>).catch(() => null);

      const total = stats ? Number(stats['total']) : 1;
      const activePaid = stats ? Number(stats['active_paid']) : 1;
      const trials = stats ? Number(stats['trials']) : 0;
      const unpaidOrCanceled = stats ? Number(stats['unpaid_or_canceled']) : 0;
      const baseSeats = stats ? Number(stats['base_seats']) : 1;
      const additionalSeats = stats ? Number(stats['additional_seats']) : 0;
      const arr = (baseSeats * 199) + (additionalSeats * 99);
      const mrr = Math.round(arr / 12);

      return res.json({
        data: {
          total,
          activePaid,
          trials,
          unpaidOrCanceled,
          baseSeats,
          additionalSeats,
          arr,
          mrr,
        },
      });
    }

    return res.json({
      data: {
        total: 1,
        activePaid: 1,
        trials: 0,
        unpaidOrCanceled: 0,
        baseSeats: 1,
        additionalSeats: 0,
        arr: 199,
        mrr: 17,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// 0.1 Partner/Reseller: Cartera de clientes asignados a la empresa instaladora
licensesRouter.get('/partner/clients', requireAuth, requireRole(['RESELLER', 'SUPERADMIN', 'ADMIN']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const resellerCode = req.user?.resellerId || req.user?.sub;
    const isSuper = req.user?.role === 'SUPERADMIN' || req.user?.role === 'ADMIN';
    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      const clients = await db.query(`
        SELECT o.id, o.name, o.tax_id, o.legal_name, o.reseller_id, o.created_at,
               COUNT(l.id)::int as total_licenses,
               COUNT(CASE WHEN l.status = 'active' THEN 1 END)::int as active_licenses
        FROM organizations o
        LEFT JOIN licenses l ON o.id = l.organization_id
        WHERE ($1 = true) OR (o.reseller_id = $2)
        GROUP BY o.id, o.name, o.tax_id, o.legal_name, o.reseller_id, o.created_at
        ORDER BY o.created_at DESC
      `, [isSuper, resellerCode]).then(r => r.rows).catch(() => []);

      return res.json({ data: clients });
    }
    return res.json({ data: [] });
  } catch (error) {
    return next(error);
  }
});

// 0.2 Partner/Reseller: Emisión de Licencia Base para nuevo cliente
licensesRouter.post('/partner/licenses/issue', requireAuth, requireRole(['RESELLER', 'SUPERADMIN', 'ADMIN']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { clientName, clientTaxId, alias } = req.body as {
      clientName?: string;
      clientTaxId?: string;
      alias?: string;
    };
    if (!clientName || !clientTaxId) {
      return res.status(400).json({ error: { message: 'El nombre de la empresa y su CIF/NIF son obligatorios' } });
    }

    const cleanTaxId = clientTaxId.trim().toUpperCase();
    const orgId = `org_${crypto.createHash('md5').update(cleanTaxId).digest('hex').substring(0, 10)}`;
    const resellerCode = req.user?.resellerId || req.user?.sub || 'PT-DIRECT';

    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      await db.query(`
        INSERT INTO organizations (id, name, slug, status, plan, tax_id, legal_name, reseller_id)
        VALUES ($1, $2, $3, 'ACTIVE', 'standard', $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET tax_id = $4, legal_name = $5, reseller_id = $6
      `, [orgId, clientName, cleanTaxId.toLowerCase(), cleanTaxId, clientName, resellerCode]).catch(() => {});
    }

    const license = await licenseService.createLicense({
      organizationId: orgId,
      plan: 'starter',
      alias: alias || `Licencia ${clientName}`,
      maxActivations: 1,
    });

    if (db.isAvailable()) {
      await db.query(`
        UPDATE licenses 
        SET seat_type = 'BASE', tax_id = $1, billing_status = 'ACTIVE'
        WHERE id = $2
      `, [cleanTaxId, license.id]).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      data: {
        ...license,
        seatType: 'BASE',
        taxId: cleanTaxId,
        organizationId: orgId,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// 0.3 Cliente Final: Vista de su propia licencia, vencimiento y descarga
licensesRouter.get('/client/my-license', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sub = req.user?.sub;
    const orgId = req.user?.organizationId || 'org_default';

    let license = null;
    if (sub && sub.startsWith('EB-')) {
      license = await licenseService.getLicenseByKey(sub);
    } else if (orgId) {
      const list = await licenseService.listLicenses(orgId);
      license = list[0] || null;
    }

    if (!license) {
      return res.status(404).json({ error: { message: 'No se encontró ninguna licencia para esta sesión' } });
    }

    const activations = await licenseService.listActivations(license.id);
    return res.json({
      data: {
        ...license,
        activations,
        installerUrl: '/releases/v0.3.0/Bentian-Setup-v0.3.0.exe',
      },
    });
  } catch (error) {
    return next(error);
  }
});

// 1. List all licenses for organization (with activations)
licensesRouter.get('/licenses', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    // Si es superadmin y no se filtra por org, puede ver todas
    if ((req.user?.role === 'SUPERADMIN' || req.user?.role === 'ADMIN') && !req.query['organizationId']) {
      const list = await licenseService.listLicenses(orgId);
      return res.json({ data: list });
    }
    const list = await licenseService.listLicensesWithActivations(orgId);
    return res.json({ data: list });
  } catch (error) {
    return next(error);
  }
});

// 1.1 Fleet Overview KPI summary
licensesRouter.get('/licenses/fleet-overview', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const overview = await licenseService.getFleetOverview(orgId);
    return res.json({ data: overview });
  } catch (error) {
    return next(error);
  }
});

// 2. Create a new license (con Blindaje Fiscal Anti-Arbitraje de Puesto Adicional 99€)
licensesRouter.post('/licenses', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const seatType = (req.body.seatType as string) || 'BASE';
    const taxId = (req.body.taxId as string)?.trim().toUpperCase() || null;
    const parentLicenseKey = (req.body.parentLicenseKey as string)?.trim() || null;
    let parentLicenseId = (req.body.parentLicenseId as string) || null;

    // Regla de la Tríada Fiscal para puestos adicionales de 99€
    if (seatType === 'ADDITIONAL_SEAT') {
      if (!parentLicenseKey && !parentLicenseId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARENT_LICENSE',
            message: 'Un puesto adicional (99€) debe pertenecer obligatoriamente a una Licencia Base activa (indica parentLicenseKey o parentLicenseId).',
          },
        });
      }

      const parentLicense = parentLicenseKey
        ? await licenseService.getLicenseByKey(parentLicenseKey)
        : await licenseService.getLicenseById(parentLicenseId!);

      if (!parentLicense) {
        return res.status(400).json({
          error: {
            code: 'PARENT_NOT_FOUND',
            message: 'La Licencia Base padre indicada no existe en el sistema.',
          },
        });
      }

      if (parentLicense.status !== 'active') {
        return res.status(400).json({
          error: {
            code: 'PARENT_NOT_ACTIVE',
            message: 'La Licencia Base padre no se encuentra activa.',
          },
        });
      }

      parentLicenseId = parentLicense.id;
    }

    const validated = CreateLicenseDtoSchema.parse({
      ...req.body,
      organizationId: req.body.organizationId || orgId,
    });
    const license = await licenseService.createLicense(validated);

    // Guardar metadata fiscal en Postgres
    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      await db.query(`
        UPDATE licenses
        SET seat_type = $1, parent_license_id = $2, tax_id = $3, billing_status = 'ACTIVE'
        WHERE id = $4
      `, [seatType, parentLicenseId, taxId, license.id]).catch(() => {});
    }

    return res.status(201).json({
      data: {
        ...license,
        seatType,
        parentLicenseId,
        taxId,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// 2.1 Update license alias
licensesRouter.patch('/licenses/:id/alias', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id']!;
    const { alias } = req.body as { alias: string };
    if (!alias || typeof alias !== 'string') {
      return res.status(400).json({ error: { message: 'El alias no puede estar vacío' } });
    }
    await licenseService.updateLicenseAlias(id, alias.trim());
    return res.json({ success: true, id, alias: alias.trim() });
  } catch (error) {
    return next(error);
  }
});

// 2.2 Unbind machine activation (Mudar PC)
licensesRouter.post('/licenses/:id/unbind', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id']!;
    const { hwid } = req.body as { hwid: string };
    if (!hwid) {
      return res.status(400).json({ error: { message: 'Se requiere el HWID de la máquina a desvincular' } });
    }
    const result = await licenseService.unbindMachine(id, hwid);
    if (!result.success) {
      return res.status(400).json({ error: { message: result.message } });
    }
    return res.json({ data: result });
  } catch (error) {
    return next(error);
  }
});

// 3. Get license details and its activations
licensesRouter.get('/licenses/:key', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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

// 4. Activate a license from an Agent (con Comprobación Fiscal en Factusol para Puestos de 99€)
licensesRouter.post('/licenses/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = LicenseActivationRequestSchema.parse(req.body);

    // Extraer CIF de Factusol si el agente lo proporciona en machineInfo
    const machineInfo = req.body.machineInfo as Record<string, any> | undefined;
    const companyCif = (req.body.companyCif as string || machineInfo?.companyCif as string || machineInfo?.nif as string)?.trim().toUpperCase();

    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      const licRow = await db.query(
        `SELECT id, seat_type, tax_id FROM licenses WHERE key = $1`,
        [validated.licenseKey]
      ).then(r => r.rows[0] as Record<string, any> | undefined).catch(() => undefined);

      if (licRow && licRow['seat_type'] === 'ADDITIONAL_SEAT' && licRow['tax_id']) {
        const expectedTaxId = (licRow['tax_id'] as string).trim().toUpperCase();
        if (companyCif && companyCif !== expectedTaxId) {
          return res.status(403).json({
            error: {
              code: 'ERR_TAX_ID_MISMATCH',
              message: `Esta licencia es un puesto adicional ligado al CIF ${expectedTaxId}. No puede activarse en una empresa con CIF diferente (${companyCif}). Para una nueva empresa debe contratar una Licencia Base independiente (199€).`,
            },
          });
        }
      }
    }

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
licensesRouter.post('/licenses/:id/revoke', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reason = (req.body.reason as string) || 'Revocada por el administrador';
    const revoked = await licenseService.revokeLicense(req.params['id']!, reason);
    res.json({ data: revoked });
  } catch (error) {
    next(error);
  }
});
