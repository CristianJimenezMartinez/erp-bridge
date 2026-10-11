import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { AdminJwtPayload, AuthenticatedRequest, getClientIp } from '../auth.types';
import { AuthService } from '../auth.service';
import {
  loginAttempts,
  pruneLoginAttempts,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_MS,
  ATTEMPT_WINDOW_MS,
} from '../auth-lockout.manager';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export function handleLogout(req: AuthenticatedRequest, res: Response): void {
  if (req.user?.jti) {
    AuthService.revokeToken(req.user.jti);
  }
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
}

export function handleLogin(req: Request, res: Response): void {
  const clientIp = getClientIp(req);
  const now = Date.now();
  pruneLoginAttempts(now);

  // Comprobar bloqueo activo por fuerza bruta
  const attemptRecord = loginAttempts.get(clientIp);
  if (attemptRecord?.blockedUntil && now < attemptRecord.blockedUntil) {
    const remainingSeconds = Math.ceil((attemptRecord.blockedUntil - now) / 1000);
    res.setHeader('Retry-After', String(remainingSeconds));
    res.status(429).json({
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: `Demasiados intentos fallidos de inicio de sesión. Bloqueo de seguridad activo por ${remainingSeconds} segundos.`,
      },
    });
    return;
  }

  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de inicio de sesión inválidos',
        issues: parsed.error.issues,
      },
    });
    return;
  }

  const { email, password } = parsed.data;
  const adminEmail = process.env['ADMIN_EMAIL'];
  const adminPassword = process.env['ADMIN_PASSWORD'];

  if (!adminEmail || !adminPassword) {
    res.status(500).json({
      error: {
        code: 'AUTH_CONFIG_ERROR',
        message: 'Las credenciales de administrador no están configuradas en las variables de entorno del servidor',
      },
    });
    return;
  }

  const isEmailMatch = email.toLowerCase() === adminEmail.toLowerCase();

  // Comparación segura con crypto.pbkdf2Sync (100.000 iteraciones, salt criptográfico) y crypto.timingSafeEqual
  let isPassMatch = false;
  try {
    if (adminPassword.includes(':')) {
      const [saltHex, storedHashHex] = adminPassword.split(':');
      if (saltHex && storedHashHex) {
        const derived = crypto.pbkdf2Sync(password, saltHex, 100000, 64, 'sha512');
        const storedBuf = Buffer.from(storedHashHex, 'hex');
        if (derived.length === storedBuf.length) {
          isPassMatch = crypto.timingSafeEqual(derived, storedBuf);
        }
      }
    }
    if (!isPassMatch) {
      // Contraseña en variable de entorno con salt criptográfico derivado del secret y email
      const salt = crypto.createHash('sha256').update(`${adminEmail.toLowerCase()}:${AuthService.getSecret()}`).digest('hex');
      const inputDerived = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
      const targetDerived = crypto.pbkdf2Sync(adminPassword, salt, 100000, 64, 'sha512');
      isPassMatch = crypto.timingSafeEqual(inputDerived, targetDerived);
    }
  } catch {
    isPassMatch = false;
  }

  if (!isEmailMatch || !isPassMatch) {
    const current = loginAttempts.get(clientIp) || { count: 0, firstAttempt: now };
    if (now - current.firstAttempt > ATTEMPT_WINDOW_MS) {
      current.count = 1;
      current.firstAttempt = now;
      current.blockedUntil = undefined;
    } else {
      current.count += 1;
    }

    if (current.count >= MAX_LOGIN_ATTEMPTS) {
      current.blockedUntil = now + LOCKOUT_MS;
    }
    loginAttempts.set(clientIp, current);

    res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Credenciales de acceso no válidas',
      },
    });
    return;
  }

  // Éxito: limpiar registro de intentos fallidos para esta IP
  loginAttempts.delete(clientIp);

  const tokenExpiryHours = 24;
  const exp = Date.now() + tokenExpiryHours * 60 * 60 * 1000;

  const payload: AdminJwtPayload = {
    sub: email,
    role: 'SUPERADMIN',
    organizationId: 'org_default',
    exp,
  };

  const token = AuthService.createToken(payload);

  res.json({
    success: true,
    token,
    user: {
      email,
      role: 'SUPERADMIN',
      organizationId: 'org_default',
    },
    expiresAt: new Date(exp).toISOString(),
  });
}
