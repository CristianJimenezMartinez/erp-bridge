import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { LicenseService } from '@erp-bridge/core';
import { MailerService } from '../services/mailer.service';
import { EmailProtectionService } from '../services/email-protection.service';
import { Logger } from '@erp-bridge/shared';

const logger = new Logger('AuthRouter');

export function computeOrganizationIdFromEmail(email: string): string {
  const normalized = (email || '').toLowerCase().trim();
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  return `org_${hash}`;
}

export type UserRole = 'SUPERADMIN' | 'RESELLER' | 'TENANT_CLIENT' | 'ADMIN' | 'OPERATOR';

export interface AdminJwtPayload {
  sub: string;
  role: UserRole;
  organizationId: string;
  resellerId?: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AdminJwtPayload;
}

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

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export class AuthService {
  private static readonly SECRET =
    process.env['ADMIN_JWT_SECRET'] || (process.env['NODE_ENV'] === 'production' ? crypto.randomBytes(32).toString('hex') : 'bentian-dev-jwt-secret');

  public static getSecret(): string {
    return this.SECRET;
  }

  public static createToken(payload: AdminJwtPayload): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto.createHmac('sha256', this.SECRET).update(dataToSign).digest();
    const encodedSignature = base64UrlEncode(signature);

    return `${dataToSign}.${encodedSignature}`;
  }

  public static verifyToken(token: string): { valid: boolean; payload?: AdminJwtPayload; reason?: string } {
    if (!token || typeof token !== 'string') {
      return { valid: false, reason: 'Token no proporcionado' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Estructura de token JWT inválida' };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return { valid: false, reason: 'Partes de token incompletas' };
    }

    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto.createHmac('sha256', this.SECRET).update(dataToSign).digest();
    const expectedEncodedSignature = base64UrlEncode(expectedSignature);

    const sigBuf = Buffer.from(encodedSignature);
    const expectedBuf = Buffer.from(expectedEncodedSignature);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, reason: 'Firma de token inválida' };
    }

    try {
      const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminJwtPayload;
      const expMs = payload.exp ? (payload.exp > 1e11 ? payload.exp : payload.exp * 1000) : 0;
      if (expMs && Date.now() > expMs) {
        return { valid: false, reason: 'El token ha expirado' };
      }
      return { valid: true, payload };
    } catch {
      return { valid: false, reason: 'Error al decodificar payload JWT' };
    }
  }
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

export interface LoginAttemptRecord {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos de bloqueo
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // Ventana de 15 minutos
export const loginAttempts = new Map<string, LoginAttemptRecord>();

export interface EmailOtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}
export const pendingEmailOtps = new Map<string, EmailOtpRecord>();

export function clearEmailOtps(): void {
  pendingEmailOtps.clear();
}

export function clearLoginAttempts(): void {
  loginAttempts.clear();
  pendingEmailOtps.clear();
}

function pruneLoginAttempts(now: number): void {
  for (const [key, record] of loginAttempts.entries()) {
    if (record.blockedUntil && now < record.blockedUntil) continue;
    if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
}

export const authRouter = Router();

// POST /api/v1/auth/login
authRouter.post('/auth/login', (req: Request, res: Response): void => {
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : null) || req.socket.remoteAddress || req.ip || '127.0.0.1';
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
});

// POST /api/v1/auth/partner-login (Acceso para Empresas Instaladoras / Partners / Resellers)
authRouter.post('/auth/partner-login', (req: Request, res: Response): void => {
  const { partnerCode, partnerSecret, partnerEmail } = req.body as {
    partnerCode?: string;
    partnerSecret?: string;
    partnerEmail?: string;
  };

  if (!partnerCode || typeof partnerCode !== 'string') {
    res.status(400).json({
      error: {
        code: 'MISSING_PARTNER_CODE',
        message: 'Introduce tu código de Partner o Empresa Instaladora autorizado',
      },
    });
    return;
  }

  const cleanCode = partnerCode.trim().toUpperCase();
  // Validar formato partner: código tipo PT-XXXX o reseller asignado
  if (!cleanCode.startsWith('PT-') && !cleanCode.startsWith('PARTNER-')) {
    res.status(401).json({
      error: {
        code: 'INVALID_PARTNER_CODE',
        message: 'Código de Partner no reconocido. Los códigos de partner comienzan por PT-',
      },
    });
    return;
  }

  // Validación de clave secreta del Partner
  const expectedSecret = process.env['PARTNER_SECRET'] || process.env['ADMIN_PASSWORD'] || 'bentian-partner-2026';
  const providedSecret = typeof partnerSecret === 'string' ? partnerSecret.trim() : '';

  let isSecretValid = false;
  try {
    const provBuf = Buffer.from(providedSecret, 'utf8');
    const expBuf = Buffer.from(expectedSecret, 'utf8');
    if (provBuf.length === expBuf.length && provBuf.length > 0) {
      isSecretValid = crypto.timingSafeEqual(provBuf, expBuf);
    }
  } catch {
    isSecretValid = false;
  }

  if (!isSecretValid) {
    res.status(401).json({
      error: {
        code: 'INVALID_PARTNER_SECRET',
        message: 'Clave secreta o PIN de Partner incorrecto',
      },
    });
    return;
  }

  const resellerId = `reseller_${crypto.createHash('sha256').update(cleanCode).digest('hex').substring(0, 10)}`;
  const email = partnerEmail ? partnerEmail.trim().toLowerCase() : `${cleanCode.toLowerCase()}@partner.cristianjm.com`;

  const exp = Date.now() + 24 * 60 * 60 * 1000;
  const payload: AdminJwtPayload = {
    sub: email,
    role: 'RESELLER',
    organizationId: resellerId,
    resellerId: cleanCode,
    exp,
  };

  const token = AuthService.createToken(payload);

  res.json({
    success: true,
    token,
    user: {
      email,
      partnerCode: cleanCode,
      role: 'RESELLER',
      resellerId: cleanCode,
      organizationId: resellerId,
    },
    expiresAt: new Date(exp).toISOString(),
  });
});

