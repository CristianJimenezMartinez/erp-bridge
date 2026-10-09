import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { LicenseService, DatabaseService, LicenseTokenManager, LicenseKeyGenerator } from '@erp-bridge/core';
import {
  CreateLicenseDtoSchema,
  LicenseActivationRequestSchema,
  LicenseValidationRequestSchema,
  Logger,
} from '@erp-bridge/shared';
import { requireAuth, requireRole, AuthenticatedRequest, computeOrganizationIdFromEmail } from './auth.router';
import { resolveOrgId } from './org-scope';
import { withKeyedLock } from '../middleware/keyed-mutex';
import { getLatestInstallerUrl } from '../utils/version.util';
import { MailerService } from '../services/mailer.service';
import { rateLimit, consumeRateLimit } from '../middleware/rate-limit';
import { LicenseProofService } from '../services/license-proof.service';

const PartnerIssueLicenseSchema = z.object({
  clientName: z.string().trim().min(1, 'El nombre de la empresa es obligatorio').max(100),
  clientTaxId: z.string().trim().min(1, 'El CIF/NIF es obligatorio').max(50),
  alias: z.string().trim().max(80).optional(),
});

const BetaClaimSchema = z.object({
  email: z.string().trim().email('El correo electrónico no es válido').max(200),
  companyName: z.string().trim().max(100).optional(),
  taxId: z.string().trim().max(50).optional(),
  consentTerms: z.boolean().optional(),
  consentMarketing: z.boolean().optional(),
});

const UpdateAliasSchema = z.object({
  alias: z.string().trim().min(1, 'El alias debe tener entre 1 y 80 caracteres').max(80)
    .refine((val) => !/[<>"'`]/.test(val), {
      message: 'El alias no debe contener caracteres especiales (<, >, ", \', `)',
    }),
});

const UnbindMachineSchema = z.object({
  hwid: z.string().trim().regex(/^[A-Za-z0-9_-]{16,64}$/, 'HWID con formato no válido (debe ser alfanumérico entre 16 y 64 caracteres)'),
});

const DeactivateLicenseSchema = z.object({
  licenseKey: z.string().trim().min(1, 'Se requiere licenseKey'),
  hwid: z.string().trim().min(1, 'Se requiere hwid'),
});

export const licensesRouter = Router();
const logger = new Logger('LicensesRouter');
const licenseService = new LicenseService();

/**
 * Deriva una prueba Ed25519 a partir de un token HS256 ya verificado por el servidor.
 * Devuelve undefined si el servidor no tiene clave de firma (modo compatible) o el token no es válido.
 */
function buildLicenseProof(token?: string): { payload: string; signature: string } | undefined {
  if (!token || !LicenseProofService.isConfigured()) return undefined;
  const verification = LicenseTokenManager.verifyToken(token);
  if (!verification.valid || !verification.payload) return undefined;
  const p = verification.payload;
  return LicenseProofService.sign({
    licenseId: p.licenseId,
    hwid: p.hwid,
    plan: String(p.plan),
    issuedAt: p.issuedAt,
    expiresAt: p.expiresAt,
  }) || undefined;
}

