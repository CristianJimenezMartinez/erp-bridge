import * as crypto from 'crypto';
import * as os from 'os';
import { execSync } from 'child_process';
import { HardwareFingerprint } from '@erp-bridge/shared';

const HWID_SALT = 'erp-bridge-hwid-salt-v1';

export class HWIDManager {
  /**
   * Retrieves the primary physical MAC address of the host machine.
   */
  public static getPrimaryMacAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;
      for (const net of netList) {
        if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
          return net.mac.toUpperCase();
        }
      }
    }
    return '00:00:00:00:00:00';
  }

  /**
   * Reads the system disk serial number on Windows, with fallback for other platforms/tests.
   */
  public static getDiskSerialNumber(): string {
    if (os.platform() === 'win32') {
      try {
        const stdout = execSync('wmic diskdrive get serialnumber', {
          encoding: 'utf8',
          timeout: 2000,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const lines = stdout.split('\n').map((l) => l.trim()).filter((l) => l && l !== 'SerialNumber');
        if (lines.length > 0 && lines[0]) {
          return lines[0].replace(/\s+/g, '');
        }
      } catch {
        // Fallback if wmic is restricted
      }
    }
    // Fallback: CPU model + memory total
    const cpu = os.cpus()[0]?.model || 'GenericCPU';
    return `FALLBACK-${Buffer.from(cpu).toString('hex').substring(0, 16)}-${os.totalmem()}`;
  }

  /**
   * Reads the Windows Machine GUID or current User SID.
   */
  public static getWindowsMachineIdentifier(): string {
    if (os.platform() === 'win32') {
      try {
        const stdout = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
          encoding: 'utf8',
          timeout: 2000,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const match = stdout.match(/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9-]+)/i);
        if (match && match[1]) {
          return match[1].trim();
        }
      } catch {}
    }
    return `FALLBACK-USER-${os.userInfo().username || 'default'}`;
  }

  /**
   * Generates a complete HardwareFingerprint object.
   */
  public static async calculate(): Promise<HardwareFingerprint> {
    const macAddress = this.getPrimaryMacAddress();
    const diskSerial = this.getDiskSerialNumber();
    const computerName = os.hostname().toUpperCase();
    const windowsSID = this.getWindowsMachineIdentifier();

    const rawCombined = `${macAddress}|${diskSerial}|${computerName}|${windowsSID}|${HWID_SALT}`;
    const fingerprint = crypto.createHash('sha256').update(rawCombined).digest('hex');

    return {
      macAddress,
      diskSerial,
      computerName,
      windowsSID,
      fingerprint,
    };
  }

  /**
   * Convenience method to return only the 64-char hex fingerprint hash.
   */
  public static async getFingerprintHash(): Promise<string> {
    const fp = await this.calculate();
    return fp.fingerprint;
  }
}
