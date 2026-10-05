import * as crypto from 'crypto';

/**
 * Prueba de licencia firmada con Ed25519 (asimétrica).
 *
 * El token HS256 original comparte secreto entre servidor y agente, por lo que un agente
 * (que debe poder verificarlo offline) no puede custodiarlo. Esta prueba se añade como capa
 * adicional: el servidor firma con la clave PRIVADA (variable de entorno
 * LICENSE_SIGNING_PRIVATE_KEY) y el agente solo embebe la clave PÚBLICA.
 *
 * Formato (idéntico al verificador del agente en apps/agent/src/license/license-proof.ts):
 *   proof = { payload: base64url(JSON), signature: base64url(Ed25519(DOMAIN + payload)) }
 */
export interface SignedLicenseProof {
  payload: string;
  signature: string;
}

export interface LicenseProofClaims {
  v: 1;
  licenseId: string;
  hwid: string;
  plan: string;
  issuedAt: number;
  expiresAt: number;
}

export const LICENSE_PROOF_DOMAIN = 'bentian-license-proof-v1\n';

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export class LicenseProofService {
  private static cachedKey: crypto.KeyObject | null | undefined;
  private static cachedFrom: string | undefined;

  /** Acepta PEM directo, PEM con \n escapados o PEM en base64 (cómodo para .env / Docker). */
  private static loadPrivateKey(): crypto.KeyObject | null {
    const raw = process.env['LICENSE_SIGNING_PRIVATE_KEY'];
    if (!raw) return null;
    if (this.cachedKey !== undefined && this.cachedFrom === raw) return this.cachedKey;

    let pem = raw.trim().replace(/\\n/g, '\n');
    if (!pem.includes('BEGIN')) {
      pem = Buffer.from(pem, 'base64').toString('utf8');
    }
    try {
      const key = crypto.createPrivateKey(pem);
      if (key.asymmetricKeyType !== 'ed25519') {
        throw new Error('La clave no es Ed25519');
      }
      this.cachedKey = key;
    } catch {
      this.cachedKey = null;
    }
    this.cachedFrom = raw;
    return this.cachedKey;
  }

  public static isConfigured(): boolean {
    return this.loadPrivateKey() !== null;
  }

  /** Firma las claims. Devuelve null si el servidor no tiene clave configurada (modo compatible). */
  public static sign(claims: Omit<LicenseProofClaims, 'v'>): SignedLicenseProof | null {
    const key = this.loadPrivateKey();
    if (!key) return null;
    const payload = b64url(Buffer.from(JSON.stringify({ v: 1, ...claims }), 'utf8'));
    const signature = crypto.sign(null, Buffer.from(LICENSE_PROOF_DOMAIN + payload, 'utf8'), key);
    return { payload, signature: b64url(signature) };
  }
}
