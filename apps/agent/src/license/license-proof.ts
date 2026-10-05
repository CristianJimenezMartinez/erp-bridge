import * as crypto from 'crypto';

/**
 * Verificador de la prueba de licencia firmada con Ed25519.
 *
 * El agente solo conoce la clave PÚBLICA, por lo que un usuario local no puede fabricar una
 * prueba válida (a diferencia del token HS256, cuyo secreto no puede custodiar un cliente).
 * Formato idéntico al firmador del servidor (apps/api/src/services/license-proof.service.ts).
 */
export interface SignedLicenseProof {
  payload: string;
  signature: string;
}

export interface VerifiedLicenseProof {
  licenseId: string;
  hwid: string;
  plan: string;
  issuedAt: number;
  expiresAt: number;
}

export const LICENSE_PROOF_DOMAIN = 'bentian-license-proof-v1\n';

/** Clave pública oficial de firma de licencias (la privada vive solo en el servidor). */
export const DEFAULT_LICENSE_PROOF_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEACVVTSQZYMUTWHDxBgc0ISCVN1NqLkkmW8qH3Dy+2Kwo=
-----END PUBLIC KEY-----`;

function fromB64url(s: string): Buffer {
  let b = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  return Buffer.from(b, 'base64');
}

export function isSignedLicenseProof(value: unknown): value is SignedLicenseProof {
  const v = value as SignedLicenseProof | null;
  return !!v && typeof v.payload === 'string' && typeof v.signature === 'string';
}

/**
 * Verifica firma, versión y vinculación con el HWID de este equipo.
 * No comprueba expiración: la decisión temporal la toma LicenseService.
 * @param publicKeyPem Solo para tests; en producción se usa siempre la clave embebida.
 */
export function verifyLicenseProof(
  proof: unknown,
  hwid: string,
  publicKeyPem: string = DEFAULT_LICENSE_PROOF_PUBLIC_KEY,
): VerifiedLicenseProof | null {
  if (!isSignedLicenseProof(proof)) return null;
  try {
    const key = crypto.createPublicKey(publicKeyPem);
    const ok = crypto.verify(
      null,
      Buffer.from(LICENSE_PROOF_DOMAIN + proof.payload, 'utf8'),
      key,
      fromB64url(proof.signature),
    );
    if (!ok) return null;

    const claims = JSON.parse(fromB64url(proof.payload).toString('utf8')) as Partial<VerifiedLicenseProof> & { v?: number };
    if (
      claims.v !== 1 ||
      typeof claims.licenseId !== 'string' ||
      typeof claims.hwid !== 'string' ||
      typeof claims.plan !== 'string' ||
      typeof claims.issuedAt !== 'number' ||
      typeof claims.expiresAt !== 'number'
    ) {
      return null;
    }
    if (claims.hwid !== hwid) return null;

    return {
      licenseId: claims.licenseId,
      hwid: claims.hwid,
      plan: claims.plan,
      issuedAt: claims.issuedAt,
      expiresAt: claims.expiresAt,
    };
  } catch {
    return null;
  }
}
