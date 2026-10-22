import * as crypto from 'crypto';
import * as fs from 'fs';

/**
 * Detects whether a string argument was intended to be a filesystem path to a binary/artifact
 * rather than raw inline UTF-8 content. Prevents silent hashing/signing of a path string literal
 * when the target file is missing on disk.
 */
function looksLikeFilesystemPath(value: string): boolean {
  const trimmed = value.trim();
  if (/^[a-zA-Z]:[\\/]/.test(trimmed) || trimmed.startsWith('\\\\') || trimmed.startsWith('/')) {
    return true;
  }
  if (/\.(exe|zip|msi|bin|dll|ps1|bat|cmd|sig|pem|accdb|mdb)$/i.test(trimmed)) {
    return true;
  }
  return false;
}

export class UpdateSigner {
  /**
   * Resolves a file path or Buffer into a Buffer. Throws explicitly if a file path does not exist.
   */
  private static resolvePayloadBuffer(dataOrPath: string | Buffer): Buffer {
    if (Buffer.isBuffer(dataOrPath)) {
      return dataOrPath;
    }

    if (typeof dataOrPath === 'string') {
      if (fs.existsSync(dataOrPath)) {
        const stat = fs.statSync(dataOrPath);
        if (!stat.isFile()) {
          throw new Error(`UpdateSigner: Path is not a regular file: ${dataOrPath}`);
        }
        return fs.readFileSync(dataOrPath);
      }

      if (looksLikeFilesystemPath(dataOrPath)) {
        throw new Error(`UpdateSigner: Target file does not exist on disk: ${dataOrPath}`);
      }

      return Buffer.from(dataOrPath, 'utf8');
    }

    throw new Error('UpdateSigner: Invalid input (expected file path or Buffer)');
  }

  /**
   * Generates a new Ed25519 public/private key pair (SPKI and PKCS8 in PEM format).
   */
  public static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    return { publicKey, privateKey };
  }

  /**
   * Calculates the SHA-256 hash of a file or buffer (64 lowercase hex characters).
   */
  public static calculateSHA256(dataOrPath: string | Buffer): string {
    const buffer = this.resolvePayloadBuffer(dataOrPath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Signs a binary or buffer with an Ed25519 private key.
   * Returns base64-encoded signature.
   */
  public static sign(dataOrPath: string | Buffer, privateKeyPem: string): string {
    const buffer = this.resolvePayloadBuffer(dataOrPath);
    const signature = crypto.sign(null, buffer, privateKeyPem);
    return signature.toString('base64');
  }

  /**
   * Verifies an Ed25519 digital signature against a binary or buffer.
   */
  public static verify(dataOrPath: string | Buffer, signatureBase64: string, publicKeyPem: string): boolean {
    try {
      if (!signatureBase64 || typeof signatureBase64 !== 'string') {
        return false;
      }
      const buffer = this.resolvePayloadBuffer(dataOrPath);
      const signature = Buffer.from(signatureBase64, 'base64');
      if (signature.length !== 64) {
        return false;
      }
      return crypto.verify(null, buffer, publicKeyPem, signature);
    } catch {
      return false;
    }
  }
}
