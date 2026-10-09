import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AgentService, UpdateService, DatabaseService } from '@erp-bridge/core';
import { AgentHeartbeatPayloadSchema, AgentPairingRequestSchema } from '@erp-bridge/shared';
import { requireAuth, requireRole, AuthenticatedRequest } from './auth.router';
import { resolveOrgId } from './org-scope';
import { rateLimit } from '../middleware/rate-limit';

export const agentsRouter = Router();
const agentService = new AgentService();
const updateService = new UpdateService();

const pairRateLimiter = rateLimit({
  name: 'agent-pair',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de emparejamiento. Por favor, espere 15 minutos.',
});

const pairingTokenRateLimiter = rateLimit({
  name: 'agent-pairing-token',
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Demasiadas solicitudes de generación de tokens de emparejamiento. Por favor, espere.',
});

const CreatePairingTokenSchema = z.object({
  createdById: z.string().trim().max(100).optional(),
});

const FleetReportErrorSchema = z.object({
  agentId: z.string().trim().max(100).optional(),
  organizationId: z.string().trim().max(100).optional(),
  errorCode: z.string().trim().min(1, 'errorCode es requerido').max(100),
  message: z.string().trim().min(1, 'message es requerido').max(1000),
  details: z.any().optional(),
});

const FleetReportIncidentSchema = z.object({
  ticketId: z.string().trim().min(1, 'ticketId es obligatorio').max(100),
  contact: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  description: z.string().trim().min(1, 'description es obligatorio').max(5000),
  diagnostics: z.string().max(20000).optional(),
  agentId: z.string().trim().max(100).optional(),
  organizationId: z.string().trim().max(100).optional(),
  appVersion: z.string().trim().max(50).optional(),
  hwid: z.string().trim().max(128).optional(),
});

import { getLatestReleasedVersion } from '../utils/version.util';
import { MailerService } from '../services/mailer.service';

export { getLatestReleasedVersion };

function getOrgId(req: Request): string {
  return resolveOrgId(req);
}

