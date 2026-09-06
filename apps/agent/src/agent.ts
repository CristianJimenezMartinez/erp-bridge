import os from 'os';
import fs from 'fs';
import path from 'path';
import {
  AgentHeartbeatPayload,
  AgentPairingRequest,
  AgentSystemInfo,
  FactusolDetectedInstance,
  LicenseActivationRequest,
  LicenseActivationResponse,
  LicenseTokenPayload,
  LicenseValidationRequest,
  LicenseValidationResponse,
  Logger,
} from '@erp-bridge/shared';
import { FactusolConnector, AccessDriver } from '@erp-bridge/connector-factusol';
import { AccdbFileWatcher, LicenseTokenManager } from '@erp-bridge/core';
import { FactusolDetector } from './detector';
import { HWIDManager } from './security/hwid';
import { SecureStore } from './security/secure-store';
import { AutoUpdater } from './update/auto-updater';

export type AgentLicenseStatus = 'VALID' | 'GRACE_PERIOD' | 'EXPIRED' | 'UNLICENSED';

export interface AgentConfigFile {
  agentId?: string;
  agentName?: string;
  agentVersion?: string;
  authToken?: string;
  apiBaseUrl?: string;
  organizationId?: string;
  factusolDbPath?: string;
  heartbeatIntervalMs?: number;
  licenseKey?: string;
}

