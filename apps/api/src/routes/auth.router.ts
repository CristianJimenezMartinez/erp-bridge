import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';

export interface AdminJwtPayload {
  sub: string;
  role: 'ADMIN' | 'OPERATOR';
  organizationId: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AdminJwtPayload;
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

export function clearLoginAttempts(): void {
  loginAttempts.clear();
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
    role: 'ADMIN',
    organizationId: 'org_default',
    exp,
  };

  const token = AuthService.createToken(payload);

  res.json({
    success: true,
    token,
    user: {
      email,
      role: 'ADMIN',
      organizationId: 'org_default',
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
