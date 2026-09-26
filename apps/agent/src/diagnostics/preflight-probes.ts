import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { DiskLatencyResult } from './preflight-health.types';

export class PreflightProbes {
  public static async probeCScript(targetPath?: string): Promise<{
    ok: boolean;
    path?: string;
    blocked?: boolean;
    reason?: string;
  }> {
    if (process.platform !== 'win32') {
      return { ok: true, path: 'simulated_cscript_non_win32' };
    }

    const sysRoot = process.env.SystemRoot || 'C:\\Windows';
    const candidates = targetPath
      ? [targetPath]
      : [
          path.join(sysRoot, 'SysWOW64', 'cscript.exe'),
          path.join(sysRoot, 'System32', 'cscript.exe'),
        ];

    let foundExe: string | null = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        foundExe = c;
        break;
      }
    }

    if (!foundExe) {
      return {
        ok: false,
        blocked: false,
        reason: 'cscript.exe no encontrado en SysWOW64 ni en System32',
      };
    }

    const tempFile = path.join(os.tmpdir(), `bentian_probe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.js`);
    try {
      fs.writeFileSync(tempFile, 'WScript.StdOut.WriteLine("BENTIAN_CSCRIPT_PROBE_OK");\n');
      const res = spawnSync(foundExe, ['//Nologo', tempFile], {
        timeout: 5000,
        encoding: 'utf8',
        windowsHide: true,
      });

      if (res.error) {
        const errMsg = res.error.message.toLowerCase();
        const isBlocked =
          errMsg.includes('eacces') ||
          errMsg.includes('eperm') ||
          errMsg.includes('blocked') ||
          errMsg.includes('operation not permitted');
        return {
          ok: false,
          path: foundExe,
          blocked: isBlocked,
          reason: `Error de ejecución de cscript.exe: ${res.error.message}`,
        };
      }

      const stdout = (res.stdout || '').trim();
      const stderr = (res.stderr || '').trim();

      if (stdout.includes('BENTIAN_CSCRIPT_PROBE_OK')) {
        return { ok: true, path: foundExe };
      }

      const combined = (stdout + ' ' + stderr).toLowerCase();
      const isBlocked =
        res.status !== 0 &&
        (combined.includes('group policy') ||
          combined.includes('directiva de grupo') ||
          combined.includes('bloqueado') ||
          combined.includes('blocked') ||
          combined.includes('denied') ||
          combined.includes('denegado') ||
          res.status === -1073741819 ||
          res.status === 1);

      return {
        ok: false,
        path: foundExe,
        blocked: isBlocked,
        reason: stderr || stdout || `Código de salida anómalo: ${res.status}`,
      };
    } catch (err) {
      return {
        ok: false,
        path: foundExe,
        blocked: true,
        reason: err instanceof Error ? err.message : String(err),
      };
    } finally {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch {
          // Ignorar limpieza de archivo temporal
        }
      }
    }
  }

  public static async probeOleDb(cscriptPath?: string): Promise<{
    ok: boolean;
    providers: string[];
    error?: string;
  }> {
    if (process.platform !== 'win32') {
      return { ok: true, providers: ['Microsoft.ACE.OLEDB.12.0'] };
    }

    const cscriptExe = cscriptPath || (fs.existsSync('C:\\Windows\\SysWOW64\\cscript.exe')
      ? 'C:\\Windows\\SysWOW64\\cscript.exe'
      : 'C:\\Windows\\System32\\cscript.exe');

    if (!fs.existsSync(cscriptExe)) {
      return { ok: false, providers: [], error: 'cscript.exe no disponible para probar OLEDB' };
    }

    const tempFile = path.join(os.tmpdir(), `bentian_oledb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.js`);
    const probeScript = [
      'var providers = ["Microsoft.ACE.OLEDB.12.0", "Microsoft.ACE.OLEDB.16.0", "Microsoft.Jet.OLEDB.4.0"];',
      'var available = [];',
      'for (var i = 0; i < providers.length; i++) {',
      '  var p = providers[i];',
      '  try {',
      '    var conn = new ActiveXObject("ADODB.Connection");',
      '    conn.Provider = p;',
      '    available.push(p);',
      '  } catch (e) {}',
      '}',
      'WScript.StdOut.WriteLine(available.join(","));',
    ].join('\n');

    try {
      fs.writeFileSync(tempFile, probeScript);
      const res = spawnSync(cscriptExe, ['//Nologo', tempFile], {
        timeout: 6000,
        encoding: 'utf8',
        windowsHide: true,
      });

      const stdout = (res.stdout || '').trim();
      const providers = stdout ? stdout.split(',').map((p) => p.trim()).filter(Boolean) : [];
      return {
        ok: providers.length > 0,
        providers,
        error: providers.length === 0 ? 'Ningún proveedor OLEDB de Access registrado' : undefined,
      };
    } catch (err) {
      return {
        ok: false,
        providers: [],
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch {
          // Ignorar
        }
      }
    }
  }

  public static async probeClockDrift(targetUrl?: string): Promise<{
    ok: boolean;
    driftMs: number;
    serverDate?: string;
    error?: string;
  }> {
    const defaultUrls = [
      targetUrl,
      'https://bridge.cristianjm.com/health',
      'https://www.suministrosrubio.com/erp-bridge-endpoint.php?action=ping',
    ].filter(Boolean) as string[];

    for (const url of defaultUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const dateHeader = res.headers.get('date');
        if (dateHeader) {
          const serverTime = new Date(dateHeader).getTime();
          const localTime = Date.now();
          const driftMs = Math.abs(localTime - serverTime);
          return { ok: true, driftMs, serverDate: dateHeader };
        }
      } catch {
        // Probar siguiente url
      }
    }

    return {
      ok: false,
      driftMs: 0,
      error: 'No se pudo contactar con los servidores de tiempo HTTP ni obtener la cabecera Date.',
    };
  }

  public static async probeNetworkStorage(dbPath?: string): Promise<{
    isNetwork: boolean;
    isWifi: boolean;
    storageType: 'local' | 'unc' | 'mapped';
    drive?: string;
    latency?: DiskLatencyResult;
  }> {
    if (!dbPath) {
      return { isNetwork: false, isWifi: false, storageType: 'local' };
    }

    const normalized = dbPath.replace(/\//g, '\\');
    const isUnc = normalized.startsWith('\\\\');
    let drive: string | undefined;
    let isMapped = false;

    if (!isUnc && /^[a-zA-Z]:/.test(normalized)) {
      drive = normalized.substring(0, 2).toUpperCase();
      if (process.platform === 'win32' && drive !== 'C:') {
        try {
          const res = spawnSync('net', ['use'], { encoding: 'utf8', timeout: 3000, windowsHide: true });
          const out = res.stdout || '';
          if (out.toUpperCase().includes(drive)) {
            isMapped = true;
          }
        } catch {
          // Ignorar fallo de net use
        }
      }
    }

    const isNetwork = isUnc || isMapped;
    const storageType = isUnc ? 'unc' : isMapped ? 'mapped' : 'local';

    // Comprobar Wi-Fi
    let isWifi = false;
    if (process.platform === 'win32') {
      try {
        const wlanRes = spawnSync('netsh', ['wlan', 'show', 'interfaces'], {
          encoding: 'utf8',
          timeout: 3000,
          windowsHide: true,
        });
        const out = wlanRes.stdout || '';
        if (/Estado\s*:\s*conectado/i.test(out) || /State\s*:\s*connected/i.test(out)) {
          isWifi = true;
        }
      } catch {
        // Ignorar
      }
    }

    // Medición de latencia
    let latency: DiskLatencyResult | undefined;
    const targetToCheck = fs.existsSync(dbPath) ? dbPath : path.dirname(dbPath);
    if (fs.existsSync(targetToCheck)) {
      const samples: number[] = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        try {
          fs.statSync(targetToCheck);
        } catch {
          // Ignorar
        }
        samples.push(performance.now() - start);
      }
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      latency = {
        avgMs: Math.round(avg * 10) / 10,
        minMs: Math.round(min * 10) / 10,
        maxMs: Math.round(max * 10) / 10,
        jitterMs: Math.round((max - min) * 10) / 10,
      };
    }

    return {
      isNetwork,
      isWifi,
      storageType,
      drive,
      latency,
    };
  }
}