// GET /api/v1/auth/me
authRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    user: req.user,
  });
});

const authLicenseService = new LicenseService();

// POST /api/v1/auth/license-session (Acceso 1-clic y login directo por clave)
authRouter.post('/auth/license-session', async (req: Request, res: Response): Promise<void> => {
  try {
    const { licenseKey } = req.body as { licenseKey?: string };
    if (!licenseKey || typeof licenseKey !== 'string') {
      res.status(400).json({
        error: {
          code: 'MISSING_LICENSE_KEY',
          message: 'Se requiere una clave de licencia válida',
        },
      });
      return;
    }

    const trimmedKey = licenseKey.trim();
    const license = await authLicenseService.getLicenseByKey(trimmedKey);
    if (!license) {
      res.status(401).json({
        error: {
          code: 'INVALID_LICENSE',
          message: 'Clave de licencia no encontrada o formato no válido',
        },
      });
      return;
    }

    if (license.status === 'revoked' || license.status === 'suspended') {
      res.status(403).json({
        error: {
          code: 'LICENSE_INACTIVE',
          message: `La licencia no está activa (Estado: ${license.status})`,
        },
      });
      return;
    }

    const exp = Date.now() + 48 * 60 * 60 * 1000; // 48 horas de vigencia
    const payload: AdminJwtPayload = {
      sub: license.key,
      role: 'TENANT_CLIENT',
      organizationId: license.organizationId,
      exp,
    };

    const token = AuthService.createToken(payload);

    res.json({
      success: true,
      token,
      user: {
        key: license.key,
        role: 'TENANT_CLIENT',
        organizationId: license.organizationId,
        plan: license.plan,
        alias: license.alias || 'Servidor Factusol',
      },
      expiresAt: new Date(exp).toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al verificar la clave de licencia',
      },
    });
  }
});

