import * as crypto from 'crypto';
import * as fs from 'fs';

export class UpdateSigner {
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
    const hash = crypto.createHash('sha256');
    if (typeof dataOrPath === 'string' && fs.existsSync(dataOrPath)) {
      const buffer = fs.readFileSync(dataOrPath);
      hash.update(buffer);
    } else if (typeof dataOrPath === 'string') {
      hash.update(dataOrPath, 'utf8');
    } else {
      hash.update(dataOrPath);
    }
    return hash.digest('hex');
  }

  /**
   * Signs a binary or buffer with an Ed25519 private key.
   * Returns base64-encoded signature.
   */
  public static sign(dataOrPath: string | Buffer, privateKeyPem: string): string {
    let buffer: Buffer;
    if (typeof dataOrPath === 'string' && fs.existsSync(dataOrPath)) {
      buffer = fs.readFileSync(dataOrPath);
    } else if (typeof dataOrPath === 'string') {
      buffer = Buffer.from(dataOrPath, 'utf8');
    } else {
      buffer = dataOrPath;
    }

    const signature = crypto.sign(null, buffer, privateKeyPem);
    return signature.toString('base64');
  }

  /**
   * Verifies an Ed25519 digital signature against a binary or buffer.
   */
  public static verify(dataOrPath: string | Buffer, signatureBase64: string, publicKeyPem: string): boolean {
    try {
      let buffer: Buffer;
      if (typeof dataOrPath === 'string' && fs.existsSync(dataOrPath)) {
        buffer = fs.readFileSync(dataOrPath);
      } else if (typeof dataOrPath === 'string') {
        buffer = Buffer.from(dataOrPath, 'utf8');
      } else {
        buffer = dataOrPath;
      }

      const signature = Buffer.from(signatureBase64, 'base64');
      return crypto.verify(null, buffer, publicKeyPem, signature);
    } catch {
      return false;
    }
  }
}