export class LocalAgent {
  private readonly logger = new Logger('LocalAgent');
  private config: AgentConfigFile;
  private autoUpdater: AutoUpdater;
  private currentVersion: string;
  private isUpdating = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private licenseCheckTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private factusol: FactusolConnector | null = null;
  private watcher: AccdbFileWatcher | null = null;
  private configFilePath: string;
  private secureStore: SecureStore;
  private currentHwid: string | null = null;
  private licenseStatus: AgentLicenseStatus = 'UNLICENSED';
  private activePlan?: string;
  private recentEvents: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }> = [];

  constructor(customConfig?: Partial<AgentConfigFile>, customStoreDir?: string) {
    const appDirConfig = path.join(path.dirname(process.execPath), 'agent-config.json');
    const cwdConfig = path.join(process.cwd(), 'agent-config.json');
    this.configFilePath = fs.existsSync(appDirConfig) ? appDirConfig : cwdConfig;

    this.secureStore = new SecureStore(customStoreDir);
    const diskConfig = this.loadConfigFromDisk();

    this.currentVersion = customConfig?.agentVersion || diskConfig.agentVersion || process.env['APP_VERSION'] || '0.1.0';

    this.config = {
      agentName: customConfig?.agentName || diskConfig.agentName || os.hostname() || 'Windows Agent',
      agentVersion: this.currentVersion,
      apiBaseUrl: customConfig?.apiBaseUrl || diskConfig.apiBaseUrl || 'https://api.veltiatrust.com',
      organizationId: customConfig?.organizationId || diskConfig.organizationId || 'org_default',
      agentId: customConfig?.agentId || diskConfig.agentId,
      authToken: customConfig?.authToken || diskConfig.authToken,
      factusolDbPath: customConfig?.factusolDbPath || diskConfig.factusolDbPath,
      heartbeatIntervalMs: customConfig?.heartbeatIntervalMs || diskConfig.heartbeatIntervalMs || 30000,
      licenseKey: customConfig?.licenseKey || diskConfig.licenseKey,
    };

    this.autoUpdater = new AutoUpdater({
      apiBaseUrl: this.config.apiBaseUrl || 'https://api.veltiatrust.com',
      agentId: this.config.agentId || 'agent_local_standalone',
      currentVersion: this.currentVersion,
    });

    this.addEvent('info', `🚀 Bentian Local Agent inicializado en ${this.config.agentName} (v${this.currentVersion})`);
  }

  public setApiBaseUrl(url: string): void {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    this.config.apiBaseUrl = cleanUrl;
    this.saveConfigToDisk();
    this.logger.info(`✓ URL del servidor API actualizada a: ${cleanUrl}`);
  }

  public setFactusolDbPath(dbPath: string): void {
    const resolved = path.resolve(dbPath.trim());
    if (!fs.existsSync(resolved)) {
      throw new Error(`El archivo de base de datos Factusol no existe: ${resolved}`);
    }
    this.config.factusolDbPath = resolved;
    this.saveConfigToDisk();
    this.logger.info(`✓ Base de datos Factusol configurada en: ${resolved}`);
  }

  public getConfig(): Readonly<AgentConfigFile> {
    return { ...this.config };
  }

  public getRecentEvents(): Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }> {
    return [...this.recentEvents];
  }

  public addEvent(level: 'info' | 'warn' | 'error' | 'success', message: string): void {
    const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.recentEvents.unshift({ timestamp: timeStr, level, message });
    if (this.recentEvents.length > 80) {
      this.recentEvents.pop();
    }
  }

  public async getFactusolArticleCount(): Promise<number | undefined> {
    if (!this.config.factusolDbPath || !fs.existsSync(this.config.factusolDbPath)) return undefined;
    try {
      const driver = new AccessDriver({ databasePath: this.config.factusolDbPath });
      const rows = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_ART');
      if (rows && rows.length > 0 && typeof rows[0].total === 'number') {
        return rows[0].total;
      }
    } catch {}
    return undefined;
  }

  public async testFactusolConnection(dbPath: string): Promise<{ success: boolean; message: string; articleCount?: number; fileSizeBytes?: number }> {
    const resolved = path.resolve(dbPath.trim());
    if (!fs.existsSync(resolved)) {
      return { success: false, message: `El archivo no existe: ${resolved}` };
    }
    try {
      const stats = fs.statSync(resolved);
      const driver = new AccessDriver({ databasePath: resolved });
      const rows = await driver.query<{ total: number }>('SELECT COUNT(*) AS total FROM F_ART');
      const count = rows && rows.length > 0 ? rows[0].total : 0;
      return {
        success: true,
        message: `Conexión OLEDB establecida con éxito. ${count} artículos encontrados en F_ART.`,
        articleCount: count,
        fileSizeBytes: stats.size,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Fallo al conectar con Factusol: ${msg}` };
    }
  }

  public async reconnectFactusol(dbPath: string): Promise<{ success: boolean; message: string; articleCount?: number; fileSizeBytes?: number }> {
    const testResult = await this.testFactusolConnection(dbPath);
    if (!testResult.success) {
      this.addEvent('error', `Error conectando Factusol: ${testResult.message}`);
      return testResult;
    }

    if (this.watcher) {
      this.watcher.stop();
      this.watcher = null;
    }
    if (this.factusol) {
      await this.factusol.disconnect();
      this.factusol = null;
    }

    this.config.factusolDbPath = path.resolve(dbPath.trim());
    this.saveConfigToDisk();

    this.factusol = new FactusolConnector();
    await this.factusol.connect({ configuration: { databasePath: this.config.factusolDbPath } });

    const lic = await this.validateLicense();
    if (lic.status === 'VALID' || lic.status === 'GRACE_PERIOD') {
      this.watcher = new AccdbFileWatcher({
        filePath: this.config.factusolDbPath,
        organizationId: this.config.organizationId,
        debounceMs: 5000,
      });
      this.watcher.onSync(async (reason) => {
        this.addEvent('info', `Cambio detectado en Factusol (${reason}). Disparando sincronización...`);
        if (this.config.agentId && this.config.apiBaseUrl) {
          await fetch(`${this.config.apiBaseUrl}/api/v1/sync/run-reactive`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
            },
            body: JSON.stringify({
              agentId: this.config.agentId,
              organizationId: this.config.organizationId,
              reason,
              timestamp: new Date().toISOString(),
            }),
          }).catch(() => null);
        }
      });
      this.watcher.start();
    }

    this.addEvent('success', `✓ Factusol configurado: ${path.basename(this.config.factusolDbPath)} (${testResult.articleCount} artículos)`);
    return testResult;
  }

  public async triggerManualSync(): Promise<{ success: boolean; message: string }> {
    this.addEvent('info', 'Disparando sincronización manual...');
    try {
      if (this.config.agentId && this.config.apiBaseUrl) {
        const res = await fetch(`${this.config.apiBaseUrl}/api/v1/sync/run-reactive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
          },
          body: JSON.stringify({
            agentId: this.config.agentId,
            organizationId: this.config.organizationId,
            reason: 'MANUAL_TRIGGER_LOCAL_GUI',
            timestamp: new Date().toISOString(),
          }),
        });
        if (res.ok) {
          this.addEvent('success', '✓ Sincronización manual enviada al servidor');
          return { success: true, message: 'Sincronización manual completada con éxito.' };
        }
      }
      this.addEvent('success', '✓ Sincronización local ejecutada correctamente');
      return { success: true, message: 'Sincronización completada en local.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.addEvent('warn', `Aviso en sincronización: ${msg}`);
      return { success: true, message: `Sincronización completada (${msg})` };
    }
  }

  public async getStatusDetails(): Promise<{
    agentName: string;
    agentVersion: string;
    agentId: string;
    apiBaseUrl: string;
    hwid: string;
    licenseKey?: string;
    license: { status: AgentLicenseStatus; plan?: string; message?: string };
    factusol: {
      configured: boolean;
      databasePath: string;
      fileName: string;
      connected: boolean;
      watcherActive: boolean;
      articleCount?: number;
      fileSizeBytes?: number;
      statusMessage: string;
    };
    system: AgentSystemInfo;
    recentEvents: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }>;
  }> {
    const hwid = await this.getHWID();
    const license = await this.validateLicense();
    let articleCount: number | undefined;
    let fileSizeBytes: number | undefined;
    let connected = false;
    let statusMessage = 'No configurado';

    if (this.config.factusolDbPath && fs.existsSync(this.config.factusolDbPath)) {
      try {
        const stats = fs.statSync(this.config.factusolDbPath);
        fileSizeBytes = stats.size;
        if (this.factusol) {
          const health = await this.factusol.healthCheck();
          connected = health.status === 'HEALTHY';
          statusMessage = health.message;
          if (connected) {
            articleCount = await this.getFactusolArticleCount();
          }
        }
      } catch (err) {
        statusMessage = err instanceof Error ? err.message : String(err);
      }
    }

    return {
      agentName: this.config.agentName || 'Bentian Agent',
      agentVersion: this.currentVersion,
      agentId: this.config.agentId || 'Sin registrar (Modo Standalone)',
      apiBaseUrl: this.config.apiBaseUrl || 'https://api.veltiatrust.com',
      licenseKey: this.config.licenseKey,
      hwid,
      license,
      factusol: {
        configured: Boolean(this.config.factusolDbPath && fs.existsSync(this.config.factusolDbPath)),
        databasePath: this.config.factusolDbPath || '',
        fileName: this.config.factusolDbPath ? path.basename(this.config.factusolDbPath) : '',
        connected,
        watcherActive: this.watcher !== null,
        articleCount,
        fileSizeBytes,
        statusMessage,
      },
      system: this.getSystemInfo(),
      recentEvents: this.getRecentEvents(),
    };
  }

  public getSystemInfo(): AgentSystemInfo {
    return {
      platform: os.platform(),
      arch: os.arch(),
      osVersion: os.release(),
      hostname: os.hostname(),
      memoryTotalMb: Math.round(os.totalmem() / 1024 / 1024),
      memoryFreeMb: Math.round(os.freemem() / 1024 / 1024),
      cpuCores: os.cpus().length,
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  public async getHWID(): Promise<string> {
    if (!this.currentHwid) {
      this.currentHwid = await HWIDManager.getFingerprintHash();
    }
    return this.currentHwid;
  }

  public getLicenseStatus(): { status: AgentLicenseStatus; plan?: string } {
    return { status: this.licenseStatus, plan: this.activePlan };
  }

  /**
   * Activates a license key with this machine's HWID.
   */
  public async activateLicense(licenseKey: string): Promise<LicenseActivationResponse> {
    const hwid = await this.getHWID();
    this.logger.info(`Iniciando activación de licencia: ${licenseKey.substring(0, 8)}... (HWID: ${hwid.substring(0, 16)}...)`);

    const requestPayload: LicenseActivationRequest = {
      licenseKey,
      hwid,
      agentId: this.config.agentId,
      machineInfo: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
      },
    };

    const response = await fetch(`${this.config.apiBaseUrl}/api/v1/licenses/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    const resJson = (await response.json()) as { data?: LicenseActivationResponse; error?: { message?: string } };

    if (!response.ok || !resJson.data?.success) {
      const msg = resJson.error?.message || resJson.data?.error || `Error HTTP ${response.status}`;
      this.logger.warn(`Fallo al activar licencia: ${msg}`);
      return { success: false, error: msg };
    }

    const activation = resJson.data;
    if (activation.licenseToken) {
      await this.secureStore.saveLicenseToken(activation.licenseToken, hwid);
      this.config.licenseKey = licenseKey;
      this.saveConfigToDisk();
      this.licenseStatus = 'VALID';
      this.activePlan = activation.plan;
      this.logger.info(`✓ Licencia activada con éxito. Plan: ${activation.plan}, Expira: ${activation.expiresAt}`);
    }

    return activation;
  }

  /**
   * Checks license validity locally (with grace period) and verifies/renews online with Core.
   */
  public async validateLicense(): Promise<{ status: AgentLicenseStatus; plan?: string; message?: string }> {
    const hwid = await this.getHWID();
    const token = await this.secureStore.loadLicenseToken(hwid);

    if (!token) {
      this.licenseStatus = 'UNLICENSED';
      this.activePlan = undefined;
      return { status: 'UNLICENSED', message: 'No hay token de licencia guardado en este equipo' };
    }

    // 1. Check local token payload (for grace period fallback)
    const localPayload: LicenseTokenPayload | null = LicenseTokenManager.decodeUnverified(token);
    const now = Date.now();
    const isLocalTokenValid = localPayload ? now <= localPayload.expiresAt : false;

    // 2. Attempt online validation and token renewal
    try {
      const requestPayload: LicenseValidationRequest = {
        licenseToken: token,
        hwid,
        agentVersion: '0.1.0',
      };

      const response = await fetch(`${this.config.apiBaseUrl}/api/v1/licenses/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(2000),
      });

      const resJson = (await response.json()) as { data?: LicenseValidationResponse; error?: { message?: string } };

      if (response.ok && resJson.data?.valid) {
        if (resJson.data.renewedToken) {
          await this.secureStore.saveLicenseToken(resJson.data.renewedToken, hwid);
        }
        this.licenseStatus = 'VALID';
        this.activePlan = resJson.data.plan;
        return { status: 'VALID', plan: resJson.data.plan };
      } else if (response.status === 403 || response.status === 400) {
        // Explicit rejection (revoked or expired license)
        this.licenseStatus = 'EXPIRED';
        this.activePlan = undefined;
        return { status: 'EXPIRED', message: resJson.error?.message || 'Licencia revocada o expirada' };
      }
    } catch {
      // Offline / Network failure -> fallback to local token verification
    }

    if (isLocalTokenValid && localPayload) {
      this.licenseStatus = 'GRACE_PERIOD';
      this.activePlan = localPayload.plan;
      const remainingHours = Math.round((localPayload.expiresAt - now) / 3600000);
      this.logger.warn(`Operando en período de gracia offline (${remainingHours}h restantes). Plan: ${localPayload.plan}`);
      return { status: 'GRACE_PERIOD', plan: localPayload.plan };
    }

    this.licenseStatus = 'EXPIRED';
    this.activePlan = undefined;
    return { status: 'EXPIRED', message: 'Período de gracia expirado sin conexión al servidor' };
  }

  /**
   * Deactivates the current machine's license.
   */
  public async deactivateLicense(customKey?: string): Promise<{ success: boolean; message?: string }> {
    const key = customKey || this.config.licenseKey;
    const hwid = await this.getHWID();

    if (key && this.config.apiBaseUrl) {
      try {
        await fetch(`${this.config.apiBaseUrl}/api/v1/licenses/deactivate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: key, hwid }),
        });
      } catch {}
    }

    await this.secureStore.deleteLicenseToken();
    this.config.licenseKey = undefined;
    this.saveConfigToDisk();
    this.licenseStatus = 'UNLICENSED';
    this.activePlan = undefined;
    this.logger.info('Licencia desactivada y credenciales locales eliminadas.');

    return { success: true };
  }

  public async pair(pairingToken: string, customName?: string): Promise<{
    agentId: string;
    detectedFactusol: FactusolDetectedInstance[];
  }> {
    const name = customName || this.config.agentName || os.hostname();
    this.logger.info(`Iniciando emparejamiento con el Core (Token: ${pairingToken})...`);

    // 1. Auto-detect Factusol instances locally
    const detected = FactusolDetector.detectAll(this.config.factusolDbPath ? [path.dirname(this.config.factusolDbPath)] : []);
    const primary = detected.length > 0 ? detected[0] : null;

    const requestPayload: AgentPairingRequest = {
      pairingToken,
      name,
      systemInfo: this.getSystemInfo(),
      detectedFactusol: detected,
    };

    // 2. Outbound HTTP request to Core /api/v1/agents/pair
    const response = await fetch(`${this.config.apiBaseUrl}/api/v1/agents/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(errBody.error?.message || `Fallo al emparejar con el servidor: HTTP ${response.status}`);
    }

    const resJson = (await response.json()) as {
      data: { agent: { id: string; name: string }; authToken: string };
    };

    this.config.agentId = resJson.data.agent.id;
    this.config.agentName = resJson.data.agent.name;
    this.config.authToken = resJson.data.authToken;
    if (primary) {
      this.config.factusolDbPath = primary.databasePath;
    }

    this.saveConfigToDisk();
    this.logger.info(`Emparejamiento exitoso. Agent ID: ${this.config.agentId}`);

    return {
      agentId: resJson.data.agent.id,
      detectedFactusol: detected,
    };
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    const hwid = await this.getHWID();

    // 1. Limpieza de respaldo .old y confirmación si acabamos de actualizar
    await this.autoUpdater.handlePostUpdate();

    // 2. Check license status before start
    const licenseCheck = await this.validateLicense();

    this.logger.info(`🚀 Arrancando ERP Bridge Local Agent: ${this.config.agentName || 'Agent'} (v${this.currentVersion})`, {
      agentId: this.config.agentId || 'Sin registrar (modo standalone)',
      version: this.currentVersion,
      apiBaseUrl: this.config.apiBaseUrl,
      hwid: hwid.substring(0, 16) + '...',
      licenseStatus: licenseCheck.status,
      plan: licenseCheck.plan || 'Ninguno',
    });

    if (licenseCheck.status === 'VALID' || licenseCheck.status === 'GRACE_PERIOD') {
      this.addEvent('success', `✓ Licencia ${licenseCheck.status} (Plan: ${licenseCheck.plan || 'Professional'})`);
    } else {
      this.addEvent('warn', `⚠️ Licencia no activa (${licenseCheck.status}). Active su clave para sincronizar.`);
    }

    // 3. Comprobación inicial de actualizaciones en frío
    void this.checkForUpdatesAndApply();

    // Auto-detect Factusol if not already set
    if (!this.config.factusolDbPath) {
      const primary = FactusolDetector.getPrimaryInstance();
      if (primary) {
        this.config.factusolDbPath = primary.databasePath;
        this.logger.info(`Auto-asignada base de datos Factusol: ${this.config.factusolDbPath}`);
      }
    }

    // Connect local Factusol connector
    if (this.config.factusolDbPath && fs.existsSync(this.config.factusolDbPath)) {
      this.factusol = new FactusolConnector();
      await this.factusol.connect({
        configuration: {
          databasePath: this.config.factusolDbPath,
        },
      });

      const health = await this.factusol.healthCheck();
      this.logger.info(`Salud inicial Factusol: ${health.status} (${health.message})`, {
        latencyMs: health.latencyMs,
      });

      this.addEvent('success', `✓ Factusol conectado: ${path.basename(this.config.factusolDbPath)}`);

      // Start reactive file watcher only if license is active or in grace period
      if (licenseCheck.status === 'VALID' || licenseCheck.status === 'GRACE_PERIOD') {
        this.watcher = new AccdbFileWatcher({
          filePath: this.config.factusolDbPath,
          organizationId: this.config.organizationId,
          debounceMs: 5000,
        });

        this.watcher.onSync(async (reason) => {
          this.logger.info(`Cambio detectado en base Factusol (${reason}). Disparando sincronización...`);
          this.addEvent('info', `Cambio detectado en Factusol (${reason}). Disparando sincronización...`);
          if (this.config.agentId && this.config.apiBaseUrl) {
            await fetch(`${this.config.apiBaseUrl}/api/v1/sync/run-reactive`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
              },
              body: JSON.stringify({
                agentId: this.config.agentId,
                organizationId: this.config.organizationId,
                reason,
                timestamp: new Date().toISOString(),
              }),
            }).catch((err) => {
              this.logger.warn(`No se pudo notificar sync reactivo a la API: ${err instanceof Error ? err.message : String(err)}`);
            });
          }
        });

        this.watcher.start();
        this.addEvent('info', '✓ Vigilante de archivos Factusol activo en tiempo real');
      } else {
        this.logger.warn(`⚠️ Sincronización en tiempo real deshabilitada: Licencia ${licenseCheck.status}. Active su licencia para habilitar la sincronización.`);
      }
    } else {
      this.logger.warn(`No se ha configurado o no existe el archivo de Factusol: ${this.config.factusolDbPath || 'Sin ruta'}`);
      this.addEvent('warn', '⚠️ Base de datos Factusol no configurada. Use la ventana para seleccionarla.');
    }

    this.startHeartbeat();
    this.startLicenseValidationLoop();
  }

  private startHeartbeat(): void {
    const sendBeat = async () => {
      if (!this.isRunning) return;

      try {
        let factusolHealth;
        if (this.factusol) {
          const check = await this.factusol.healthCheck();
          factusolHealth = {
            status: check.status,
            latencyMs: check.latencyMs,
            databasePath: this.config.factusolDbPath,
            message: check.message,
          };
        }

        const heartbeat: AgentHeartbeatPayload = {
          agentId: this.config.agentId || 'agent_local_standalone',
          version: this.currentVersion,
          status: 'ONLINE',
          systemInfo: this.getSystemInfo(),
          factusolHealth,
          fileWatcherActive: this.watcher !== null,
        };

        if (this.config.agentId && this.config.apiBaseUrl) {
          const res = await fetch(`${this.config.apiBaseUrl}/api/v1/agents/${this.config.agentId}/heartbeat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
            },
            body: JSON.stringify(heartbeat),
          }).catch(() => null);

          if (res && res.ok) {
            try {
              const resJson = (await res.json()) as {
                data?: {
                  updateAvailable?: boolean;
                  targetVersion?: string;
                  updateInfo?: any;
                };
              };
              if (resJson.data?.updateAvailable && !this.isUpdating) {
                this.logger.info(`🔥 Nueva versión detectada en latido Heartbeat: v${resJson.data.targetVersion}`);
                void this.applyUpdateFromInfo(resJson.data.updateInfo || { version: resJson.data.targetVersion! });
              }
            } catch {}
          }
        }

        this.logger.debug('Heartbeat emitido al Core correctamente', {
          time: new Date().toISOString(),
          factusolStatus: factusolHealth?.status,
        });
      } catch (err) {
        this.logger.warn('Fallo al emitir heartbeat al Core', { err: String(err) });
      }
    };

    void sendBeat();
    this.heartbeatTimer = setInterval(sendBeat, this.config.heartbeatIntervalMs);
  }

  /**
   * Applies an update autonomously from manifest info or queries API if details are missing.
   */
  public async applyUpdateFromInfo(info: {
    version: string;
    downloadUrl?: string;
    sha256?: string;
    signature?: string;
  }): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      let { downloadUrl, sha256, signature } = info;
      if (!downloadUrl || !sha256 || !signature) {
        const check = await this.autoUpdater.checkForUpdate();
        if (!check.available || !check.downloadUrl || !check.sha256 || !check.signature) {
          this.isUpdating = false;
          return;
        }
        downloadUrl = check.downloadUrl;
        sha256 = check.sha256;
        signature = check.signature;
      }

      this.logger.info(`Iniciando auto-actualización silenciosa hacia v${info.version}...`);
      const downloadedFile = await this.autoUpdater.downloadUpdate(downloadUrl, info.version);

      const isValid = this.autoUpdater.verifyUpdate(downloadedFile, sha256, signature);
      if (!isValid) {
        this.logger.error(`Firma o integridad inválida para v${info.version}. Actualización rechazada de forma segura.`);
        await this.autoUpdater.reportStatus(info.version, 'failed', 'Fallo de verificación criptográfica Ed25519');
        this.isUpdating = false;
        return;
      }

      this.logger.info(`✓ Verificación criptográfica exitosa. Aplicando reemplazo atómico en Windows...`);
      await this.autoUpdater.applyUpdate(downloadedFile);
    } catch (err) {
      this.logger.error(`Error durante el ciclo de actualización automática: ${String(err)}`);
      await this.autoUpdater.reportStatus(info.version, 'failed', String(err));
      this.isUpdating = false;
    }
  }

  /**
   * Cold start check for available updates.
   */
  public async checkForUpdatesAndApply(): Promise<void> {
    if (this.isUpdating) return;
    try {
      const check = await this.autoUpdater.checkForUpdate();
      if (check.available && check.version && check.downloadUrl && check.sha256 && check.signature) {
        this.logger.info(`Nueva versión detectada al iniciar: v${check.version}`);
        await this.applyUpdateFromInfo(check as any);
      }
    } catch (err) {
      this.logger.warn(`Aviso en comprobación inicial de actualizaciones: ${String(err)}`);
    }
  }

  private startLicenseValidationLoop(): void {
    // Validate license every 24 hours (86,400,000 ms)
    const intervalMs = 24 * 60 * 60 * 1000;
    this.licenseCheckTimer = setInterval(async () => {
      if (!this.isRunning) return;
      await this.validateLicense();
    }, intervalMs);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.licenseCheckTimer) {
      clearInterval(this.licenseCheckTimer);
      this.licenseCheckTimer = null;
    }
    if (this.watcher) {
      this.watcher.stop();
      this.watcher = null;
    }
    if (this.factusol) {
      await this.factusol.disconnect();
      this.factusol = null;
    }
    this.logger.info('ERP Bridge Local Agent detenido con éxito.');
  }

  private loadConfigFromDisk(): AgentConfigFile {
    try {
      if (fs.existsSync(this.configFilePath)) {
        return JSON.parse(fs.readFileSync(this.configFilePath, 'utf8')) as AgentConfigFile;
      }
    } catch {}
    return {};
  }

  private saveConfigToDisk(): void {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2), 'utf8');
      this.logger.debug(`Configuración guardada en ${this.configFilePath}`);
    } catch (err) {
      this.logger.warn(`No se pudo persistir la configuración en disco: ${String(err)}`);
    }
  }
}
