import * as crypto from 'crypto';
import * as fs from 'fs';
import { VerificationResult } from './update.types';

// Clave pública oficial por defecto para verificar releases firmadas con Ed25519
export const DEFAULT_UPDATE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA2Sc3emV3VqjbPmw5RXc1aaeaz0dtpzwI7WP6eHhDpBU=
-----END PUBLIC KEY-----`;

export class UpdateVerifier {
  /**
   * Calcula el hash criptográfico SHA-256 de un archivo en disco de forma síncrona.
   */
  public static calculateFileSHA256(filePath: string): string {
    const hash = crypto.createHash('sha256');
    const fileBuffer = fs.readFileSync(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex').toLowerCase();
  }

  /**
   * Calcula el hash SHA-256 en streaming para archivos de gran volumen.
   */
  public static calculateFileSHA256Stream(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex').toLowerCase()));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Calcula el hash SHA-256 de un Buffer en memoria.
   */
  public static calculateBufferSHA256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();
  }

  /**
   * Valida la firma digital Ed25519 contra un archivo o buffer utilizando una clave pública en formato PEM.
   */
  public static verifyEd25519(
    dataOrPath: string | Buffer,
    signatureBase64: string,
    publicKeyPem: string
  ): boolean {
    try {
      const buffer = typeof dataOrPath === 'string' && fs.existsSync(dataOrPath)
        ? fs.readFileSync(dataOrPath)
        : typeof dataOrPath === 'string'
          ? Buffer.from(dataOrPath, 'utf8')
          : dataOrPath;

      const signature = Buffer.from(signatureBase64.trim(), 'base64');
      return crypto.verify(null, buffer, publicKeyPem, signature);
    } catch {
      return false;
    }
  }

  /**
   * Valida una firma de autenticación HMAC-SHA256 con protección contra ataques de temporización (timing-safe).
   */
  public static verifyHMAC(
    dataOrPath: string | Buffer,
    expectedSignature: string,
    hmacSecret: string
  ): boolean {
    try {
      const buffer = typeof dataOrPath === 'string' && fs.existsSync(dataOrPath)
        ? fs.readFileSync(dataOrPath)
        : typeof dataOrPath === 'string'
          ? Buffer.from(dataOrPath, 'utf8')
          : dataOrPath;

      const cleanSig = expectedSignature.trim();
      const isHex = cleanSig.length === 64 && /^[0-9a-fA-F]+$/.test(cleanSig);
      const expectedBuffer = isHex ? Buffer.from(cleanSig, 'hex') : Buffer.from(cleanSig, 'base64');

      const computedBuffer = crypto.createHmac('sha256', hmacSecret).update(buffer).digest();

      if (computedBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(computedBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Verifica integralmente el binario descargado:
   * 1. Existencia del archivo.
   * 2. Integridad del hash SHA-256.
   * 3. Autenticidad criptográfica mediante Ed25519 (o HMAC si se suministra secreto).
   */
  public static verifyBinary(
    filePath: string,
    expectedSHA256: string,
    signature: string,
    publicKeyPem?: string,
    hmacSecret?: string
  ): VerificationResult {
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        sha256Valid: false,
        signatureValid: false,
        reason: `El archivo descargado no existe: ${filePath}`,
      };
    }

    // 1. Verificación de integridad SHA-256
    const actualSHA256 = this.calculateFileSHA256(filePath);
    const sha256Valid = actualSHA256 === expectedSHA256.trim().toLowerCase();

    if (!sha256Valid) {
      return {
        valid: false,
        sha256Valid: false,
        signatureValid: false,
        calculatedSha256: actualSHA256,
        reason: `Discrepancia de integridad SHA-256 (Esperado: ${expectedSHA256.toLowerCase()}, Obtenido: ${actualSHA256})`,
      };
    }

    // 2. Verificación de firma criptográfica
    let signatureValid = false;
    let reason: string | undefined;

    if (hmacSecret) {
      signatureValid = this.verifyHMAC(filePath, signature, hmacSecret);
      if (!signatureValid) {
        reason = 'Firma HMAC-SHA256 inválida o clave secreta no coincidente.';
      }
    } else {
      const key = publicKeyPem || DEFAULT_UPDATE_PUBLIC_KEY;
      signatureValid = this.verifyEd25519(filePath, signature, key);
      if (!signatureValid) {
        reason = 'Firma digital Ed25519 inválida o no coincide con la clave pública de Bentian ERP Bridge.';
      }
    }

    return {
      valid: sha256Valid && signatureValid,
      sha256Valid,
      signatureValid,
      calculatedSha256: actualSHA256,
      reason,
    };
  }
}
