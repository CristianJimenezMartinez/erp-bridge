import * as crypto from 'crypto';

/**
 * Crockford Base32 character set (32 chars)
 * Excludes I, L, O, U to eliminate visual ambiguity and accidental profanity.
 */
const CROCKFORD_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Calculates a 10-bit checksum (2 Crockford chars) over an 18-character payload string.
 */
function calculateChecksum(payload: string): string {
  let crc = 0x1f; // 5-bit initial value
  for (let i = 0; i < payload.length; i++) {
    const char = payload[i];
    if (!char) continue;
    const charIndex = CROCKFORD_CHARS.indexOf(char);
    if (charIndex === -1) continue;
    crc = ((crc << 5) ^ (crc >> 7) ^ charIndex) & 0x3ff; // 10-bit accumulator
  }
  const c1 = CROCKFORD_CHARS[(crc >> 5) & 0x1f];
  const c2 = CROCKFORD_CHARS[crc & 0x1f];
  return `${c1}${c2}`;
}

export class LicenseKeyGenerator {
  /**
   * Generates a cryptographically secure license key.
   * Format: EB-XXXXX-XXXXX-XXXXX-XXXXX (20 chars total after EB-)
   * 18 chars of entropy + 2 chars of integrated checksum.
   */
  public static generate(): string {
    const bytes = crypto.randomBytes(18);
    let entropy = '';
    for (let i = 0; i < 18; i++) {
      const byte = bytes[i] ?? 0;
      entropy += CROCKFORD_CHARS[byte % 32];
    }

    const checksum = calculateChecksum(entropy);
    const fullBody = entropy + checksum; // exactly 20 chars

    const g1 = fullBody.substring(0, 5);
    const g2 = fullBody.substring(5, 10);
    const g3 = fullBody.substring(10, 15);
    const g4 = fullBody.substring(15, 20);

    return `EB-${g1}-${g2}-${g3}-${g4}`;
  }

  /**
   * Normalizes a user-input license key by trimming, converting to uppercase,
   * and handling common visual substitutions (O->0, I/L->1).
   */
  public static normalize(rawKey: string): string {
    if (!rawKey) return '';
    let cleaned = rawKey
      .trim()
      .toUpperCase()
      .replace(/[\s_]/g, '-')
      .replace(/O/g, '0')
      .replace(/[IL]/g, '1');

    if (!cleaned.startsWith('EB-') && cleaned.startsWith('EB')) {
      cleaned = 'EB-' + cleaned.substring(2);
    }
    return cleaned;
  }

  /**
   * Validates both the format structure and the embedded checksum of a license key.
   */
  public static validate(key: string): { valid: boolean; reason?: string } {
    if (!key) {
      return { valid: false, reason: 'Key is empty' };
    }

    const normalized = this.normalize(key);
    const match = normalized.match(/^EB-([0-9A-HJ-NP-Z]{5})-([0-9A-HJ-NP-Z]{5})-([0-9A-HJ-NP-Z]{5})-([0-9A-HJ-NP-Z]{5})$/);

    if (!match || !match[1] || !match[2] || !match[3] || !match[4]) {
      return { valid: false, reason: 'Invalid license key format' };
    }

    const fullBody = match[1] + match[2] + match[3] + match[4];
    const entropy = fullBody.substring(0, 18);
    const checksum = fullBody.substring(18, 20);

    const expectedChecksum = calculateChecksum(entropy);
    if (checksum !== expectedChecksum) {
      return { valid: false, reason: 'License key checksum mismatch' };
    }

    return { valid: true };
  }
}
