import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentConfigFile } from '../config/config.types';
import { AgentDiskLogger, StructuredLogEntry } from './disk-logger';

export interface LiveHealthReport {
  timestamp: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  diagnosticsDurationMs: number;
  process: {
    pid: number;
    uptimeSeconds: number;
    memoryRssMb: number;
    memoryHeapMb: number;
    cpuCores: number;
  };
  factusol: {
    configured: boolean;
    path: string;
    exists: boolean;
    sizeMb: number;
    latencyMs: number;
    status: 'ONLINE' | 'OFFLINE' | 'LOCKED' | 'NOT_CONFIGURED';
    articleCount?: number;
    lockFile: {
      exists: boolean;
      path?: string;
      isOrphan: boolean;
    };
    message?: string;
  };
  channel: {
    type: 'woocommerce' | 'universal_bridge';
    url: string;
    reachable: boolean;
    latencyMs: number;
    httpStatus?: number;
    message?: string;
  };
  license: {
    status: string;
    plan?: string;
    centralApiReachable: boolean;
    centralApiLatencyMs: number;
  };
  recentErrors: StructuredLogEntry[];
}

export class LiveHealthService {
  public static async runDiagnostics(
    config: AgentConfigFile,
    licenseStatus?: { status: string; plan?: string }
  ): Promise<LiveHealthReport> {
    const startAll = performance.now();

    // 1. Process Info
    const mem = process.memoryUsage();
    const processInfo = {
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      memoryRssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      memoryHeapMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      cpuCores: os.cpus().length,
    };

    // 2. Factusol Probe
    const dbPath = config.factusol?.databasePath || config.factusolDbPath || '';
    const factusolProbe = await LiveHealthService.probeFactusol(dbPath);

    // 3. Web Channel Probe
    const channelType = (config.channelType || 'universal_bridge') as 'woocommerce' | 'universal_bridge';
    const storeUrl =
      channelType === 'universal_bridge'
        ? config.universalBridge?.storeUrl || ''
        : config.woocommerce?.storeUrl || '';
    const channelSecret =
      channelType === 'universal_bridge'
        ? config.universalBridge?.secretKey
        : undefined;
    const channelProbe = await LiveHealthService.probeChannel(channelType, storeUrl, channelSecret);

    // 4. Central License API Probe
    const centralApiUrl = config.apiBaseUrl || 'https://bridge.cristianjm.com';
    const centralApiProbe = await LiveHealthService.probeCentralApi(centralApiUrl);

    // 5. Recent Errors from Disk Log
    const diskLogger = AgentDiskLogger.getInstance();
    const recentErrors = diskLogger.getRecentLogs(5, 'ERROR');

    const totalDurationMs = Math.round((performance.now() - startAll) * 10) / 10;

    // Evaluate Overall Status
    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' = 'HEALTHY';
    if (!factusolProbe.exists && factusolProbe.configured) {
      overallStatus = 'OFFLINE';
    } else if (factusolProbe.lockFile.isOrphan || !channelProbe.reachable || !centralApiProbe.reachable) {
      overallStatus = 'DEGRADED';
    } else if (processInfo.memoryRssMb > 500) {
      overallStatus = 'DEGRADED';
    }

    const report: LiveHealthReport = {
      timestamp: new Date().toISOString(),
      overallStatus,
      diagnosticsDurationMs: totalDurationMs,
      process: processInfo,
      factusol: factusolProbe,
      channel: channelProbe,
      license: {
        status: licenseStatus?.status || 'UNKNOWN',
        plan: licenseStatus?.plan || 'Ninguno',
        centralApiReachable: centralApiProbe.reachable,
        centralApiLatencyMs: centralApiProbe.latencyMs,
      },
      recentErrors,
    };

    // Persist snapshot to %APPDATA%\Bentian Agent\health-snapshot.json
    try {
      LiveHealthService.saveSnapshot(report);
    } catch {}

    // Log diagnostic check in disk log
    diskLogger.log({
      level: overallStatus === 'HEALTHY' ? 'INFO' : 'WARN',
      component: 'LiveHealthService',
      action: 'health_check',
      duration_ms: totalDurationMs,
      status: overallStatus === 'HEALTHY' ? 'SUCCESS' : 'FAILURE',
      message: `Diagnóstico del agente completado en ${totalDurationMs} ms. Estado global: ${overallStatus}. Factusol: ${factusolProbe.latencyMs}ms | Web: ${channelProbe.latencyMs}ms | API: ${centralApiProbe.latencyMs}ms`,
      metadata: {
        factusolLatencyMs: factusolProbe.latencyMs,
        channelLatencyMs: channelProbe.latencyMs,
        centralApiLatencyMs: centralApiProbe.latencyMs,
        memoryRssMb: processInfo.memoryRssMb,
      },
    });

    return report;
  }