function getOrgId(req: Request): string {
  return resolveOrgId(req);
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
          COUNT(CASE WHEN seat_type = 'BASE' OR seat_type IS NULL THEN 1 END)::int as base_seats
        FROM licenses
      `).then(r => r.rows[0] as Record<string, any>).catch(() => null);

      const total = stats ? Number(stats['total']) : 1;
      const activePaid = stats ? Number(stats['active_paid']) : 1;
      const trials = stats ? Number(stats['trials']) : 0;
      const unpaidOrCanceled = stats ? Number(stats['unpaid_or_canceled']) : 0;
      const baseSeats = stats ? Number(stats['base_seats']) : 1;
      const additionalSeats = 0;
      const arr = activePaid * 199;
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
    const parsed = PartnerIssueLicenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { message: 'El nombre de la empresa y su CIF/NIF son obligatorios' } });
    }
    const { clientName, clientTaxId, alias } = parsed.data;

    const cleanTaxId = clientTaxId.trim().toUpperCase();
    const orgId = `org_${crypto.createHash('sha256').update(cleanTaxId).digest('hex').substring(0, 24)}`;
    const resellerCode = req.user?.resellerId || req.user?.sub || 'PT-DIRECT';
    const isSuperadmin = req.user?.role === 'SUPERADMIN' || req.user?.role === 'ADMIN';

    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      // API-011: Prevenir robo de organizaciones entre distribuidores
      const existingOrg = await db.query(
        `SELECT id, reseller_id FROM organizations WHERE id = $1 OR tax_id = $2 LIMIT 1`,
        [orgId, cleanTaxId]
      ).then(r => r.rows[0] as { id: string; reseller_id?: string } | undefined).catch(() => undefined);

      if (existingOrg && existingOrg.reseller_id && existingOrg.reseller_id !== resellerCode && !isSuperadmin) {
        return res.status(403).json({
          error: {
            message: 'La organización indicada ya está vinculada a otro distribuidor autorizado.',
            code: 'ORGANIZATION_BELONGS_TO_OTHER_RESELLER',
          }
        });
      }

      // API-011: Cuota máxima de licencias de prueba activas por distribuidor
      if (!isSuperadmin) {
        const countRes = await db.query(
          `SELECT COUNT(*)::int as count FROM licenses WHERE reseller_id = $1 AND plan = 'trial' AND status = 'active'`,
          [resellerCode]
        ).catch(() => ({ rows: [{ count: 0 }] }));
        const activeTrials = countRes.rows[0]?.count || 0;
        if (activeTrials >= 20) {
          return res.status(429).json({
            error: {
              message: 'Has alcanzado el cupo máximo de 20 licencias de prueba activas simultáneas. Contacta con soporte para ampliar tu cuota.',
              code: 'TRIAL_QUOTA_EXCEEDED',
            }
          });
        }
      }

      await db.query(`
        INSERT INTO organizations (id, name, slug, status, plan, tax_id, legal_name, reseller_id, created_at, updated_at)
        VALUES ($1, $2, $3, 'ACTIVE', 'standard', $4, $5, $6, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
          tax_id = COALESCE(organizations.tax_id, $4), 
          legal_name = COALESCE(organizations.legal_name, $5), 
          reseller_id = COALESCE(organizations.reseller_id, $6),
          updated_at = NOW()
        WHERE organizations.reseller_id IS NULL OR organizations.reseller_id = $6
      `, [orgId, clientName, cleanTaxId.toLowerCase(), cleanTaxId, clientName, resellerCode]).catch(() => {});
    }

    const plan = isSuperadmin ? 'starter' : 'trial';
    const trialDays = isSuperadmin ? undefined : 15;
    const billingStatus = isSuperadmin ? 'ACTIVE' : 'TRIAL';

    const license = await licenseService.createLicense({
      organizationId: orgId,
      plan,
      trialDays,
      alias: alias || (isSuperadmin ? `Licencia ${clientName}` : `Evaluación 15d - ${clientName}`),
      maxActivations: 1,
    });

    if (db.isAvailable()) {
      await db.query(`
        UPDATE licenses 
        SET seat_type = 'BASE', tax_id = $1, billing_status = $2, reseller_id = $3
        WHERE id = $4
      `, [cleanTaxId, billingStatus, resellerCode, license.id]).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      data: {
        ...license,
        seatType: 'BASE',
        taxId: cleanTaxId,
        organizationId: orgId,
        billingStatus,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// 0.2.1 Beta Pública: Reclamar clave con caducidad garantizada hasta el 31 de Diciembre de 2026
licensesRouter.post('/licenses/beta/claim', rateLimit({ name: 'beta-claim', windowMs: 60 * 60 * 1000, max: 10, message: 'Demasiadas solicitudes de clave desde esta conexión. Inténtalo más tarde.' }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const BETA_END_DATE_ISO = '2026-12-31T23:59:59.999Z';
    const betaEndTime = new Date(BETA_END_DATE_ISO).getTime();

    // 0. Comprobar fecha límite oficial de la campaña
    if (Date.now() > betaEndTime) {
      return res.status(400).json({ error: { message: 'El periodo de Beta Pública Abierta finalizó el 31 de Diciembre de 2026.' } });
    }

    const parsed = BetaClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { message: 'El correo electrónico es obligatorio para solicitar la clave de la Beta.' } });
    }

    const { email, companyName, taxId, consentTerms, consentMarketing } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    if (consentTerms !== true) {
      return res.status(400).json({ error: { message: 'Debes aceptar los Términos del Servicio y la Política de Privacidad para solicitar tu clave de la Beta.' } });
    }

    return await withKeyedLock(`claim:${normalizedEmail}`, async () => {
      const isMarketingConsented = Boolean(consentMarketing);
      const trialDays = Math.max(1, Math.ceil((betaEndTime - Date.now()) / (1000 * 60 * 60 * 24)));
      const betaExpiresAt = new Date(BETA_END_DATE_ISO);

      const orgId = computeOrganizationIdFromEmail(normalizedEmail);
      const cleanTaxId = taxId ? taxId.trim().toUpperCase() : null;
      const cleanCompanyName = companyName ? companyName.trim() : (normalizedEmail.split('@')[0] || 'Empresa Beta');

      const db = DatabaseService.getInstance();

    // 1. Asegurar persistencia y trazabilidad de consentimientos RGPD en PostgreSQL (tabla beta_leads)
    if (db.isAvailable()) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS beta_leads (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          company_name VARCHAR(255),
          tax_id VARCHAR(64),
          license_key VARCHAR(128),
          license_id VARCHAR(64),
          consent_terms BOOLEAN NOT NULL DEFAULT true,
          consent_marketing BOOLEAN NOT NULL DEFAULT false,
          consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ip_address VARCHAR(128),
          user_agent TEXT
        )
      `).catch(() => {});
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || req.ip || null;
    const clientUserAgent = (req.headers['user-agent'] as string) || null;

    // 2. Anti-Abuso e Idempotencia: Comprobar si ya existe una licencia activa emitida para este email/organización
    let existingLicense: any = null;
    if (db.isAvailable()) {
      const resExisting = await db.query(`
        SELECT l.* 
        FROM licenses l
        JOIN organizations o ON l.organization_id = o.id
        WHERE o.id = $1 OR o.slug = $2
        ORDER BY l.created_at DESC
        LIMIT 1
      `, [orgId, normalizedEmail]).catch(() => ({ rows: [] }));

      if (resExisting && resExisting.rows && resExisting.rows.length > 0) {
        existingLicense = resExisting.rows[0];
      }
    }

    if (!existingLicense) {
      const orgLicenses = await licenseService.listLicenses(orgId).catch(() => []);
      if (orgLicenses.length > 0) {
        existingLicense = orgLicenses[0];
      }
    }

    // Registrar o actualizar trazabilidad del lead en beta_leads
    if (db.isAvailable()) {
      const leadId = `lead_${crypto.randomUUID()}`;
      await db.query(`
        INSERT INTO beta_leads (id, email, company_name, tax_id, license_key, license_id, consent_terms, consent_marketing, consented_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
      `, [
        leadId,
        normalizedEmail,
        cleanCompanyName,
        cleanTaxId,
        existingLicense ? (existingLicense.key || null) : null,
        existingLicense ? (existingLicense.id || null) : null,
        true,
        isMarketingConsented,
        clientIp,
        clientUserAgent,
      ]).catch(() => {});
    }

    // Si ya existe una licencia NO se devuelve la clave en la respuesta HTTP (cualquiera que
    // conozca el email podría obtenerla). Solo se reenvía al buzón del propietario del email.
    if (existingLicense) {
      const rawExpiresAt = existingLicense.expires_at || existingLicense.expiresAt;
      const expiresAtDate = rawExpiresAt ? new Date(rawExpiresAt) : betaExpiresAt;
      const daysRemaining = Math.max(0, Math.ceil((expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

      const resend = consumeRateLimit('beta-claim-resend', normalizedEmail, 60 * 60 * 1000, 1);
      if (resend.allowed && existingLicense.key) {
        try {
          await MailerService.sendLicenseWelcomeEmail({
            customerEmail: normalizedEmail,
            licenseKey: existingLicense.key,
            planName: 'Tu clave de activación de Bentian (Beta Pública hasta 31/12/2026)',
            alias: existingLicense.alias || 'Licencia Bentian',
            companyName: existingLicense.alias || cleanCompanyName,
          });
        } catch (_mailErr) {
          // Si el servicio de correo no está disponible, continuar sin fallar la petición
        }
      }

      return res.json({
        success: true,
        alreadyClaimed: true,
        message: 'Ya existe una clave de activación para este correo. Te la hemos reenviado por email; revisa tu bandeja de entrada y spam.',
        data: {
          expiresAt: expiresAtDate ? expiresAtDate.toISOString() : betaExpiresAt.toISOString(),
          daysRemaining,
          installerUrl: getLatestInstallerUrl(),
        },
      });
    }

    // 3. Registrar organización en PostgreSQL si está disponible
    if (db.isAvailable()) {
      await db.query(`
        INSERT INTO organizations (id, name, slug, status, plan, tax_id, legal_name, created_at, updated_at)
        VALUES ($1, $2, $3, 'ACTIVE', 'trial', $4, $5, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW(), tax_id = COALESCE(organizations.tax_id, $4)
      `, [orgId, cleanCompanyName, normalizedEmail, cleanTaxId, cleanCompanyName]).catch(() => {});
    }

    // 4. Crear licencia con fecha de expiración fijada al 31 de diciembre de 2026
    const license = await licenseService.createLicense({
      organizationId: orgId,
      plan: 'trial',
      trialDays,
      alias: `Beta 2026 - ${cleanCompanyName}`,
      maxActivations: 1,
    });

    // 5. Actualizar metadata en PostgreSQL
    if (db.isAvailable()) {
      await db.query(`
        UPDATE licenses 
        SET seat_type = 'BASE', tax_id = $1, billing_status = 'TRIAL', expires_at = $2, trial_ends_at = $2
        WHERE id = $3
      `, [cleanTaxId, betaExpiresAt, license.id]).catch(() => {});

      // Actualizar también la clave y el id de licencia en el registro de beta_leads para este lead
      await db.query(`
        UPDATE beta_leads
        SET license_key = $1, license_id = $2
        WHERE email = $3 AND (license_key IS NULL OR license_key = '')
      `, [license.key, license.id, normalizedEmail]).catch(() => {});
    }

    // 6. Enviar email transaccional de bienvenida con la clave al usuario
    try {
      await MailerService.sendLicenseWelcomeEmail({
        customerEmail: normalizedEmail,
        licenseKey: license.key,
        planName: 'Beta Pública Gratuita (Acceso completo hasta el 31 de Diciembre de 2026)',
        alias: license.alias || `Beta 2026 - ${cleanCompanyName}`,
        companyName: cleanCompanyName,
      });

      // 6.1 Notificación urgente al administrador (Cristian Jiménez)
      const adminBetaAlertHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #09090b; color: #f4f4f5; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px;">
            <div style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #34d399; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">
              🎁
            </div>
            <div>
              <h2 style="margin: 0; font-size: 18px; color: #ffffff;">Nueva Solicitud de Beta Gratuita</h2>
              <span style="font-size: 12px; color: #a1a1aa;">Bentian ERP Bridge · Lead Comercial</span>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa; width: 140px;">Empresa / Comercio:</td>
                <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${cleanCompanyName || 'No especificada'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">Email de Contacto:</td>
                <td style="padding: 8px 0;"><a href="mailto:${normalizedEmail}" style="color: #818cf8; text-decoration: none; font-weight: 600;">${normalizedEmail}</a></td>
              </tr>
              ${cleanTaxId ? `
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">CIF / NIF:</td>
                <td style="padding: 8px 0; color: #ffffff; font-family: monospace;">${cleanTaxId}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">Clave Generada:</td>
                <td style="padding: 8px 0; color: #34d399; font-family: monospace; font-weight: bold;">${license.key}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">Validez:</td>
                <td style="padding: 8px 0; color: #fbbf24;">Hasta 31/12/2026 (${trialDays} días)</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="mailto:${normalizedEmail}?subject=Soporte%20y%20puesta%20en%20marcha%20Bentian%20ERP%20Bridge&body=Hola%20${encodeURIComponent(cleanCompanyName || '')}%2C%0A%0AHe%20visto%20tu%20solicitud%20de%20acceso%20a%20la%20beta%20de%20Bentian%20ERP%20Bridge.%20%C2%BFEn%20qu%C3%A9%20versi%C3%B3n%20de%20Factusol%20y%20qu%C3%A9%20tienda%20(WooCommerce%20o%20PrestaShop)%20tienes%20pensado%20instalarlo%3F%0A%0AUn%20saludo%2C%0ACristian%20Jim%C3%A9nez" 
               style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Contactar con el Cliente Potencial &rarr;
            </a>
          </div>
        </div>
      `;

      await MailerService.sendEmail({
        to: 'cristianjimeneztrabajo@gmail.com',
        subject: `[LEAD BETA ERP] ${cleanCompanyName || normalizedEmail} ha reclamado acceso a Bentian Bridge`,
        html: adminBetaAlertHtml,
        text: `Nueva solicitud de Beta Gratuita: Empresa: ${cleanCompanyName || 'N/D'} | Email: ${normalizedEmail} | Clave: ${license.key}`,
      }).catch((mailErr: any) => {
        logger.warn('Aviso: No se pudo enviar alerta admin de beta:', mailErr.message);
      });
    } catch (_mailErr) {
      // Si el servicio de correo no está disponible, continuar sin fallar la petición
    }

    return res.status(201).json({
      success: true,
      message: '¡Clave de activación emitida con éxito para la Beta Pública Gratuita (Válida hasta el 31/12/2026)!',
      data: {
        licenseKey: license.key,
        expiresAt: betaExpiresAt.toISOString(),
        daysRemaining: trialDays,
        installerUrl: getLatestInstallerUrl(),
        instructions: [
          'Descarga e instala Bentian Agent en el equipo donde esté instalado Factusol.',
          'Abre el agente y pulsa en "Activar Licencia" o introduce tu clave en la configuración.',
          'Pega tu clave de activación y conecta tu tienda online (WooCommerce o PrestaShop).'
        ],
      },
    });
    });
  } catch (error) {
    return next(error);
  }
});

// 0.3 Cliente Final: Vista de su propia licencia, vencimiento y descarga (con soporte multi-licencia)
licensesRouter.get('/client/my-license', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sub = req.user?.sub;
    const orgId = req.user?.organizationId || 'org_default';
    const requestedKey = (req.query['key'] as string)?.trim();
    const isSuperadmin = req.user?.role === 'SUPERADMIN' || req.user?.role === 'ADMIN';

    let all: any[] = [];
    if (orgId) {
      all = await licenseService.listLicenses(orgId);
    }

    let license = null;
    if (requestedKey) {
      license = all.find(l => l.key === requestedKey);
      if (!license && isSuperadmin) {
        license = await licenseService.getLicenseByKey(requestedKey);
      }
    } else if (sub && sub.startsWith('EB-')) {
      license = all.find(l => l.key === sub) || (isSuperadmin ? await licenseService.getLicenseByKey(sub) : null);
    } else if (orgId && !isSuperadmin) {
      license = all[0] || null;
    }

    // Si es SUPERADMIN inspeccionando la vista cliente, previsualizar la primera licencia disponible
    if (!license && isSuperadmin) {
      license = all.find(l => l.status === 'active') || all[0] || null;
    }

    if (!license) {
      return res.status(404).json({ error: { message: 'No se encontró ninguna licencia para esta sesión' } });
    }

    const activations = await licenseService.listActivations(license.id);
    return res.json({
      data: {
        ...license,
        activations,
        installerUrl: getLatestInstallerUrl(),
        totalLicenses: all.length,
        allLicenses: all.map(l => ({
          id: l.id,
          key: l.key,
          alias: l.alias || 'Servidor Factusol',
          status: l.status,
          plan: l.plan,
          seatType: l.seatType,
          expiresAt: l.expiresAt,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
});

// 1. List all licenses for organization (with activations and partner/reseller support)
licensesRouter.get('/licenses', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const isSuperadmin = req.user?.role === 'SUPERADMIN' || req.user?.role === 'ADMIN';
    const isReseller = req.user?.role === 'RESELLER';
    const resellerCode = req.user?.resellerId || req.user?.sub;

    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      let query = `
        SELECT l.*, o.name as organization_name, o.tax_id as org_tax_id, o.reseller_id
        FROM licenses l
        LEFT JOIN organizations o ON l.organization_id = o.id
      `;
      const params: any[] = [];

      if (isReseller) {
        query += ` WHERE (o.reseller_id = $1 OR l.organization_id = $2)`;
        params.push(resellerCode, req.user?.organizationId || orgId);
      } else if (!isSuperadmin) {
        query += ` WHERE l.organization_id = $1`;
        params.push(req.user?.organizationId || orgId);
      } else if (req.query['organizationId']) {
        query += ` WHERE l.organization_id = $1`;
        params.push(req.query['organizationId']);
      }

      query += ` ORDER BY l.created_at DESC`;
      const result = await db.query(query, params).catch(() => ({ rows: [] }));

      const licensesWithActivations = await Promise.all(
        result.rows.map(async (lic: any) => {
          const activations = await licenseService.listActivations(lic.id).catch(() => []);
          return {
            ...lic,
            activations,
          };
        })
      );
      return res.json({ data: licensesWithActivations });
    }

    if (isSuperadmin && !req.query['organizationId']) {
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

// 2. Create a new license (Regla de Oro: 1 ERP ⇄ 1 Tienda = 1 Licencia Base Unificada 199€)
licensesRouter.post('/licenses', requireAuth, requireRole(['SUPERADMIN', 'ADMIN', 'RESELLER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;
    const isPrivileged = authUser?.role === 'SUPERADMIN' || authUser?.role === 'ADMIN';
    const orgId = getOrgId(req);
    const seatType = 'BASE';
    const taxId = (req.body.taxId as string)?.trim().toUpperCase() || null;
    const parentLicenseId = null;

    // SEGURIDAD: un RESELLER solo puede emitir evaluaciones de hasta 15 días, 1 asiento y para
    // organizaciones que le pertenecen. No puede fijar plan, caducidad ni confirmar pagos.
    let body: Record<string, any> = { ...req.body };
    if (!isPrivileged) {
      const requestedOrg = (body['organizationId'] as string) || orgId;
      if (requestedOrg !== authUser?.organizationId) {
        const db = DatabaseService.getInstance();
        const resellerCode = authUser?.resellerId || authUser?.sub;
        const owns = db.isAvailable()
          ? await db.query(`SELECT 1 FROM organizations WHERE id = $1 AND reseller_id = $2`, [requestedOrg, resellerCode])
              .then(r => r.rows.length > 0).catch(() => false)
          : false;
        if (!owns) {
          return res.status(403).json({ error: { message: 'No puedes emitir licencias para una organización que no es tuya' } });
        }
      }
      const requestedTrial = Number(body['trialDays']);
      body = {
        ...body,
        organizationId: requestedOrg,
        plan: 'trial',
        trialDays: Number.isFinite(requestedTrial) && requestedTrial >= 1 ? Math.min(Math.floor(requestedTrial), 15) : 15,
        expiresAt: undefined,
        maxActivations: 1,
        isStripeConfirmed: false,
        stripeSessionId: undefined,
      };
    }

    // Blindaje anti-claves infinitas: Si no tiene expiración ni trialDays y no proviene de pago Stripe, forzar 30 días
    const hasExplicitExpiration = Boolean(body['expiresAt'] || body['trialDays']);
    const isStripe = Boolean(body['isStripeConfirmed'] || body['stripeSessionId']);
    const effectiveTrialDays = hasExplicitExpiration ? body['trialDays'] : (isStripe ? undefined : 30);
    const effectiveBillingStatus = (isStripe || (!effectiveTrialDays && body['expiresAt'])) ? 'ACTIVE' : 'TRIAL';

    const validated = CreateLicenseDtoSchema.parse({
      ...body,
      trialDays: effectiveTrialDays,
      organizationId: body['organizationId'] || orgId,
    });
    const license = await licenseService.createLicense(validated);

    // Guardar metadata fiscal en Postgres
    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      await db.query(`
        UPDATE licenses
        SET seat_type = $1, parent_license_id = $2, tax_id = $3, billing_status = $4
        WHERE id = $5
      `, [seatType, parentLicenseId, taxId, effectiveBillingStatus, license.id]).catch(() => {});
    }

    return res.status(201).json({
      data: {
        ...license,
        seatType,
        parentLicenseId,
        taxId,
        billingStatus: effectiveBillingStatus,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// 2.1 Update license alias
licensesRouter.patch('/licenses/:id/alias', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id']!;
    const parsed = UpdateAliasSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { message: 'El alias debe tener entre 1 y 80 caracteres y no contener caracteres especiales (<, >, ", \', `)' } });
    }
    const cleanAlias = parsed.data.alias;
    if (cleanAlias.length > 80 || /[<>"'`]/.test(cleanAlias)) {
      return res.status(400).json({ error: { message: 'El alias no puede tener más de 80 caracteres ni caracteres especiales' } });
    }
    const lic = await licenseService.getLicenseById(id);
    if (!lic) {
      return res.status(404).json({ error: { message: 'Licencia no encontrada' } });
    }
    const isSuperadmin = req.user?.role === 'SUPERADMIN' || req.user?.role === 'ADMIN';
    if (!isSuperadmin && lic.organizationId !== req.user?.organizationId) {
      return res.status(403).json({ error: { message: 'No tienes permiso para modificar esta licencia' } });
    }
    await licenseService.updateLicenseAlias(id, cleanAlias);
    return res.json({ success: true, id, alias: cleanAlias });
  } catch (error) {
    return next(error);
  }
});

// 2.2 Unbind machine activation (Mudar PC)
licensesRouter.post('/licenses/:id/unbind', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id']!;
    const parsed = UnbindMachineSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { message: 'HWID con formato no válido (debe ser alfanumérico entre 16 y 64 caracteres)' } });
    }
    const { hwid } = parsed.data;
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(hwid)) {
      return res.status(400).json({ error: { message: 'HWID con formato no válido (debe ser alfanumérico entre 16 y 64 caracteres)' } });
    }
    const lic = await licenseService.getLicenseById(id);
    if (!lic) {
      return res.status(404).json({ error: { message: 'Licencia no encontrada' } });
    }
    const isSuperadmin = req.user?.role === 'SUPERADMIN' || req.user?.role === 'ADMIN';
    if (!isSuperadmin && lic.organizationId !== req.user?.organizationId) {
      return res.status(403).json({ error: { message: 'No tienes permiso para desvincular equipos de esta licencia' } });
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
licensesRouter.get('/licenses/:key', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const key = req.params['key']!;
    const license = await licenseService.getLicenseByKey(key);
    if (!license) {
      return res.status(404).json({ error: { message: 'Licencia no encontrada' } });
    }
    const isSuperadmin = req.user?.role === 'SUPERADMIN' || req.user?.role === 'ADMIN';
    if (!isSuperadmin) {
      if (req.user?.role === 'RESELLER') {
        const db = DatabaseService.getInstance();
        const resellerCode = req.user?.resellerId || req.user?.sub;
        const orgMatch = await db.query(
          `SELECT o.reseller_id FROM organizations o WHERE o.id = $1`,
          [license.organizationId]
        ).then(r => r.rows[0]?.reseller_id === resellerCode).catch(() => false);
        if (!orgMatch && license.organizationId !== req.user?.organizationId) {
          return res.status(403).json({ error: { message: 'No tienes permiso para consultar esta licencia' } });
        }
      } else {
        if (license.organizationId !== req.user?.organizationId && key !== req.user?.sub) {
          return res.status(403).json({ error: { message: 'No tienes permiso para consultar esta licencia' } });
        }
      }
    }
    const activations = await licenseService.listActivations(license.id);
    return res.json({ data: { ...license, activations } });
  } catch (error) {
    return next(error);
  }
});

// 4. Activate a license from an Agent (Regla de Oro: 1 ERP ⇄ 1 Tienda = 1 Licencia Base Unificada 199€)
licensesRouter.post('/licenses/activate', rateLimit({ name: 'license-activate', windowMs: 15*60*1000, max: 60 }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = LicenseActivationRequestSchema.parse(req.body);

    // Sanear machineInfo.hostname para prevenir Stored XSS en dashboards
    if (validated.machineInfo && typeof (validated.machineInfo as any).hostname === 'string') {
      const rawHost = String((validated.machineInfo as any).hostname).trim();
      (validated.machineInfo as any).hostname = rawHost.substring(0, 64).replace(/[<>"'`]/g, '');
    }

    // Verificación previa de expiración
    const normalizedKey = LicenseKeyGenerator.normalize(validated.licenseKey);
    const keyValidation = LicenseKeyGenerator.validate(normalizedKey);
    if (!keyValidation.valid) {
      return res.status(400).json({ error: { message: keyValidation.reason || 'Clave de licencia con formato inválido' } });
    }
    const lic = await licenseService.getLicenseByKey(normalizedKey);
    if (lic && lic.expiresAt && new Date() > new Date(lic.expiresAt)) {
      return res.status(403).json({ error: { message: 'El periodo de prueba de la Beta ha finalizado. Actualice al Plan Fundador para activar su equipo.' } });
    }

    const result = await withKeyedLock(`activate:${normalizedKey}`, () => licenseService.activateLicense({
      ...validated,
      licenseKey: normalizedKey,
    }));
    if (!result.success) {
      return res.status(400).json({ error: { message: result.error } });
    }

    // Blindaje criptográfico: El token firmado NUNCA puede sobrepasar la fecha de expiración de la licencia
    if (lic && lic.expiresAt && result.licenseToken) {
      const licExpiresMs = new Date(lic.expiresAt).getTime();
      const verification = LicenseTokenManager.verifyToken(result.licenseToken);
      if (verification.valid && verification.payload) {
        if (verification.payload.expiresAt > licExpiresMs) {
          verification.payload.expiresAt = licExpiresMs;
          result.licenseToken = LicenseTokenManager.createToken(verification.payload);
          result.expiresAt = new Date(licExpiresMs).toISOString();
        }
      }
    }

    const activationProof = buildLicenseProof(result.licenseToken);
    if (activationProof) {
      (result as any).licenseProof = activationProof;
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

    // Verificación previa: Si el token pertenece a una licencia que ya expiró, denegar de inmediato
    const verification = LicenseTokenManager.verifyToken(validated.licenseToken);
    if (verification.valid && verification.payload) {
      const lic = await licenseService.getLicenseById(verification.payload.licenseId);
      if (lic && lic.expiresAt && new Date() > new Date(lic.expiresAt)) {
        return res.status(403).json({
          error: { message: 'El periodo de la Beta ha finalizado. Actualice al Plan Fundador para reanudar la sincronización.' },
          data: { valid: false, message: 'Licencia expirada' }
        });
      }
    }

    const result = await licenseService.validateLicense(validated);
    if (!result.valid) {
      return res.status(403).json({ error: { message: result.message }, data: result });
    }

    // Blindaje criptográfico: El token renovado NUNCA puede sobrepasar la expiración de la licencia
    if (verification.valid && verification.payload && result.renewedToken) {
      const lic = await licenseService.getLicenseById(verification.payload.licenseId);
      if (lic && lic.expiresAt) {
        const licExpiresMs = new Date(lic.expiresAt).getTime();
        const renewedVerif = LicenseTokenManager.verifyToken(result.renewedToken);
        if (renewedVerif.valid && renewedVerif.payload) {
          if (renewedVerif.payload.expiresAt > licExpiresMs) {
            renewedVerif.payload.expiresAt = licExpiresMs;
            result.renewedToken = LicenseTokenManager.createToken(renewedVerif.payload);
            result.expiresAt = new Date(licExpiresMs).toISOString();
            result.gracePeriodRemainingSeconds = Math.max(0, Math.floor((licExpiresMs - Date.now()) / 1000));
          }
        }
      }
    }

    const validationProof = buildLicenseProof(result.renewedToken || validated.licenseToken);
    if (validationProof) {
      (result as any).licenseProof = validationProof;
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return next(error);
  }
});

// 6. Deactivate a machine activation
licensesRouter.post('/licenses/deactivate', rateLimit({ name: 'license-deactivate', windowMs: 15*60*1000, max: 30 }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = DeactivateLicenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { message: 'Se requiere licenseKey y hwid' } });
    }
    const { licenseKey, hwid } = parsed.data;
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
licensesRouter.post('/licenses/:id/revoke', requireAuth, requireRole(['SUPERADMIN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reason = (req.body.reason as string) || 'Revocada por el administrador';
    const revoked = await licenseService.revokeLicense(req.params['id']!, reason);
    res.json({ data: revoked });
  } catch (error) {
    next(error);
  }
});