// POST /api/v1/auth/email-session (Acceso por correo de facturación Stripe con verificación OTP o Clave)
authRouter.post('/auth/email-session', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, licenseKey } = req.body as { email?: string; otp?: string; licenseKey?: string };
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({
        error: {
          code: 'INVALID_EMAIL',
          message: 'Introduce una dirección de correo electrónico válida',
        },
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const adminEmail = process.env['ADMIN_EMAIL'];
    if (adminEmail && cleanEmail === adminEmail.toLowerCase()) {
      res.status(400).json({
        error: {
          code: 'ADMIN_ACCOUNT',
          message: 'Esta dirección corresponde al Superadministrador. Inicia sesión en la pestaña Superadmin con tu contraseña.',
        },
      });
      return;
    }

    const orgId = computeOrganizationIdFromEmail(cleanEmail);
    const licenses = await authLicenseService.listLicenses(orgId);

    if (!licenses || licenses.length === 0) {
      res.status(404).json({
        error: {
          code: 'NO_LICENSES_FOUND',
          message: `No se encontraron licencias activas vinculadas a ${cleanEmail}. Comprueba el correo o usa tu clave de licencia.`,
        },
      });
      return;
    }

    const exp = Date.now() + 48 * 60 * 60 * 1000;
    const payload: AdminJwtPayload = {
      sub: cleanEmail,
      role: 'TENANT_CLIENT',
      organizationId: orgId,
      exp,
    };

    // Caso 1: Se proporciona licenseKey para validación directa 2-factor
    if (licenseKey && typeof licenseKey === 'string') {
      const match = licenses.find(l => l.key.toUpperCase() === licenseKey.trim().toUpperCase());
      if (!match) {
        res.status(401).json({
          error: {
            code: 'INVALID_LICENSE_KEY',
            message: 'La clave de licencia proporcionada no corresponde a esta cuenta',
          },
        });
        return;
      }

      const token = AuthService.createToken(payload);
      res.json({
        success: true,
        token,
        user: {
          email: cleanEmail,
          role: 'TENANT_CLIENT',
          organizationId: orgId,
        },
        licenses,
        expiresAt: new Date(exp).toISOString(),
      });
      return;
    }

    // Caso 2: Se proporciona código OTP
    if (otp && typeof otp === 'string') {
      const otpRecord = pendingEmailOtps.get(cleanEmail);
      if (!otpRecord || Date.now() > otpRecord.expiresAt) {
        pendingEmailOtps.delete(cleanEmail);
        res.status(401).json({
          error: {
            code: 'OTP_EXPIRED',
            message: 'El código de acceso ha expirado o no existe. Solicita un nuevo código.',
          },
        });
        return;
      }

      if (otpRecord.attempts >= 3) {
        pendingEmailOtps.delete(cleanEmail);
        res.status(429).json({
          error: {
            code: 'OTP_TOO_MANY_ATTEMPTS',
            message: 'Demasiados intentos fallidos. Se ha invalidado el código. Solicita uno nuevo.',
          },
        });
        return;
      }

      const provBuf = Buffer.from(otp.trim(), 'utf8');
      const expBuf = Buffer.from(otpRecord.code, 'utf8');
      const isOtpMatch = provBuf.length === expBuf.length && crypto.timingSafeEqual(provBuf, expBuf);

      if (!isOtpMatch) {
        otpRecord.attempts += 1;
        res.status(401).json({
          error: {
            code: 'INVALID_OTP',
            message: `Código de acceso no válido. Intentos restantes: ${3 - otpRecord.attempts}`,
          },
        });
        return;
      }

      // Código verificado con éxito: limpiar OTP
      pendingEmailOtps.delete(cleanEmail);

      const token = AuthService.createToken(payload);
      res.json({
        success: true,
        token,
        user: {
          email: cleanEmail,
          role: 'TENANT_CLIENT',
          organizationId: orgId,
        },
        licenses,
        expiresAt: new Date(exp).toISOString(),
      });
      return;
    }

    // Caso 3: No se proporciona OTP ni licenseKey -> Solicitar código OTP por correo
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : null) || req.socket.remoteAddress || req.ip || '127.0.0.1';

    // A. Comprobar rate limit, cooldown y presupuesto de Resend
    const check = EmailProtectionService.checkOtpAllowed(cleanEmail, clientIp);
    if (!check.allowed) {
      if (check.retryAfterSeconds) {
        res.setHeader('Retry-After', String(check.retryAfterSeconds));
      }
      res.status(429).json({
        error: {
          code: check.code || 'TOO_MANY_REQUESTS',
          message: check.reason,
          retryAfterSeconds: check.retryAfterSeconds,
        },
      });
      return;
    }

    // B. Reutilización de código existente vigente vs nuevo código
    let generatedOtp: string;
    const existingOtp = pendingEmailOtps.get(cleanEmail);
    const validityMinutes = 10;

    if (existingOtp && Date.now() < existingOtp.expiresAt && existingOtp.attempts < 3) {
      // Reutilizar el mismo código para no desincronizar al usuario si el anterior sigue en tránsito
      generatedOtp = existingOtp.code;
    } else {
      // Generar nuevo código criptográfico de 6 dígitos
      generatedOtp = crypto.randomInt(100000, 999999).toString();
      pendingEmailOtps.set(cleanEmail, {
        code: generatedOtp,
        expiresAt: Date.now() + validityMinutes * 60 * 1000,
        attempts: 0,
      });
    }

    // C. Registrar consumo en el monitor de cuota y rate-limiting
    EmailProtectionService.recordOtpSent(cleanEmail, clientIp);

    // D. Despachar email oficial formateado con texto plano y HTML responsive
    MailerService.sendLoginOtpEmail({
      email: cleanEmail,
      otp: generatedOtp,
      validityMinutes,
    }).catch((err) => {
      // Registrar en log pero no romper la respuesta del cliente
      logger.error('Error al despachar email de código OTP:', err instanceof Error ? err.message : String(err));
    });


    res.json({
      success: true,
      requireOtp: true,
      message: `Hemos enviado un código de acceso de 6 dígitos a ${cleanEmail}`,
      email: cleanEmail,
      cooldownSeconds: 60,
      ...(process.env['NODE_ENV'] !== 'production' ? { debugOtp: generatedOtp } : {}),
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al procesar la sesión por correo',
      },
    });
  }
});

