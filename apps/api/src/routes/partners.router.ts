import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { DatabaseService, LicenseService } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';
import { requireAuth, requireRole, computeOrganizationIdFromEmail } from './auth.router';
import { rateLimit } from '../middleware/rate-limit';
import { withKeyedLock } from '../middleware/keyed-mutex';
import { getLatestInstallerUrl } from '../utils/version.util';
import { MailerService } from '../services/mailer.service';

export const partnersRouter = Router();
const logger = new Logger('PartnersRouter');
const licenseService = new LicenseService();

const PartnerApplySchema = z.object({
  agencyName: z.string().trim().min(2, 'El nombre de la agencia o empresa es obligatorio').max(120),
  contactName: z.string().trim().min(2, 'El nombre de contacto es obligatorio').max(100),
  email: z.string().trim().email('Introduce un correo electrónico profesional válido').max(200),
  phone: z.string().trim().min(6, 'Introduce un teléfono o WhatsApp de contacto').max(50),
  website: z.string().trim().max(200).optional(),
  partnerType: z.enum(['agencia_ecommerce', 'implantador_erp', 'asesoria_holded']).optional().default('agencia_ecommerce'),
  erps: z.string().trim().max(250).optional().default('Factusol, SimplyGest, Sage 50'),
  estimatedClients: z.string().trim().max(60).optional().default('1-5 clientes'),
  notes: z.string().trim().max(1000).optional(),
});

const AdminUpdatePartnerSchema = z.object({
  status: z.enum(['ACTIVE', 'PENDING', 'SUSPENDED']).optional(),
  commissionRate: z.number().int().min(5).max(50).optional(),
  referredClientsCount: z.number().int().min(0).max(10000).optional(),
  notes: z.string().trim().max(1000).optional(),
});

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildPartnerCode(agencyName: string): string {
  const cleanPrefix = agencyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
    .padEnd(3, 'X');
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `PT-${cleanPrefix}-${suffix}`;
}