// 1. List agents (Protected - Consulta unificada de máquinas activas por licencia y agentes)
agentsRouter.get('/agents', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const db = DatabaseService.getInstance();
    const isSuperadmin = req.user?.role === 'SUPERADMIN';
    const isAdmin = req.user?.role === 'ADMIN';
    const isReseller = req.user?.role === 'RESELLER';

    if (db.isAvailable()) {
      let query = `
        SELECT 
          COALESCE(a.id, la.agent_id, 'ag_' || SUBSTRING(la.hwid, 1, 16)) as id,
          COALESCE(a.name, la.machine_info->>'hostname', 'Servidor Factusol') as name,
          COALESCE(a.organization_id, l.organization_id, 'org_default') as organization_id,
          o.name as organization_name,
          COALESCE(l.tax_id, o.tax_id, '') as tax_id,
          l.key as license_key,
          l.alias as license_alias,
          l.plan as plan,
          l.seat_type,
          COALESCE(a.version, '0.3.0') as version,
          COALESCE(a.platform, la.machine_info->>'platform', 'win32') as platform,
          COALESCE(a.last_seen_at, la.last_validated_at) as last_seen_at,
          la.last_validated_at,
          la.activated_at,
          la.hwid,
          la.machine_info,
          a.ip_address
        FROM license_activations la
        JOIN licenses l ON la.license_id = l.id
        LEFT JOIN organizations o ON l.organization_id = o.id
        LEFT JOIN agents a ON (la.agent_id = a.id OR la.hwid = a.id)
        WHERE la.deactivated_at IS NULL
      `;
      const params: any[] = [];

      if (isReseller) {
        const resellerCode = req.user?.resellerId || req.user?.sub;
        query += ` AND (o.reseller_id = $1 OR l.organization_id = $2)`;
        params.push(resellerCode, req.user?.organizationId || orgId);
      } else if (!isSuperadmin && !isAdmin) {
        query += ` AND l.organization_id = $1`;
        params.push(req.user?.organizationId || orgId);
      } else if (isAdmin && !isSuperadmin) {
        query += ` AND (l.organization_id = $1 OR o.reseller_id = $1)`;
        params.push(orgId);
      } else if (req.query['organizationId']) {
        query += ` AND l.organization_id = $1`;
        params.push(req.query['organizationId']);
      }

      query += ` ORDER BY COALESCE(a.last_seen_at, la.last_validated_at) DESC`;

      const result = await db.query(query, params).catch(() => ({ rows: [] }));
      const now = Date.now();
      const OFFLINE_THRESHOLD_MS = 90_000;
      const LATEST_VERSION = getLatestReleasedVersion();

      const unified = result.rows.map((row: any) => {
        const lastSeen = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
        const diff = now - lastSeen;
        const isOnline = diff < OFFLINE_THRESHOLD_MS;
        const installedVersion = (row.version || LATEST_VERSION).replace(/^v/, '');
        const isLatest = installedVersion === LATEST_VERSION;

        return {
          id: row.id,
          name: row.name,
          organizationId: row.organization_id,
          organization_id: row.organization_id,
          organizationName: row.organization_name || row.license_alias || 'Cliente Bentian',
          taxId: row.tax_id,
          licenseKey: row.license_key,
          licenseAlias: row.license_alias,
          plan: row.plan || 'professional',
          seatType: row.seat_type || 'BASE',
          version: `v${installedVersion}`,
          installedVersion,
          latestVersion: LATEST_VERSION,
          isUpToDate: isLatest,
          status: isOnline ? 'ACTIVE' : 'OFFLINE',
          isOnline,
          platform: row.platform,
          lastSeenAt: row.last_seen_at,
          last_seen_at: row.last_seen_at,
          last_heartbeat: row.last_seen_at,
          lastValidatedAt: row.last_validated_at,
          hwid: row.hwid,
          machineInfo: row.machine_info,
          ipAddress: row.ip_address,
        };
      });

      return res.json({
        data: unified,
        summary: {
          totalMachines: unified.length,
          onlineMachines: unified.filter(m => m.isOnline).length,
          upToDateMachines: unified.filter(m => m.isUpToDate).length,
          latestVersion: `v${LATEST_VERSION}`,
        },
      });
    }

    if ((isSuperadmin || isAdmin) && !req.query['organizationId']) {
      const all = await agentService.listAllAgents();
      return res.json({ data: all });
    }
    const list = await agentService.listAgents(orgId);
    return res.json({ data: list });
  } catch (error) {
    return next(error);
  }
});

// 2. Get agent details (Protected)
agentsRouter.get('/agents/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const agent = await agentService.getAgentById(orgId, req.params['id']!);
    return res.json({ data: agent });
  } catch (error) {
    return next(error);
  }
});

// 2.1 Get fleet errors for Superadmin
agentsRouter.get('/admin/fleet/errors', requireAuth, requireRole(['SUPERADMIN', 'ADMIN']), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      const result = await db.query(
        `SELECT e.id, e.agent_id, e.organization_id, e.error_code, e.message, e.details, e.resolved, e.created_at,
                a.name as agent_name, a.platform, o.name as org_name
         FROM fleet_error_events e
         LEFT JOIN agents a ON e.agent_id = a.id
         LEFT JOIN organizations o ON e.organization_id = o.id
         ORDER BY e.created_at DESC
         LIMIT 100`
      ).catch(() => ({ rows: [] }));
      return res.json({ data: result.rows });
    }
    return res.json({ data: [] });
  } catch (error) {
    return next(error);
  }
});