  private static async probeFactusol(dbPath: string): Promise<LiveHealthReport['factusol']> {
    if (!dbPath) {
      return {
        configured: false,
        path: '',
        exists: false,
        sizeMb: 0,
        latencyMs: 0,
        status: 'NOT_CONFIGURED',
        lockFile: { exists: false, isOrphan: false },
        message: 'Base de datos Factusol no configurada',
      };
    }

    const exists = fs.existsSync(dbPath);
    let sizeMb = 0;
    let latencyMs = 0;
    let lockExists = false;
    let lockPath: string | undefined;
    let isOrphan = false;

    if (exists) {
      const t0 = performance.now();
      try {
        const stat = fs.statSync(dbPath);
        latencyMs = Math.round((performance.now() - t0) * 10) / 10;
        sizeMb = Math.round((stat.size / (1024 * 1024)) * 100) / 100;

        // Check for .laccdb / .ldb lock files
        const dir = path.dirname(dbPath);
        const baseName = path.basename(dbPath, path.extname(dbPath));
        const candidateLocks = [
          path.join(dir, `${baseName}.laccdb`),
          path.join(dir, `${baseName}.ldb`),
        ];

        for (const cLock of candidateLocks) {
          if (fs.existsSync(cLock)) {
            lockExists = true;
            lockPath = cLock;
            // Check if lock is orphan: try to open in read/write
            try {
              const fd = fs.openSync(cLock, 'r+');
              fs.closeSync(fd);
              isOrphan = true; // Was openable with no lock, orphan!
            } catch {
              isOrphan = false; // System lock active (Access or cscript using it)
            }
            break;
          }
        }
      } catch (err) {
        latencyMs = Math.round((performance.now() - t0) * 10) / 10;
      }
    }

    const status: 'ONLINE' | 'OFFLINE' | 'LOCKED' | 'NOT_CONFIGURED' = !exists
      ? 'OFFLINE'
      : isOrphan
      ? 'LOCKED'
      : 'ONLINE';

    return {
      configured: true,
      path: dbPath,
      exists,
      sizeMb,
      latencyMs,
      status,
      lockFile: {
        exists: lockExists,
        path: lockPath,
        isOrphan,
      },
      message: exists
        ? `Base de datos detectada (${sizeMb} MB, latencia disco ${latencyMs} ms)`
        : 'Archivo no encontrado en la ruta especificada (posible desconexión de red o NAS)',
    };
  }

  private static async probeChannel(
    type: 'woocommerce' | 'universal_bridge',
    rawUrl: string,
    secretKey?: string
  ): Promise<LiveHealthReport['channel']> {
    if (!rawUrl) {
      return {
        type,
        url: '',
        reachable: false,
        latencyMs: 0,
        message: 'Canal web no configurado',
      };
    }

    let targetUrl = rawUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    // Forzar www canónico en suministrosrubio.com (Regla 7)
    targetUrl = targetUrl.replace(/^(https?:\/\/)(?:www\.)?suministrosrubio\.com(\/|$)/i, '$1www.suministrosrubio.com$2');

    let endpoint = targetUrl;
    if (type === 'universal_bridge' && !endpoint.includes('erp-bridge-endpoint.php')) {
      endpoint = `${endpoint.replace(/\/+$/, '')}/erp-bridge-endpoint.php?action=ping`;
    }

    const t0 = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const headers: Record<string, string> = {};
      if (secretKey) {
        headers['X-Bridge-Key'] = secretKey;
      }

      const res = await fetch(endpoint, {
        method: 'GET',
        headers,
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      const latencyMs = Math.round((performance.now() - t0) * 10) / 10;
      const reachable = res.status < 500;

      return {
        type,
        url: targetUrl,
        reachable,
        latencyMs,
        httpStatus: res.status,
        message: reachable
          ? `Servidor web online (HTTP ${res.status}, latencia ${latencyMs} ms)`
          : `Servidor web devolvió HTTP ${res.status}`,
      };
    } catch (err: unknown) {
      const latencyMs = Math.round((performance.now() - t0) * 10) / 10;
      return {
        type,
        url: targetUrl,
        reachable: false,
        latencyMs,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private static async probeCentralApi(baseUrl: string): Promise<{ reachable: boolean; latencyMs: number }> {
    const t0 = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const url = `${baseUrl.replace(/\/+$/, '')}/health`;
      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latencyMs = Math.round((performance.now() - t0) * 10) / 10;
      return { reachable: res.status < 500, latencyMs };
    } catch {
      const latencyMs = Math.round((performance.now() - t0) * 10) / 10;
      return { reachable: false, latencyMs };
    }
  }

  private static saveSnapshot(report: LiveHealthReport): void {
    const baseDir =
      process.env.APPDATA ||
      (os.platform() === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support')
        : path.join(os.homedir(), '.config'));

    const agentDir = path.join(baseDir, 'Bentian Agent');
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }

    const snapshotPath = path.join(agentDir, 'health-snapshot.json');
    const tmpPath = `${snapshotPath}.tmp`;

    // Reemplazo atómico (Regla 1)
    fs.writeFileSync(tmpPath, JSON.stringify(report, null, 2), 'utf8');
    fs.renameSync(tmpPath, snapshotPath);
  }
}
