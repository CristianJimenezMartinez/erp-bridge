import { Request } from 'express';
import { AuthenticatedRequest } from './auth.router';
import { BridgeError, ErrorCode } from '@erp-bridge/sdk';

/**
 * Resuelve la organización sobre la que opera la petición.
 *
 * SEGURIDAD: exige req.user autenticado. Si no hay req.user, lanza 401 Unauthorized.
 * Solo SUPERADMIN/ADMIN pueden apuntar a otra organización mediante la cabecera
 * `x-organization-id` o `?organizationId=`. Cualquier otro rol (RESELLER, TENANT_CLIENT, OPERATOR)
 * queda anclado a la organización de su propio token, de modo que un partner no puede leer
 * conexiones, flujos, agentes ni sincronizaciones de clientes ajenos cambiando una cabecera.
 */
export function resolveOrgId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  if (!user) {
    throw new BridgeError(
      ErrorCode.AUTHENTICATION_FAILED,
      'Autenticación requerida para resolver la organización'
    );
  }
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
    return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || user.organizationId;
  }
  return user.organizationId;
}