// 2.2 Report agent error event (from Agent or local monitor)
agentsRouter.post('/fleet/report-error', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = FleetReportErrorSchema.parse(req.body);
    const { agentId, organizationId, errorCode, message, details } = validated;
    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      await db.query(
        `INSERT INTO fleet_error_events (agent_id, organization_id, error_code, message, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [agentId || null, organizationId || 'org_default', errorCode, message, details ? JSON.stringify(details) : null]
      ).catch(() => {});
    }
    return res.status(201).json({ success: true });
  } catch (error) {
    return next(error);
  }
});

// 2.3 Report agent incident / support ticket (from Agent GUI)
agentsRouter.post('/fleet/report-incident', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = FleetReportIncidentSchema.parse(req.body);
    const { ticketId, contact, category, description, diagnostics, agentId, organizationId, appVersion, hwid } = validated;

    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      await db.query(
        `INSERT INTO fleet_error_events (agent_id, organization_id, error_code, message, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          agentId || null,
          organizationId || 'org_default',
          `INCIDENT_${(category || 'OTHER').toUpperCase()}`,
          `[${ticketId}] (${contact || 'Sin contacto'}): ${description.substring(0, 180)}`,
          JSON.stringify({ ticketId, contact, category, description, diagnostics: diagnostics ? diagnostics.substring(0, 4000) : null, appVersion, hwid })
        ]
      ).catch(() => {});
    }

    // Despacho de email a soporte técnico
    const supportEmail = process.env.SUPPORT_EMAIL || 'cristianjimeneztrabajo@gmail.com';
    try {
      await MailerService.sendEmail({
        to: supportEmail,
        subject: `🚨 [Incidencia Bentian] ${ticketId} - ${category || 'General'}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 10px;">
            <h2 style="color: #ef4444; margin-top: 0;">🚨 Nueva Incidencia Técnica: ${ticketId}</h2>
            <p style="font-size: 14px; color: #94a3b8;">Se ha recibido una nueva incidencia desde la app de escritorio Bentian Agent.</p>
            <div style="background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 16px;">
              <p style="margin: 4px 0;"><strong>Contacto:</strong> <a href="mailto:${contact}" style="color: #818cf8;">${contact || 'No especificado'}</a></p>
              <p style="margin: 4px 0;"><strong>Categoría:</strong> ${category || 'General'}</p>
              <p style="margin: 4px 0;"><strong>Versión Agente:</strong> v${appVersion || 'Desconocida'}</p>
              <p style="margin: 4px 0;"><strong>HWID:</strong> <code>${hwid || 'N/A'}</code></p>
              <p style="margin: 4px 0;"><strong>Organización / Agente:</strong> ${organizationId || 'org_default'} / ${agentId || 'ag_local'}</p>
            </div>
            <div style="background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 16px;">
              <h4 style="margin-top: 0; color: #f1f5f9;">Descripción del Usuario:</h4>
              <p style="white-space: pre-wrap; font-size: 13px; line-height: 1.5; color: #cbd5e1;">${description}</p>
            </div>
            ${diagnostics ? `<div style="background: #090d16; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; color: #94a3b8; max-height: 250px; overflow-y: auto; white-space: pre-wrap;">${diagnostics.substring(0, 3000)}</div>` : ''}
          </div>
        `,
        text: `Nueva Incidencia ${ticketId}\\nContacto: ${contact}\\nCategoría: ${category}\\nVersión: v${appVersion}\\nHWID: ${hwid}\\n\\nDescripción:\\n${description}\\n\\n${diagnostics ? diagnostics.substring(0, 2000) : ''}`
      }).catch(() => {});
    } catch {}

    return res.status(201).json({
      success: true,
      ticketId,
      message: `Hemos recibido tu solicitud junto con el diagnóstico del equipo. El equipo de soporte técnico la revisará y te contactará a ${contact} a la mayor brevedad.`
    });
  } catch (error) {
    return next(error);
  }
});

