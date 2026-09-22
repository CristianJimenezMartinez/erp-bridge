import { Router, Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { AgentService, UpdateService, DatabaseService } from '@erp-bridge/core';
import { AgentHeartbeatPayloadSchema, AgentPairingRequestSchema } from '@erp-bridge/shared';
import { requireAuth, requireRole, AuthenticatedRequest } from './auth.router';

export const agentsRouter = Router();
const agentService = new AgentService();
const updateService = new UpdateService();

function getLatestReleasedVersion(): string {
  try {
    const latestJsonPath = path.resolve(__dirname, '../../../../releases/latest.json');
    if (fs.existsSync(latestJsonPath)) {
      const parsed = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));
      if (parsed.latestVersion) return parsed.latestVersion;
    }
  } catch {}
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
    if (pkg.version) return pkg.version;
  } catch {}
  return '0.3.1';
}

function getOrgId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  if (authReq.user && authReq.user.role === 'TENANT_CLIENT') {
    return authReq.user.organizationId;
  }
  return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || (authReq.user ? authReq.user.organizationId : 'org_default');
}

// 1. List agents (Protected - Consulta unificada de máquinas activas por licencia y agentes)
agentsRouter.get('/agents', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const db = DatabaseService.getInstance();
    const isSuperadmin = req.user?.role === 'SUPERADMIN';
    const isAdmin = req.user?.role === 'ADMIN';

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

      if (!isSuperadmin && !isAdmin) {
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

      return res.json({ data: unified });
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
    const { agentId, organizationId, errorCode, message, details } = req.body as {
      agentId?: string;
      organizationId?: string;
      errorCode?: string;
      message?: string;
      details?: any;
    };
    if (!errorCode || !message) {
      return res.status(400).json({ error: { message: 'errorCode y message son requeridos' } });
    }
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

// 3. Generate pairing token (Protected)
agentsRouter.post('/agents/pairing-token', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const tokenData = await agentService.generatePairingToken(orgId, req.body.createdById);
    return res.status(201).json({ data: tokenData });
  } catch (error) {
    return next(error);
  }
});

agentsRouter.post('/agents/pair', async (req: Request, res: Response, next: NextFunction) => {
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

      const agentName = req.body.systemInfo?.hostname || req.body.name || 'Servidor Factusol';
      const version = validated.version || (req.body.version as string) || '0.3.0';
      const platform = req.body.systemInfo?.platform || req.body.platform || 'win32';
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;

      await db.query(
        `INSERT INTO agents (id, organization_id, name, status, version, last_seen_at, ip_address, platform, updated_at)
         VALUES ($1, $2, $3, 'ONLINE', $4, CURRENT_TIMESTAMP, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE
         SET organization_id = EXCLUDED.organization_id,
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
      const LATEST_VERSION = getLatestReleasedVersion();

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
        summary: { totalMachines: 0, onlineMachines: 0, upToDateMachines: 0, latestVersion: 'v0.3.0' },
        machines: [],
      },
    });
  } catch (error) {
    return next(error);
  }
});
