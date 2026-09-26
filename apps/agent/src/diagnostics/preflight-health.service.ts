import { Logger } from '@erp-bridge/shared';
import {
  PreflightCheckItem,
  PreflightHealthReport,
  PreflightServiceOptions,
  OverallPreflightStatus,
} from './preflight-health.types';
import { PreflightProbes } from './preflight-probes';

const logger = new Logger('PreflightHealth');

export class PreflightHealthService {
  private cachedReport: PreflightHealthReport | null = null;
  private lastRunTimestamp = 0;
  private readonly cacheTtlMs = 15000; // Cache 15 segundos para no sobrecargar el sistema en polling

  constructor(private readonly options: PreflightServiceOptions = {}) {}

  public async runDiagnostics(force = false): Promise<PreflightHealthReport> {
    const now = Date.now();
    if (!force && this.cachedReport && now - this.lastRunTimestamp < this.cacheTtlMs) {
      return this.cachedReport;
    }

    const start = performance.now();
    const cscriptCheck = await this.checkCScript();
    const oledbCheck = await this.checkOleDb(cscriptCheck.details?.path as string | undefined);
    const clockCheck = await this.checkClockDrift();
    const networkCheck = await this.checkNetworkStorage();

    const checks = {
      cscript: cscriptCheck,
      oledbProvider: oledbCheck,
      clockDrift: clockCheck,
      networkStorage: networkCheck,
    };

    const items = Object.values(checks);
    const passed = items.filter((i) => i.status === 'OK').length;
    const warnings = items.filter((i) => i.status === 'WARN').length;
    const failures = items.filter((i) => i.status === 'FAIL').length;

    let overallStatus: OverallPreflightStatus = 'HEALTHY';
    if (failures > 0) {
      overallStatus = 'CRITICAL';
    } else if (warnings > 0) {
      overallStatus = 'DEGRADED';
    }

    const report: PreflightHealthReport = {
      overallStatus,
      timestamp: new Date().toISOString(),
      durationMs: Math.round(performance.now() - start),
      checks,
      summary: {
        passed,
        warnings,
        failures,
      },
    };

    this.cachedReport = report;
    this.lastRunTimestamp = now;

    if (overallStatus !== 'HEALTHY') {
      logger.warn(`Diagnóstico Pre-Flight finalizado: ${overallStatus} (${failures} fallos, ${warnings} advertencias)`);
    }

    return report;
  }

  public async checkCScript(): Promise<PreflightCheckItem> {
    const probe = this.options.probeCScript
      ? await this.options.probeCScript()
      : await PreflightProbes.probeCScript(this.options.cscriptPath);

    if (probe.ok) {
      return {
        id: 'cscript',
        name: 'Motor de Scripting (cscript.exe)',
        code: 'CSCRIPT_READY',
        status: 'OK',
        message: `Motor cscript.exe operativo en ${probe.path || 'sistema'} con soporte JScript activo.`,
        details: { path: probe.path },
      };
    }

    if (probe.blocked) {
      return {
        id: 'cscript',
        name: 'Motor de Scripting (cscript.exe)',
        code: 'CSCRIPT_BLOCKED',
        status: 'FAIL',
        message: `El motor cscript.exe está bloqueado o deshabilitado por el sistema/antivirus (${probe.reason || 'Acceso restringido'}).`,
        recommendation:
          'En Windows 11 24H2, instale la característica VBScript en PowerShell como Administrador: "dism /online /add-capability /capabilityname:VBScript~~~~". En EDR/antivirus, agregue exclusión para cscript.exe.',
        details: { path: probe.path, reason: probe.reason },
      };
    }

    return {
      id: 'cscript',
      name: 'Motor de Scripting (cscript.exe)',
      code: 'CSCRIPT_NOT_FOUND',
      status: 'FAIL',
      message: probe.reason || 'cscript.exe no encontrado en el sistema operativo.',
      recommendation: 'Verifique los componentes del sistema Windows Script Host.',
    };
  }

  public async checkOleDb(cscriptPath?: string): Promise<PreflightCheckItem> {
    const probe = this.options.probeOleDb
      ? await this.options.probeOleDb(cscriptPath)
      : await PreflightProbes.probeOleDb(cscriptPath);

    if (probe.ok && probe.providers.length > 0) {
      return {
        id: 'oledb_provider',
        name: 'Controlador Access OLEDB (ACE/Jet)',
        code: 'OLEDB_PROVIDER_READY',
        status: 'OK',
        message: `Proveedor OLEDB activo: ${probe.providers.join(', ')}.`,
        details: { providers: probe.providers },
      };
    }

    return {
      id: 'oledb_provider',
      name: 'Controlador Access OLEDB (ACE/Jet)',
      code: 'OLEDB_PROVIDER_MISSING',
      status: 'FAIL',
      message:
        'No se detectó ningún proveedor OLEDB de Access de 32 bits registrado (Microsoft.ACE.OLEDB.12.0/16.0 o Microsoft.Jet.OLEDB.4.0). Factusol no podrá conectarse.',
      recommendation:
        'Descargue e instale "Microsoft Access Database Engine 2010 Redistributable" de 32 bits (AccessDatabaseEngine.exe) desde la página oficial de Microsoft.',
      details: { error: probe.error },
    };
  }

