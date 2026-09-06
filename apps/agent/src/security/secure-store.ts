import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SALT = 'erp-bridge-secure-license-store-salt-v1';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

export class SecureStore {
  private readonly storageDir: string;
  private readonly licenseFilePath: string;

  constructor(customDir?: string) {
    if (customDir) {
      this.storageDir = customDir;
    } else {
      const appData = process.env.APPDATA || (os.platform() === 'darwin' ? path.join(os.homedir(), 'Library', 'Preferences') : path.join(os.homedir(), '.config'));
      this.storageDir = path.join(appData, 'erp-bridge');
    }
    this.licenseFilePath = path.join(this.storageDir, 'license.enc');
  }

  public getStoragePath(): string {
    return this.licenseFilePath;
  }

  public hasLicenseToken(): boolean {
    return fs.existsSync(this.licenseFilePath);
  }

  /**
   * Derives a 256-bit AES key from the machine's HWID using PBKDF2.
   */
  private deriveKey(hwid: string): Buffer {
    return crypto.pbkdf2Sync(hwid, SALT, 100000, 32, 'sha256');
  }

  /**
   * Encrypts and persists a license token bound to this machine's HWID.
   */
  public async saveLicenseToken(token: string, hwid: string): Promise<void> {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    const key = this.deriveKey(hwid);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Payload format: IV (12) + AuthTag (16) + Ciphertext
    const payload = Buffer.concat([iv, authTag, ciphertext]);
    fs.writeFileSync(this.licenseFilePath, payload);
  }

  /**
   * Reads and decrypts the persisted license token using the machine's HWID.
   * If copied to a different machine with different HWID, decryption fails with authentication error.
   */
  public async loadLicenseToken(hwid: string): Promise<string | null> {
    if (!fs.existsSync(this.licenseFilePath)) {
      return null;
    }

    try {
      const payload = fs.readFileSync(this.licenseFilePath);
      if (payload.length < IV_LENGTH + TAG_LENGTH) {
        return null;
      }

      const iv = payload.subarray(0, IV_LENGTH);
      const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const ciphertext = payload.subarray(IV_LENGTH + TAG_LENGTH);

      const key = this.deriveKey(hwid);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      // Return null if hardware fingerprint mismatch (anti-tamper)
      return null;
    }
  }

  /**
   * Deletes the local license token file on deactivation.
   */
  public async deleteLicenseToken(): Promise<void> {
    if (fs.existsSync(this.licenseFilePath)) {
      try {
        fs.unlinkSync(this.licenseFilePath);
      } catch {}
    }
  }
}
