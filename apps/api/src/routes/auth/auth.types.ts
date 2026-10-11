import { Request } from 'express';
import crypto from 'crypto';

export type UserRole = 'SUPERADMIN' | 'RESELLER' | 'TENANT_CLIENT' | 'ADMIN' | 'OPERATOR';

export interface AdminJwtPayload {
  sub: string;
  role: UserRole;
  organizationId: string;
  resellerId?: string;
  exp: number;
  jti?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AdminJwtPayload;
}

export interface LoginAttemptRecord {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

export interface EmailOtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

export function computeOrganizationIdFromEmail(email: string): string {
  const normalized = (email || '').toLowerCase().trim();
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  return `org_${hash}`;
}

/**
 * IP del cliente basada en req.ip (respeta `trust proxy` de Express).
 * SEGURIDAD: nunca confiar directamente en la cabecera X-Forwarded-For enviada por el
 * cliente, ya que rotarla permitiría saltarse el bloqueo por fuerza bruta.
 */
export function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}
