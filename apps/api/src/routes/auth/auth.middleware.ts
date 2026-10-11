import { Response, NextFunction } from 'express';
import { UserRole, AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' },
      });
      return;
    }

    const currentRole = req.user.role;
    const effectiveRole: UserRole =
      currentRole === 'ADMIN' ? 'SUPERADMIN' : (currentRole === 'OPERATOR' ? 'TENANT_CLIENT' : currentRole);

    const normalizedAllowed: UserRole[] = allowedRoles.map((r) =>
      r === 'ADMIN' ? 'SUPERADMIN' : (r === 'OPERATOR' ? 'TENANT_CLIENT' : r)
    );

    if (normalizedAllowed.includes(effectiveRole)) {
      next();
    } else {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Permisos insuficientes para realizar esta acción',
        },
      });
    }
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Acceso denegado: Cabecera Authorization Bearer requerida',
      },
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  const verification = AuthService.verifyToken(token);

  if (!verification.valid || !verification.payload) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: verification.reason || 'Token de autenticación no válido',
      },
    });
    return;
  }

  req.user = verification.payload;
  next();
}