export async function ensurePartnersTable(): Promise<void> {
  const db = DatabaseService.getInstance();
  if (!db.isAvailable()) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS partners (
      partner_code VARCHAR(50) PRIMARY KEY,
      secret_hash VARCHAR(255) NOT NULL DEFAULT '',
      contact_email VARCHAR(255),
      active BOOLEAN NOT NULL DEFAULT true,
      quota_trials INT NOT NULL DEFAULT 20,
      id VARCHAR(64),
      agency_name VARCHAR(255),
      contact_name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(64),
      website VARCHAR(255),
      partner_type VARCHAR(64) DEFAULT 'agencia_ecommerce',
      erps VARCHAR(255),
      estimated_clients VARCHAR(64),
      commission_rate INTEGER NOT NULL DEFAULT 25,
      referred_clients_count INTEGER NOT NULL DEFAULT 0,
      nfr_license_key VARCHAR(128),
      nfr_license_id VARCHAR(64),
      status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      ip_address VARCHAR(128),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch((err) => {
    logger.warn(`No se pudo crear tabla partners: ${err instanceof Error ? err.message : String(err)}`);
  });

  await db.query(`
    ALTER TABLE partners
      ADD COLUMN IF NOT EXISTS secret_hash VARCHAR(255) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS quota_trials INT NOT NULL DEFAULT 20,
      ADD COLUMN IF NOT EXISTS id VARCHAR(64),
      ADD COLUMN IF NOT EXISTS agency_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(64),
      ADD COLUMN IF NOT EXISTS website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS partner_type VARCHAR(64) DEFAULT 'agencia_ecommerce',
      ADD COLUMN IF NOT EXISTS erps VARCHAR(255),
      ADD COLUMN IF NOT EXISTS estimated_clients VARCHAR(64),
      ADD COLUMN IF NOT EXISTS commission_rate INTEGER NOT NULL DEFAULT 25,
      ADD COLUMN IF NOT EXISTS referred_clients_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS nfr_license_key VARCHAR(128),
      ADD COLUMN IF NOT EXISTS nfr_license_id VARCHAR(64),
      ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS ip_address VARCHAR(128),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `).catch(() => {});
}

// 1. Alta Pública/Admin de Partner + Emisión Automática de Código PT-XXXX y Licencia NFR Demo
partnersRouter.post(
  ['/partners/apply', '/api/v1/partners/apply'],
  rateLimit({ name: 'partner-apply', windowMs: 15 * 60 * 1000, max: 10, message: 'Demasiadas solicitudes. Espera unos minutos.' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = PartnerApplySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: { message: parsed.error.issues[0]?.message || 'Datos de solicitud incompletos.' } });
      }
      const data = parsed.data;
      const normalizedEmail = data.email.trim().toLowerCase();
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || req.ip || null;

      return await withKeyedLock(`partner:${normalizedEmail}`, async () => {
        const db = DatabaseService.getInstance();
        await ensurePartnersTable();

        if (db.isAvailable()) {
          const existing = await db.query(
            `SELECT * FROM partners WHERE LOWER(COALESCE(email, contact_email)) = $1 LIMIT 1`,
            [normalizedEmail]
          ).catch(() => ({ rows: [] }));

          if (existing.rows && existing.rows.length > 0) {
            const row = existing.rows[0] as Record<string, any>;
            return res.json({
              success: true,
              alreadyRegistered: true,
              message: 'Tu agencia ya está registrada en el Canal Oficial de Partners. Aquí tienes tu código y tu licencia NFR.',
              data: {
                partnerCode: row['partner_code'],
                agencyName: row['agency_name'] || data.agencyName,
                commissionRate: Number(row['commission_rate'] || 25),
                nfrLicenseKey: row['nfr_license_key'],
                installerUrl: getLatestInstallerUrl(),
                dossierUrl: '/partners/?print=1',
              },
            });
          }
        }

        const partnerId = `pt_${crypto.randomUUID()}`;
        const partnerCode = buildPartnerCode(data.agencyName);
        const orgId = computeOrganizationIdFromEmail(normalizedEmail);
        const nfrExpiresAt = new Date('2026-12-31T23:59:59.999Z');
        const trialDays = Math.max(30, Math.ceil((nfrExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

        if (db.isAvailable()) {
          await db.query(`
            INSERT INTO organizations (id, name, slug, status, plan, legal_name, reseller_id, created_at, updated_at)
            VALUES ($1, $2, $3, 'ACTIVE', 'trial', $4, $5, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET updated_at = NOW(), reseller_id = COALESCE(organizations.reseller_id, $5)
          `, [orgId, data.agencyName, normalizedEmail, data.agencyName, partnerCode]).catch(() => {});
        }

        const nfrLicense = await licenseService.createLicense({
          organizationId: orgId,
          plan: 'trial',
          trialDays,
          alias: `Partner NFR (${partnerCode}) - ${data.agencyName}`,
          maxActivations: 2,
        });

        const secretHash = `sha256:${crypto.createHash('sha256').update(nfrLicense.key).digest('hex')}`;

        if (db.isAvailable()) {
          await db.query(`
            UPDATE licenses
            SET seat_type = 'BASE', billing_status = 'TRIAL', reseller_id = $1, expires_at = $2, trial_ends_at = $2
            WHERE id = $3
          `, [partnerCode, nfrExpiresAt, nfrLicense.id]).catch(() => {});

          await db.query(`
            INSERT INTO partners (
              partner_code, secret_hash, contact_email, active, quota_trials,
              id, agency_name, contact_name, email, phone, website,
              partner_type, erps, estimated_clients, commission_rate, referred_clients_count,
              nfr_license_key, nfr_license_id, status, notes, ip_address, created_at, updated_at
            ) VALUES (
              $1, $2, $3, true, 20,
              $4, $5, $6, $3, $7, $8,
              $9, $10, $11, 25, 0,
              $12, $13, 'ACTIVE', $14, $15, NOW(), NOW()
            )
          `, [
            partnerCode, secretHash, normalizedEmail,
            partnerId, data.agencyName, data.contactName, data.phone, data.website || null,
            data.partnerType, data.erps, data.estimatedClients,
            nfrLicense.key, nfrLicense.id, data.notes || null, clientIp,
          ]).catch((err) => {
            logger.warn(`Error al insertar en partners: ${err instanceof Error ? err.message : String(err)}`);
          });
        }

        void MailerService.sendLicenseWelcomeEmail({
          customerEmail: normalizedEmail,
          licenseKey: nfrLicense.key,
          planName: `Partner Oficial Bentian (${partnerCode} · 25% Comisión Recurrente + Licencia NFR 2 Puestos)`,
          alias: `Partner NFR (${partnerCode}) - ${data.agencyName}`,
          companyName: data.agencyName,
        }).catch(() => {});

        const adminHtml = MailerService.renderBrandedEmail({
          title: `Nuevo Partner B2B Registrado: ${escapeHtml(data.agencyName)} (${escapeHtml(partnerCode)})`,
          badgeText: 'NUEVO PARTNER 25%',
          badgeType: 'success',
          contentHtml: `
            <h2 style="margin:0 0 12px 0;font-size:18px;color:#ffffff;">🤝 Alta de Nuevo Partner / Agente Digitalizador</h2>
            <p style="font-size:13px;color:#d4d4d8;line-height:1.6;">
              <strong>Agencia:</strong> ${escapeHtml(data.agencyName)}<br/>
              <strong>Contacto:</strong> ${escapeHtml(data.contactName)} (<a href="mailto:${escapeHtml(normalizedEmail)}" style="color:#818cf8;">${escapeHtml(normalizedEmail)}</a> · Tel: ${escapeHtml(data.phone)})<br/>
              <strong>Código Partner:</strong> <code style="color:#34d399;font-weight:700;">${escapeHtml(partnerCode)}</code> (25% recurrente)<br/>
              <strong>ERPs:</strong> ${escapeHtml(data.erps)} (${escapeHtml(data.estimatedClients)})<br/>
              <strong>Licencia NFR (2 puestos / Clave acceso Portal):</strong> <code style="color:#818cf8;">${escapeHtml(nfrLicense.key)}</code>
            </p>
          `,
          previewText: `Nuevo Partner B2B: ${escapeHtml(data.agencyName)} (${escapeHtml(partnerCode)})`,
        });

        void MailerService.sendEmail({
          to: 'cristianjimeneztrabajo@gmail.com',
          subject: `[NUEVO PARTNER B2B] ${data.agencyName} (${partnerCode}) se ha unido al Canal de Partners`,
          html: adminHtml,
          text: `Nuevo Partner B2B: ${data.agencyName} | Contacto: ${data.contactName} (${normalizedEmail} / ${data.phone}) | Código: ${partnerCode} | Licencia NFR: ${nfrLicense.key}`,
        }).catch(() => {});

        logger.info(`✓ Nuevo Partner B2B registrado: ${data.agencyName} (${partnerCode}) -> Licencia NFR: ${nfrLicense.key}`);
        return res.status(201).json({
          success: true,
          alreadyRegistered: false,
          message: '¡Bienvenido al Canal Oficial de Partners! Tu código de atribución del 25% y tu licencia NFR de demostración están activos.',
          data: {
            partnerCode,
            agencyName: data.agencyName,
            commissionRate: 25,
            nfrLicenseKey: nfrLicense.key,
            installerUrl: getLatestInstallerUrl(),
            dossierUrl: '/partners/?print=1',
          },
        });
      });
    } catch (err) {
      return next(err);
    }
  }
);

// 2. Endpoints de Administración de Partners para el Dashboard Cloud (SUPERADMIN / ADMIN)
partnersRouter.get('/admin/partners', requireAuth, requireRole(['SUPERADMIN', 'ADMIN']), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = DatabaseService.getInstance();
    await ensurePartnersTable();
    if (!db.isAvailable()) {
      return res.json({ data: [], kpis: { totalPartners: 0, activePartners: 0, totalReferredClients: 0, estimatedPartnerArr: 0, estimatedPartnerCommissions: 0 } });
    }
    const result = await db.query(`
      SELECT p.*,
             (SELECT COUNT(*)::int FROM organizations o WHERE o.reseller_id = p.partner_code AND LOWER(COALESCE(o.slug, '')) <> LOWER(COALESCE(p.email, p.contact_email, ''))) AS live_org_count
      FROM partners p
      ORDER BY p.created_at DESC
    `);
    const rows = (result.rows || []).map((r: any) => ({
      ...r,
      id: r.id || r.partner_code,
      status: r.status || (r.active === false ? 'SUSPENDED' : 'ACTIVE'),
      referred_clients_count: Math.max(Number(r.referred_clients_count || 0), Number(r.live_org_count || 0)),
    }));
    const activePartners = rows.filter((r: any) => r.status === 'ACTIVE').length;
    const totalReferredClients = rows.reduce((acc: number, r: any) => acc + Number(r.referred_clients_count || 0), 0);
    const estimatedPartnerArr = totalReferredClients * 199;
    const estimatedPartnerCommissions = rows.reduce(
      (acc: number, r: any) => acc + Number(r.referred_clients_count || 0) * 199 * (Number(r.commission_rate || 25) / 100),
      0
    );

    return res.json({
      data: rows,
      kpis: {
        totalPartners: rows.length,
        activePartners,
        totalReferredClients,
        estimatedPartnerArr: Math.round(estimatedPartnerArr * 100) / 100,
        estimatedPartnerCommissions: Math.round(estimatedPartnerCommissions * 100) / 100,
      },
    });
  } catch (err) {
    return next(err);
  }
});

partnersRouter.patch('/admin/partners/:id', requireAuth, requireRole(['SUPERADMIN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = AdminUpdatePartnerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { message: 'Datos de actualización de Partner no válidos.' } });
    }
    const db = DatabaseService.getInstance();
    await ensurePartnersTable();
    if (!db.isAvailable()) {
      return res.status(503).json({ error: { message: 'Base de datos no disponible.' } });
    }
    const { status, commissionRate, referredClientsCount, notes } = parsed.data;
    const activeBool = status === 'SUSPENDED' ? false : status === 'ACTIVE' ? true : null;
    const updated = await db.query(
      `UPDATE partners
       SET status = COALESCE($1, status),
           active = COALESCE($2, active),
           commission_rate = COALESCE($3, commission_rate),
           referred_clients_count = COALESCE($4, referred_clients_count),
           notes = COALESCE($5, notes),
           updated_at = NOW()
       WHERE id = $6 OR partner_code = $6
       RETURNING *`,
      [status ?? null, activeBool, commissionRate ?? null, referredClientsCount ?? null, notes ?? null, req.params.id]
    );
    if (!updated.rows || updated.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Partner no encontrado.' } });
    }
    return res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    return next(err);
  }
});
