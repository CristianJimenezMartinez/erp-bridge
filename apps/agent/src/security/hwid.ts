/**
 * (c) 2026 Cristian Jiménez Martínez / Bentian. Todos los derechos reservados.
 * INFORMACIÓN CONFIDENCIAL Y PROPIETARIA.
 * Protegido como Secreto Empresarial bajo la Ley 1/2019 de Secretos Empresariales (España)
 * y la Directiva (UE) 2016/943. Queda prohibida la reproducción, descompilación,
 * ingeniería inversa o distribución no autorizada.
 */

import * as crypto from 'crypto';
import * as os from 'os';
import { execSync } from 'child_process';
import { HardwareFingerprint } from '@erp-bridge/shared';

const HWID_SALT = 'erp-bridge-hwid-salt-v1';

const VIRTUAL_ADAPTER_KEYWORDS = [
  'tailscale',
  'nord',
  'wireguard',
  'zerotier',
  'hyper-v',
  'vethernet',
  'virtual',
  'tap',
  'tun',
  'wsl',
  'docker',
  'bluetooth',
  'loopback',
];

export interface CalculateOptions {
  customInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>;
  customHostname?: string;
  bypassCache?: boolean;
}

export class HWIDManager {
  private static cachedDiskSerial: string | null = null;
  private static cachedMachineId: string | null = null;

  /**
   * Clears internal cached hardware identifiers (useful for testing).
   */
  public static clearCache(): void {
    this.cachedDiskSerial = null;
    this.cachedMachineId = null;
  }

  /**
   * Retrieves all valid physical MAC addresses sorted alphabetically.
   * Filters out virtual adapters, VPNs, hypervisors, loopback and bluetooth.
   */
  public static getPhysicalMacAddresses(customInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>): string[] {
    const interfaces = customInterfaces || os.networkInterfaces();
    const validMacs = new Set<string>();

    for (const [name, netList] of Object.entries(interfaces)) {
      if (!netList) continue;
      const lowerName = name.toLowerCase();
      if (VIRTUAL_ADAPTER_KEYWORDS.some((kw) => lowerName.includes(kw))) {
        continue;
      }
      for (const net of netList) {
        if (net.internal) continue;
        const mac = (net.mac || '').trim().toUpperCase().replace(/-/g, ':');
        if (!mac || mac === '00:00:00:00:00:00' || mac === 'FF:FF:FF:FF:FF:FF') {
          continue;
        }
        validMacs.add(mac);
      }
    }

    // Fallback: If ALL interfaces were filtered out (e.g. inside Docker or WSL virtual container),
    // collect any non-internal valid MACs so container/VM environments don't return 00:00:00:00:00:00
    if (validMacs.size === 0) {
      for (const [, netList] of Object.entries(interfaces)) {
        if (!netList) continue;
        for (const net of netList) {
          if (net.internal) continue;
          const mac = (net.mac || '').trim().toUpperCase().replace(/-/g, ':');
          if (!mac || mac === '00:00:00:00:00:00' || mac === 'FF:FF:FF:FF:FF:FF') {
            continue;
          }
          validMacs.add(mac);
        }
      }
    }

    return Array.from(validMacs).sort();
  }

  /**
   * Retrieves the primary physical MAC address of the host machine.
   * Deterministically returns the first sorted physical MAC address.
   */
  public static getPrimaryMacAddress(customInterfaces?: NodeJS.Dict<os.NetworkInterfaceInfo[]>): string {
    const sortedMacs = this.getPhysicalMacAddresses(customInterfaces);
    return sortedMacs[0] || '00:00:00:00:00:00';
  }

  /**
   * Reads the system disk/motherboard serial number on Windows using PowerShell CIM (Win 11 24H2 compatible),
   * with multi-tier fallback to Windows Registry and stable hardware anchors.
   */
  public static getDiskSerialNumber(): string {
    if (this.cachedDiskSerial) {
      return this.cachedDiskSerial;
    }

    if (os.platform() === 'win32') {
      // 1. Prefer CIM query (Win 11 24H2 compatible: Win32_DiskDrive -> Win32_BaseBoard -> Win32_BIOS)
      try {
        const stdout = execSync(
          'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "try { $s = (Get-CimInstance Win32_DiskDrive | Select-Object -ExpandProperty SerialNumber -First 1); if (-not $s) { $s = (Get-CimInstance Win32_BaseBoard | Select-Object -ExpandProperty SerialNumber -First 1) }; if (-not $s) { $s = (Get-CimInstance Win32_BIOS | Select-Object -ExpandProperty SerialNumber -First 1) }; if ($s) { $s.Trim() } } catch {}"',
          {
            encoding: 'utf8',
            timeout: 5000,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'ignore'],
          }
        );
        const cleaned = stdout.trim().replace(/[\r\n\s]+/g, '');
        if (cleaned && cleaned.length > 3 && !['DEFAULTSTRING', 'NONE', 'TOBEFILLEDBYO.E.M.'].includes(cleaned.toUpperCase())) {
          this.cachedDiskSerial = cleaned;
          return cleaned;
        }
      } catch {
        // PowerShell timed out or execution restricted
      }

      // 2. High-speed Registry fallback for Windows (<10ms, immune to PowerShell delays)
      try {
        const stdout = execSync(
          'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\IDConfigDB\\Hardware Profiles\\0001" /v HwProfileGuid',
          {
            encoding: 'utf8',
            timeout: 2000,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'ignore'],
          }
        );
        const match = stdout.match(/HwProfileGuid\s+REG_SZ\s+([\{a-zA-Z0-9-\}]+)/i);
        if (match && match[1]) {
          const cleaned = match[1].trim();
          if (cleaned.length > 3) {
            this.cachedDiskSerial = cleaned;
            return cleaned;
          }
        }
      } catch {}

