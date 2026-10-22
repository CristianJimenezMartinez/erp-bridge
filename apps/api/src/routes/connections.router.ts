import { Router, Request, Response, NextFunction } from 'express';
import { ConnectionService } from '@erp-bridge/core';
import {
  CreateConnectionDtoSchema,
  TestConnectionDtoSchema,
  UpdateConnectionDtoSchema,
} from '@erp-bridge/shared';
import { BridgeError, ErrorCode } from '@erp-bridge/sdk';
import { requireAuth, requireRole, AuthenticatedRequest } from './auth.router';
import { resolveOrgId } from './org-scope';

export const connectionsRouter = Router();
const connectionService = new ConnectionService();

const PRIVATE_OR_INTERNAL_HOST_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?|\[?fe80:.*|\[?fc00:.*|\[?fd00:.*|.*\.internal|.*\.local)$/i;

/**
 * Mitigación SSRF y Path Traversal en el servidor Cloud:
 * Impide que configuraciones de conectores apunten a IPs privadas RFC1918, loopback,
 * metadata cloud (169.254.169.254) o rutas del sistema de archivos del contenedor.
 */
export function assertSafeCloudConnectionConfig(config: Record<string, unknown> | undefined): void {
  if (!config || typeof config !== 'object') return;

  const pathKeys = ['databasePath', 'dbPath', 'filePath', 'path'];
  for (const key of pathKeys) {
    const val = config[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      throw new BridgeError(
        ErrorCode.VALIDATION_ERROR,
        `El campo '${key}' apunta a un sistema de archivos local y solo puede probarse desde el Agente de escritorio.`
      );
    }
  }

  const urlKeys = ['storeUrl', 'baseUrl', 'url', 'endpoint', 'apiUrl', 'webhookUrl', 'host'];
  for (const key of urlKeys) {
    const raw = config[key];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const trimmed = raw.trim();

    let parsed: URL;
    try {
      parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    } catch {
      throw new BridgeError(ErrorCode.VALIDATION_ERROR, `URL inválida en configuración (${key})`);
    }

    if (parsed.protocol !== 'https:') {
      throw new BridgeError(
        ErrorCode.VALIDATION_ERROR,
        `El campo '${key}' debe utilizar obligatoriamente HTTPS público.`
      );
    }

    const hostname = parsed.hostname.toLowerCase();
    if (PRIVATE_OR_INTERNAL_HOST_RE.test(hostname)) {
      throw new BridgeError(
        ErrorCode.VALIDATION_ERROR,
        `Destino bloqueado por seguridad anti-SSRF: no se permiten direcciones internas o privadas en '${key}'.`
      );
    }
  }
}

// Require JWT authentication for all connection operations
connectionsRouter.use('/connections', requireAuth);

// Helper to extract organizationId header or fallback
function getOrgId(req: Request): string {
  return resolveOrgId(req);
}

connectionsRouter.get('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const list = await connectionService.list(orgId);
    res.json({ data: list });
  } catch (error) {
    next(error);
  }
});

connectionsRouter.post('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const authReq = req as AuthenticatedRequest;
    const isSuper = authReq.user?.role === 'SUPERADMIN' || authReq.user?.role === 'ADMIN';
    const targetOrgId = isSuper && req.body.organizationId ? req.body.organizationId : orgId;
    const body = { ...req.body, organizationId: targetOrgId };
    const validated = CreateConnectionDtoSchema.parse(body);
    assertSafeCloudConnectionConfig(validated.configuration as Record<string, unknown>);
    const conn = await connectionService.create(validated);
    res.status(201).json({ data: conn });
  } catch (error) {
    next(error);
  }
});

connectionsRouter.get('/connections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const conn = await connectionService.getById(orgId, req.params['id']!);
    res.json({ data: conn });
  } catch (error) {
    next(error);
  }
});

connectionsRouter.put('/connections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const authReq = req as AuthenticatedRequest;
    const isSuper = authReq.user?.role === 'SUPERADMIN' || authReq.user?.role === 'ADMIN';
    const body = { ...req.body };
    if (!isSuper && 'organizationId' in body) {
      body.organizationId = orgId;
    }
    const validated = UpdateConnectionDtoSchema.parse(body);
    if (validated.configuration) {
      assertSafeCloudConnectionConfig(validated.configuration as Record<string, unknown>);
    }
    const conn = await connectionService.update(orgId, req.params['id']!, validated);
    res.json({ data: conn });
  } catch (error) {
    next(error);
  }
});

connectionsRouter.delete('/connections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = getOrgId(req);
    const success = await connectionService.delete(orgId, req.params['id']!);
    res.json({ success });
  } catch (error) {
    next(error);
  }
});

connectionsRouter.post(
  '/connections/test',
  requireRole(['SUPERADMIN', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = TestConnectionDtoSchema.parse(req.body);
      assertSafeCloudConnectionConfig(validated.configuration as Record<string, unknown>);
      const result = await connectionService.testConnection(
        validated.connectorId,
        validated.configuration,
        validated.credentials
      );
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

connectionsRouter.post(
  '/connections/:id/test',
  requireRole(['SUPERADMIN', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = getOrgId(req);
      const existing = await connectionService.getById(orgId, req.params['id']!);
      assertSafeCloudConnectionConfig(existing.configuration as Record<string, unknown>);
      const result = await connectionService.testExistingConnection(orgId, req.params['id']!);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);
