import * as crypto from 'crypto';
import * as fs from 'fs';

// Default public key for verifying ERP Bridge release binaries
export const DEFAULT_UPDATE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA2Sc3emV3VqjbPmw5RXc1aaeaz0dtpzwI7WP6eHhDpBU=
-----END PUBLIC KEY-----`;

export class UpdateVerifier {
  /**
   * Calculates the SHA-256 hash of a file on disk.
   */
  public static calculateFileSHA256(filePath: string): string {
    const hash = crypto.createHash('sha256');
    const fileBuffer = fs.readFileSync(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  /**
   * Verifies both the cryptographic SHA-256 hash and Ed25519 signature of a downloaded binary.
   */
  public static verifyBinary(
    filePath: string,
    expectedSHA256: string,
    signatureBase64: string,
    publicKeyPem?: string
  ): { valid: boolean; reason?: string } {
    if (!fs.existsSync(filePath)) {
      return { valid: false, reason: `El archivo descargado no existe: ${filePath}` };
    }

    // 1. Verify SHA-256 integrity
    const actualSHA256 = this.calculateFileSHA256(filePath);
    if (actualSHA256.toLowerCase() !== expectedSHA256.toLowerCase()) {
      return {
        valid: false,
        reason: `Discrepancia de integridad SHA-256 (Esperado: ${expectedSHA256}, Obtenido: ${actualSHA256})`,
      };
    }

    // 2. Verify Ed25519 digital signature
    const key = publicKeyPem || DEFAULT_UPDATE_PUBLIC_KEY;
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const signature = Buffer.from(signatureBase64, 'base64');
      const isSignatureValid = crypto.verify(null, fileBuffer, key, signature);

      if (!isSignatureValid) {
        return { valid: false, reason: 'Firma digital Ed25519 inválida o no coincide con la clave pública de ERP Bridge' };
      }

      return { valid: true };
    } catch (err) {
      return { valid: false, reason: `Error verificando firma digital: ${String(err)}` };
    }
  }
}
