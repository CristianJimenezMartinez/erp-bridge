import { Request } from 'express';
import { AuthenticatedRequest } from './auth.router';

/**
 * Resuelve la organización sobre la que opera la petición.
 *
 * SEGURIDAD: solo SUPERADMIN/ADMIN pueden apuntar a otra organización mediante la cabecera
 * `x-organization-id` o `?organizationId=`. Cualquier otro rol (RESELLER, TENANT_CLIENT, OPERATOR)
 * queda anclado a la organización de su propio token, de modo que un partner no puede leer
 * conexiones, flujos, agentes ni sincronizaciones de clientes ajenos cambiando una cabecera.
 */
export function resolveOrgId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;
  if (!user) {
    return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || 'org_default';
  }
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
    return (req.headers['x-organization-id'] as string) || (req.query['organizationId'] as string) || user.organizationId;
  }
  return user.organizationId;
}