      // 3. Legacy fallback for older Windows versions (Win 7/8/10 where wmic exists)
      try {
        const stdout = execSync('wmic diskdrive get serialnumber', {
          encoding: 'utf8',
          timeout: 2000,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const lines = stdout.split('\n').map((l) => l.trim()).filter((l) => l && l !== 'SerialNumber');
        if (lines.length > 0 && lines[0]) {
          const cleaned = lines[0].replace(/\s+/g, '');
          if (cleaned.length > 3) {
            this.cachedDiskSerial = cleaned;
            return cleaned;
          }
        }
      } catch {}
    }

    // 4. Stable hardware fallback (CPU model + cores count, without volatile memory metrics)
    const cpu = os.cpus()[0]?.model || 'GenericCPU';
    const cores = os.cpus().length || 1;
    const fallback = `FALLBACK-${Buffer.from(cpu).toString('hex').substring(0, 16)}-CORES-${cores}`;
    this.cachedDiskSerial = fallback;
    return fallback;
  }

  /**
   * Reads the Windows Machine GUID from Cryptography registry key,
   * with secondary fallback to Windows Hardware Profile GUID.
   */
  public static getWindowsMachineIdentifier(): string {
    if (this.cachedMachineId) {
      return this.cachedMachineId;
    }

    if (os.platform() === 'win32') {
      try {
        const stdout = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
          encoding: 'utf8',
          timeout: 3000,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const match = stdout.match(/MachineGuid\s+REG_SZ\s+([a-zA-Z0-9-]+)/i);
        if (match && match[1]) {
          this.cachedMachineId = match[1].trim();
          return this.cachedMachineId;
        }
      } catch {}

      // Secondary registry fallback: HwProfileGuid
      try {
        const stdout = execSync(
          'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\IDConfigDB\\Hardware Profiles\\0001" /v HwProfileGuid',
          {
            encoding: 'utf8',
            timeout: 2000,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'ignore'],
          }
        );
        const match = stdout.match(/HwProfileGuid\s+REG_SZ\s+([\{a-zA-Z0-9-\}]+)/i);
        if (match && match[1]) {
          this.cachedMachineId = match[1].trim();
          return this.cachedMachineId;
        }
      } catch {}
    }

    // Platform fallback without username dependency
    const fallbackId = `FALLBACK-MACHINE-${os.platform()}-${os.arch()}`;
    this.cachedMachineId = fallbackId;
    return fallbackId;
  }

  /**
   * Generates a complete HardwareFingerprint object bound to immutable hardware anchors:
   * 1. MachineGuid (Windows Cryptography)
   * 2. DiskDrive / BaseBoard serial number
   * 3. Filtered physical MAC address
   *
   * Hostname changes do NOT alter the cryptographic fingerprint.
   */
  public static async calculate(options?: CalculateOptions): Promise<HardwareFingerprint> {
    if (options?.bypassCache) {
      this.clearCache();
    }

    const macAddress = this.getPrimaryMacAddress(options?.customInterfaces);
    const diskSerial = this.getDiskSerialNumber();
    const computerName = (options?.customHostname || os.hostname()).toUpperCase();
    const windowsSID = this.getWindowsMachineIdentifier();

    // The cryptographic fingerprint is strictly derived from immutable hardware anchors.
    // Hostname is deliberately excluded from rawCombined so computer renames do not invalidate licenses.
    const rawCombined = `${macAddress}|${diskSerial}|${windowsSID}|${HWID_SALT}`;
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
  public static async getFingerprintHash(options?: CalculateOptions): Promise<string> {
    const fp = await this.calculate(options);
    return fp.fingerprint;
  }
}