// 3. Generate pairing token (Protected)
agentsRouter.post('/agents/pairing-token', requireAuth, pairingTokenRateLimiter, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const body = CreatePairingTokenSchema.parse(req.body);
    const tokenData = await agentService.generatePairingToken(orgId, body.createdById);
    return res.status(201).json({ data: tokenData });
  } catch (error) {
    return next(error);
  }
});

agentsRouter.post('/agents/pair', pairRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = AgentPairingRequestSchema.parse(req.body);
    const result = await agentService.pairAgent(validated);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

agentsRouter.post('/agents/:id/heartbeat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = AgentHeartbeatPayloadSchema.parse({
      ...req.body,
      agentId: req.params['id'] || req.body.agentId,
    });
    const result = await agentService.recordHeartbeat(validated);

    // Persistencia y enlace en PostgreSQL si la base está disponible
    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      const hwid = (req.body.hwid as string) || '';
      let orgId = 'org_default';
      if (hwid) {
        const lic = await db.query(
          `SELECT l.organization_id FROM license_activations la JOIN licenses l ON la.license_id = l.id WHERE la.hwid = $1 LIMIT 1`,
          [hwid]
        ).catch(() => ({ rows: [] }));
        if (lic.rows[0]?.organization_id) {
          orgId = lic.rows[0].organization_id;
        }
      }

      // Proteger asignación: no degradar agentes existentes a org_default
      if (orgId === 'org_default') {
        const existing = await db.query(
          `SELECT organization_id FROM agents WHERE id = $1 LIMIT 1`,
          [validated.agentId]
        ).catch(() => ({ rows: [] }));
        if (existing.rows[0]?.organization_id && existing.rows[0].organization_id !== 'org_default') {
          orgId = existing.rows[0].organization_id;
        }
      }

      const agentName = req.body.systemInfo?.hostname || req.body.name || 'Servidor Factusol';
      const version = validated.version || (req.body.version as string) || '0.3.0';
      const platform = req.body.systemInfo?.platform || req.body.platform || 'win32';
      const ip = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null;

      await db.query(
        `INSERT INTO agents (id, organization_id, name, status, version, last_seen_at, ip_address, platform, updated_at)
         VALUES ($1, $2, $3, 'ONLINE', $4, CURRENT_TIMESTAMP, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE
         SET organization_id = CASE
               WHEN EXCLUDED.organization_id IS NOT NULL AND EXCLUDED.organization_id <> 'org_default'
               THEN EXCLUDED.organization_id
               ELSE agents.organization_id
             END,
             name = EXCLUDED.name,
             status = 'ONLINE',
             version = EXCLUDED.version,
             last_seen_at = CURRENT_TIMESTAMP,
             ip_address = COALESCE(EXCLUDED.ip_address, agents.ip_address),
             platform = EXCLUDED.platform,
             updated_at = CURRENT_TIMESTAMP`,
        [validated.agentId, orgId, agentName, version, ip, platform]
      ).catch(() => null);

      if (hwid) {
        await db.query(
          `UPDATE license_activations
           SET agent_id = $1, last_validated_at = CURRENT_TIMESTAMP
           WHERE hwid = $2`,
          [validated.agentId, hwid]
        ).catch(() => null);
      }
    }

    // Detección inmediata piggybacked: notifica al agente en < 30 segundos
    const agentVersion = validated.version || (req.body.version as string) || '0.1.0';
    let updateAvailable = false;
    let targetVersion: string | undefined;
    let updateInfo: any = undefined;

    try {
      const check = await updateService.checkForUpdates({
        agentId: validated.agentId,
        currentVersion: agentVersion,
        platform: 'win32',
        arch: 'x64',
        channel: 'stable',
      });
      if (check.available) {
        updateAvailable = true;
        targetVersion = check.version;
        updateInfo = check;
      }
    } catch {
      // Si la tabla de manifiestos está vacía o hay fallo transitorio, continuar
    }

    res.json({
      data: {
        ...result,
        updateAvailable,
        targetVersion,
        updateInfo,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 2.2 Telemetría Enriquecida de Flota y Control de Versiones para Superadmin & Partners
agentsRouter.get('/admin/fleet/overview', requireAuth, requireRole(['SUPERADMIN', 'ADMIN']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const db = DatabaseService.getInstance();
    const isSuperadmin = req.user?.role === 'SUPERADMIN';
    const LATEST_VERSION = getLatestReleasedVersion();

    if (db.isAvailable()) {
      let query = `
        SELECT 
          COALESCE(a.id, la.agent_id, 'ag_' || SUBSTRING(la.hwid, 1, 16)) as id,
          COALESCE(a.name, la.machine_info->>'hostname', 'Servidor Factusol') as hostname,
          COALESCE(a.organization_id, l.organization_id, 'org_default') as organization_id,
          o.name as company_name,
          COALESCE(l.tax_id, o.tax_id, '') as tax_id,
          l.key as license_key,
          l.alias as license_alias,
          l.plan as plan,
          l.seat_type,
          COALESCE(a.version, '0.3.0') as version,
          COALESCE(a.platform, la.machine_info->>'platform', 'win32') as platform,
          COALESCE(a.last_seen_at, la.last_validated_at) as last_seen_at,
          la.last_validated_at,
          la.activated_at,
          la.hwid,
          la.machine_info,
          a.ip_address
        FROM license_activations la
        JOIN licenses l ON la.license_id = l.id
        LEFT JOIN organizations o ON l.organization_id = o.id
        LEFT JOIN agents a ON (la.agent_id = a.id OR la.hwid = a.id)
        WHERE la.deactivated_at IS NULL
      `;
      const params: any[] = [];
      if (!isSuperadmin) {
        query += ` AND (l.organization_id = $1 OR o.reseller_id = $1)`;
        params.push(orgId);
      }
      query += ` ORDER BY COALESCE(a.last_seen_at, la.last_validated_at) DESC`;

      const result = await db.query(query, params).catch(() => ({ rows: [] }));
      const now = Date.now();
      const OFFLINE_THRESHOLD_MS = 90_000;

      const machines = result.rows.map((row: any) => {
        const lastSeen = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
        const diff = now - lastSeen;
        const isOnline = diff < OFFLINE_THRESHOLD_MS;
        const installedVersion = (row.version || LATEST_VERSION).replace(/^v/, '');
        const isUpToDate = installedVersion === LATEST_VERSION;

        return {
          id: row.id,
          hostname: row.hostname,
          organizationId: row.organization_id,
          companyName: row.company_name || row.license_alias || 'Cliente Bentian',
          taxId: row.tax_id,
          licenseKey: row.license_key,
          licenseAlias: row.license_alias,
          plan: row.plan || 'professional',
          seatType: row.seat_type || 'BASE',
          installedVersion: `v${installedVersion}`,
          latestVersion: `v${LATEST_VERSION}`,
          isUpToDate,
          status: isOnline ? 'ONLINE' : 'OFFLINE',
          isOnline,
          platform: row.platform,
          lastSeenAt: row.last_seen_at,
          lastValidatedAt: row.last_validated_at,
          hwid: row.hwid,
          machineInfo: row.machine_info,
          ipAddress: row.ip_address,
        };
      });

      const totalMachines = machines.length;
      const onlineMachines = machines.filter(m => m.isOnline).length;
      const upToDateMachines = machines.filter(m => m.isUpToDate).length;

      return res.json({
        data: {
          summary: {
            totalMachines,
            onlineMachines,
            upToDateMachines,
            latestVersion: `v${LATEST_VERSION}`,
          },
          machines,
        },
      });
    }

    return res.json({
      data: {
        summary: { totalMachines: 0, onlineMachines: 0, upToDateMachines: 0, latestVersion: `v${LATEST_VERSION}` },
        machines: [],
      },
    });
  } catch (error) {
    return next(error);
  }
});
