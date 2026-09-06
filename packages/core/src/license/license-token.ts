import * as crypto from 'crypto';
import { LicenseTokenPayload, LicenseTokenPayloadSchema } from '@erp-bridge/shared';

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

export class LicenseTokenManager {
  private static readonly DEFAULT_SECRET = 'erp-bridge-default-jwt-secret-replace-in-prod-v1';

  /**
   * Signs a LicenseTokenPayload into a standard HMAC-SHA256 JWT token.
   */
  public static createToken(payload: LicenseTokenPayload, secret?: string): string {
    const key = secret || process.env.LICENSE_JWT_SECRET || this.DEFAULT_SECRET;
    const header = { alg: 'HS256', typ: 'JWT' };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto.createHmac('sha256', key).update(dataToSign).digest();
    const encodedSignature = base64UrlEncode(signature);

    return `${dataToSign}.${encodedSignature}`;
  }

  /**
   * Verifies the cryptographic signature and expiration of a license token.
   */
  public static verifyToken(
    token: string,
    secret?: string
  ): { valid: boolean; payload?: LicenseTokenPayload; reason?: string } {
    if (!token || typeof token !== 'string') {
      return { valid: false, reason: 'Token is empty or not a string' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid token structure' };
    }

    const encodedHeader = parts[0];
    const encodedPayload = parts[1];
    const encodedSignature = parts[2];

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return { valid: false, reason: 'Invalid token structure' };
    }

    const key = secret || process.env.LICENSE_JWT_SECRET || this.DEFAULT_SECRET;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto.createHmac('sha256', key).update(dataToSign).digest();
    const expectedEncodedSignature = base64UrlEncode(expectedSignature);

    // Timing-safe comparison to prevent side-channel timing attacks
    const sigBuf = Buffer.from(encodedSignature);
    const expectedBuf = Buffer.from(expectedEncodedSignature);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, reason: 'Invalid token signature' };
    }

    try {
      const decodedPayloadJson = base64UrlDecode(encodedPayload);
      const rawPayload = JSON.parse(decodedPayloadJson);
      const parsed = LicenseTokenPayloadSchema.parse(rawPayload);

      // Verify expiration
      if (Date.now() > parsed.expiresAt) {
        return { valid: false, payload: parsed, reason: 'License token has expired' };
      }

      return { valid: true, payload: parsed };
    } catch (err) {
      return { valid: false, reason: `Failed to decode payload: ${String(err)}` };
    }
  }

  /**
   * Decodes the payload of a token without signature verification (read-only inspect).
   */
  public static decodeUnverified(token: string): LicenseTokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) return null;
      const decoded = base64UrlDecode(parts[1]);
      return LicenseTokenPayloadSchema.parse(JSON.parse(decoded));
    } catch {
      return null;
    }
  }
}