  public async checkClockDrift(): Promise<PreflightCheckItem> {
    const probe = this.options.probeClockDrift
      ? await this.options.probeClockDrift(this.options.apiBaseUrl)
      : await PreflightProbes.probeClockDrift(this.options.apiBaseUrl);

    if (!probe.ok) {
      return {
        id: 'clock_drift',
        name: 'Sincronización Horaria (NTP / Servidor Central)',
        code: 'CLOCK_SERVER_UNREACHABLE',
        status: 'WARN',
        message: 'No fue posible validar la hora con el servidor central HTTP (sin conexión o servidor offline).',
        recommendation: 'Compruebe la conexión a Internet para garantizar la sincronización periódica.',
        details: { error: probe.error },
      };
    }

    const driftSec = Math.round(probe.driftMs / 1000);
    const maxDriftMs = 180 * 1000; // 3 minutos

    if (probe.driftMs > maxDriftMs) {
      return {
        id: 'clock_drift',
        name: 'Sincronización Horaria (NTP / Servidor Central)',
        code: 'CLOCK_DRIFT_DETECTED',
        status: 'FAIL',
        message: `Desincronización horaria de ${driftSec}s (> 180s) detectada. Las firmas HMAC-SHA256 y tokens de sincronización expirarán.`,
        recommendation:
          'Sincronice el reloj de Windows ejecutando en PowerShell como Administrador: "w32tm /resync" o active "Ajustar hora automáticamente" en Configuración de Fecha y Hora.',
        details: { driftMs: probe.driftMs, serverDate: probe.serverDate },
      };
    }

    return {
      id: 'clock_drift',
      name: 'Sincronización Horaria (NTP / Servidor Central)',
      code: 'CLOCK_SYNCHRONIZED',
      status: 'OK',
      message: `Reloj del sistema perfectamente sincronizado con el servidor (desviación: ${driftSec}s).`,
      details: { driftMs: probe.driftMs, serverDate: probe.serverDate },
    };
  }

  public async checkNetworkStorage(customDbPath?: string): Promise<PreflightCheckItem> {
    const targetPath = customDbPath !== undefined ? customDbPath : this.options.factusolDbPath;
    if (!targetPath) {
      return {
        id: 'network_storage',
        name: 'Almacenamiento y Red de Base de Datos',
        code: 'DB_NOT_CONFIGURED',
        status: 'OK',
        message: 'Ruta de Factusol aún no configurada.',
      };
    }

    const probe = this.options.probeNetworkStorage
      ? await this.options.probeNetworkStorage(targetPath)
      : await PreflightProbes.probeNetworkStorage(targetPath);

    if (probe.isNetwork) {
      if (probe.isWifi) {
        return {
          id: 'network_storage',
          name: 'Almacenamiento y Red de Base de Datos',
          code: 'NETWORK_DB_WIFI_WARNING',
          status: 'WARN',
          message: `Base de datos Factusol en almacenamiento de red (${probe.storageType.toUpperCase()}) sobre conexión Wi-Fi (latencia media: ${probe.latency?.avgMs ?? 0}ms).`,
          recommendation:
            'Las conexiones Wi-Fi sufren microcortes y latencia inestable que causan corrupción en archivos .mdb de Access y bloqueos OLEDB. Conecte este PC con cable Ethernet Gigabit.',
          details: { storageType: probe.storageType, latency: probe.latency, drive: probe.drive },
        };
      }

      if (probe.latency && (probe.latency.avgMs > 80 || probe.latency.jitterMs > 50)) {
        return {
          id: 'network_storage',
          name: 'Almacenamiento y Red de Base de Datos',
          code: 'HIGH_LATENCY_NETWORK_STORAGE',
          status: 'WARN',
          message: `Latencia elevada hacia el almacenamiento de red (${probe.latency.avgMs}ms, jitter: ${probe.latency.jitterMs}ms). Puede ralentizar las lecturas.`,
          recommendation: 'Verifique la saturación del switch de red o el ancho de banda del NAS.',
          details: { latency: probe.latency },
        };
      }

      return {
        id: 'network_storage',
        name: 'Almacenamiento y Red de Base de Datos',
        code: 'NETWORK_STORAGE_HEALTHY',
        status: 'OK',
        message: `Almacenamiento de red accesible con latencia adecuada (${probe.latency?.avgMs ?? 0}ms) sobre red cableada.`,
        details: { storageType: probe.storageType, latency: probe.latency },
      };
    }

    return {
      id: 'network_storage',
      name: 'Almacenamiento y Red de Base de Datos',
      code: 'LOCAL_STORAGE_OPTIMAL',
      status: 'OK',
      message: `Base de datos en almacenamiento local directo (${probe.drive || 'Disco local'}), latencia óptima.`,
      details: { latency: probe.latency },
    };
  }
}
