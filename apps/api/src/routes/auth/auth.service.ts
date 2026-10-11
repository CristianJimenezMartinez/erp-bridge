import crypto from 'crypto';
import { AdminJwtPayload, UserRole } from './auth.types';

export function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export class AuthService {
  private static readonly SECRET =
    process.env['ADMIN_JWT_SECRET'] || (process.env['NODE_ENV'] === 'production' ? crypto.randomBytes(32).toString('hex') : 'bentian-dev-jwt-secret');

  private static readonly revokedJtis = new Set<string>();

  public static getSecret(): string {
    return this.SECRET;
  }

  public static revokeToken(jti: string): void {
    if (jti) {
      this.revokedJtis.add(jti);
    }
  }

  public static isRevoked(jti: string): boolean {
    return Boolean(jti && this.revokedJtis.has(jti));
  }

  public static clearRevokedTokens(): void {
    this.revokedJtis.clear();
  }

  public static generateToken(payload: Partial<AdminJwtPayload> & { sub: string; role: UserRole; organizationId: string }): string {
    const jti = payload.jti || crypto.randomUUID();
    const exp = payload.exp || Math.floor(Date.now() / 1000) + 24 * 3600;
    return this.createToken({
      ...payload,
      jti,
      exp,
    });
  }

  public static createToken(payload: AdminJwtPayload): string {
    const jti = payload.jti || crypto.randomUUID();
    const exp = payload.exp || Math.floor(Date.now() / 1000) + 24 * 3600;
    const fullPayload: AdminJwtPayload = {
      ...payload,
      jti,
      exp,
    };

    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
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

    const sigBuf = Buffer.from(encodedSignature, 'utf8');
    const expectedBuf = Buffer.from(expectedEncodedSignature, 'utf8');

    if (sigBuf.length !== expectedBuf.length) {
      crypto.timingSafeEqual(expectedBuf, expectedBuf);
      return { valid: false, reason: 'Firma de token inválida' };
    }
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, reason: 'Firma de token inválida' };
    }

    try {
      const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminJwtPayload;
      if (!payload.exp) {
        return { valid: false, reason: 'Token sin fecha de expiración' };
      }
      const expMs = payload.exp > 1e11 ? payload.exp : payload.exp * 1000;
      if (Date.now() > expMs) {
        return { valid: false, reason: 'El token ha expirado' };
      }
      if (payload.jti && AuthService.isRevoked(payload.jti)) {
        return { valid: false, reason: 'Token revocado' };
      }
      return { valid: true, payload };
    } catch {
      return { valid: false, reason: 'Error al decodificar payload JWT' };
    }
  }
}
