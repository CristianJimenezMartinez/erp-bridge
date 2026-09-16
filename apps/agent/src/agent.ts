import os from 'os';
import fs from 'fs';
import path from 'path';
import {
  AgentHeartbeatPayload,
  AgentPairingRequest,
  AgentSystemInfo,
  FactusolDetectedInstance,
  LicenseActivationResponse,
  Logger,
  UpdateChannel,
  UpdateCheckResponse,
} from '@erp-bridge/shared';
import { FactusolDetector } from './detector';
import {
  AutoUpdater,
  UpdateClient,
  UpdateClientState,
  UpdateOptions,
} from './update';

// Submódulos modulares en árbol
import {
  AgentConfigFile,
  AgentFactusolSettings,
  AgentWooCommerceSettings,
  AgentUniversalBridgeSettings,
  AgentSyncRules,
  ConfigManager,
} from './config';
import { SyncHistoryRecord, HistoryManager } from './history';
import { EventBus, LogEvent, SystemInfoService, DiagnosticExporter, AgentStatusDetails } from './diagnostics';
import { AgentLicenseStatus, LicenseValidationStatus, LicenseService } from './license';
import { FactusolMetadata, ArticlePreviewItem, PathResolutionResult, FactusolService, FactusolPathResolver } from './factusol';
import { WooCommerceTestResult, UniversalBridgeTestResult, WooCommerceTester, UniversalBridgeTester } from './channels';
import { SyncManualResult, CatalogUploadResult, FileWatcherService, LocalSyncEngine } from './sync';
import { AutoStartService } from './system';

// Re-exportar tipos para 100% de compatibilidad externa
export * from './config';
export * from './history';
export * from './diagnostics';
export * from './license';
export * from './factusol';
export * from './channels';
export * from './sync';
export * from './update';
export * from './system';

export interface AgentGuiServer {
  stop(): Promise<void>;
  getUrl?(): string;
}

export class LocalAgent {
  private readonly logger = new Logger('LocalAgent');

  // Subservicios de dominio
  public readonly configManager: ConfigManager;
  public readonly historyManager: HistoryManager;
  public readonly eventBus: EventBus;
  public readonly licenseService: LicenseService;
  public readonly factusolService: FactusolService;
  public readonly fileWatcherService: FileWatcherService;
  public readonly syncEngine: LocalSyncEngine;
  public readonly autoUpdater: AutoUpdater;
  public readonly updateClient: UpdateClient;
  public readonly autoStartService: AutoStartService;

  private isRunning = false;
  private isUpdating = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private guiServer: AgentGuiServer | null = null;

  constructor(customConfig?: Partial<AgentConfigFile>, customStoreDir?: string) {
    this.configManager = new ConfigManager(customConfig);
    this.historyManager = new HistoryManager(this.configManager.getAppDir());
    this.eventBus = new EventBus(80);
    this.licenseService = new LicenseService(this.configManager, this.eventBus, customStoreDir);
    this.factusolService = new FactusolService(this.configManager, this.eventBus);
    this.fileWatcherService = new FileWatcherService();
    this.syncEngine = new LocalSyncEngine(this.configManager, this.factusolService, this.historyManager, this.eventBus);
    this.autoStartService = new AutoStartService();

    const cfg = this.configManager.get();
    const updateOptions: UpdateOptions = {
      apiBaseUrl: cfg.apiBaseUrl || 'https://bridge.cristianjm.com',
      agentId: cfg.agentId || 'agent_local_standalone',
      currentVersion: this.configManager.getVersion(),
      checkIntervalMs: 60 * 60 * 1000,
      autoDownload: true,
      autoApply: true,
      publicKeyPem:
        '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA2Sc3emV3VqjbPmw5RXc1aaeaz0dtpzwI7WP6eHhDpBU=\n-----END PUBLIC KEY-----',
    };

    this.autoUpdater = new AutoUpdater(updateOptions);
    this.updateClient = new UpdateClient(updateOptions, this.eventBus);

    this.addEvent('info', `🚀 Bentian Local Agent inicializado en ${cfg.agentName} (v${this.configManager.getVersion()})`);
  }

  // --- Métodos de Configuración ---
  public getVersion(): string {
    return this.configManager.getVersion();
  }

  public getConfig(): Readonly<AgentConfigFile> {
    return this.configManager.getConfig();
  }

  public setApiBaseUrl(url: string): void {
    this.configManager.setApiBaseUrl(url);
  }

  public setFactusolDbPath(dbPath: string): void {
    this.configManager.setFactusolDbPath(dbPath);
  }

  public async saveFullConfig(updates: {
    factusol?: AgentFactusolSettings;
    woocommerce?: AgentWooCommerceSettings;
    universalBridge?: AgentUniversalBridgeSettings;
    channelType?: 'woocommerce' | 'universal_bridge';
    syncRules?: AgentSyncRules;
    licenseKey?: string;
  }): Promise<{ success: boolean; message: string }> {
    const cfg = this.configManager.get();
    if (updates.factusol) {
      cfg.factusol = { ...(cfg.factusol || {}), ...updates.factusol };
      if (updates.factusol.databasePath) {
        cfg.factusolDbPath = updates.factusol.databasePath;
      }
    }
    if (updates.woocommerce) {
      cfg.woocommerce = { ...(cfg.woocommerce || {}), ...updates.woocommerce };
    }
    if (updates.universalBridge) {
      cfg.universalBridge = { ...(cfg.universalBridge || {}), ...updates.universalBridge };
    }
    if (updates.channelType) {
      cfg.channelType = updates.channelType;
    }
    if (updates.syncRules) {
      cfg.syncRules = { ...(cfg.syncRules || {}), ...updates.syncRules };
    }

    let licenseMsg = '';
    if (updates.licenseKey && updates.licenseKey !== cfg.licenseKey) {
      const licRes = await this.licenseService.activateLicense(updates.licenseKey);
      if (!licRes.success) {
        licenseMsg = ` (Aviso en licencia: ${licRes.error})`;
      } else {
        cfg.licenseKey = updates.licenseKey;
        licenseMsg = ' (Licencia activada con éxito)';
      }
    }

    this.configManager.saveConfigToDisk();
    this.syncEngine.startAutoSyncLoop(() => this.isRunning);

    if (cfg.factusolDbPath && fs.existsSync(cfg.factusolDbPath)) {
      await this.factusolService.reconnect(cfg.factusolDbPath).catch(() => null);
    }

    this.addEvent('success', `✓ Configuración local actualizada${licenseMsg}`);
    return { success: true, message: `Configuración guardada con éxito${licenseMsg}` };
  }

  // --- Métodos de Diagnósticos y Eventos ---
  public getRecentEvents(): LogEvent[] {
    return this.eventBus.getRecentEvents();
  }

  public addEvent(level: 'info' | 'warn' | 'error' | 'success', message: string): void {
    this.eventBus.addEvent(level, message);
  }

  public getSyncHistory(): SyncHistoryRecord[] {
    return this.historyManager.getSyncHistory();
  }

  public addSyncHistoryRecord(record: Omit<SyncHistoryRecord, 'id' | 'timestamp'>): void {
    this.historyManager.addSyncHistoryRecord(record);
  }

  public getSystemInfo(): AgentSystemInfo {
    return SystemInfoService.getSystemInfo();
  }

  public async getHWID(): Promise<string> {
    return this.licenseService.getHWID();
  }

  public exportDiagnostic(): string {
    const cfg = this.configManager.get();
    const licStatus = this.licenseService.getLicenseStatus();
    return DiagnosticExporter.generate({
      config: cfg,
      configFilePath: this.configManager.getConfigFilePath(),
      currentVersion: this.configManager.getVersion(),
      currentHwid: 'Cargando HWID...',
      licenseStatus: licStatus.status,
      activePlan: licStatus.plan,
      watcherActive: this.fileWatcherService.isActive(),
      syncHistory: this.historyManager.getSyncHistory(),
      recentEvents: this.eventBus.getRecentEvents(),
    });
  }

  public async getStatusDetails(): Promise<AgentStatusDetails> {
    const hwid = await this.licenseService.getHWID();
    const license = await this.licenseService.validateLicense();
    const cfg = this.configManager.get();
    const dbPath = cfg.factusol?.databasePath || cfg.factusolDbPath;

    let articleCount: number | undefined;
    let fileSizeBytes: number | undefined;
    let connected = false;
    let statusMessage = 'No configurado';

    if (dbPath && fs.existsSync(dbPath)) {
      try {
        const stats = fs.statSync(dbPath);
        fileSizeBytes = stats.size;
        const connector = this.factusolService.getConnector();
        if (connector) {
          const health = await connector.healthCheck();
          connected = health.status === 'HEALTHY';
          statusMessage = health.message || '';
          if (connected) {
            articleCount = await this.factusolService.getArticleCount(dbPath);
          }
        }
      } catch (err) {
        statusMessage = err instanceof Error ? err.message : String(err);
      }
    }

    return {
      agentName: cfg.agentName || 'Bentian Agent',
      agentVersion: this.configManager.getVersion(),
      agentId: cfg.agentId || 'Sin registrar (Modo Standalone)',
      apiBaseUrl: cfg.apiBaseUrl || 'https://bridge.cristianjm.com',
      licenseKey: cfg.licenseKey,
      hwid,
      license,
      factusol: {
        configured: Boolean(dbPath && fs.existsSync(dbPath)),
        databasePath: dbPath || '',
        fileName: dbPath ? path.basename(dbPath) : '',
        connected,
        watcherActive: this.fileWatcherService.isActive(),
        articleCount,
        fileSizeBytes,
        statusMessage,
      },
      factusolSettings: cfg.factusol,
      woocommerceSettings: cfg.woocommerce,
      universalBridgeSettings: cfg.universalBridge,
      channelType: cfg.channelType || 'woocommerce',
      syncRules: cfg.syncRules,
      syncHistory: this.historyManager.getSyncHistory(),
      system: SystemInfoService.getSystemInfo(),
      recentEvents: this.eventBus.getRecentEvents(),
    };
  }

  // --- Métodos de Licenciamiento ---
  public getLicenseStatus(): { status: AgentLicenseStatus; plan?: string } {
    return this.licenseService.getLicenseStatus();
  }

  public async activateLicense(licenseKey: string): Promise<LicenseActivationResponse> {
    return this.licenseService.activateLicense(licenseKey);
  }

  public async validateLicense(): Promise<LicenseValidationStatus> {
    return this.licenseService.validateLicense();
  }

  public async deactivateLicense(customKey?: string): Promise<{ success: boolean; message?: string }> {
    return this.licenseService.deactivateLicense(customKey);
  }

  // --- Métodos de Factusol ---
  public async testFactusolConnection(dbPath: string) {
    return this.factusolService.testConnection(dbPath);
  }

  public async reconnectFactusol(dbPath: string) {
    return this.factusolService.reconnect(dbPath);
  }

  public async getFactusolArticleCount(customDbPath?: string) {
    return this.factusolService.getArticleCount(customDbPath);
  }

  public async getFactusolMetadata(customDbPath?: string): Promise<FactusolMetadata> {
    return this.factusolService.getMetadata(customDbPath);
  }

  public async getFactusolPreviewArticles(limit = 25): Promise<{ articles: ArticlePreviewItem[]; total?: number }> {
    return this.factusolService.getPreviewArticles(undefined, limit);
  }

  public resolveFactusolPath(inputPath: string): PathResolutionResult {
    return FactusolPathResolver.resolve(inputPath);
  }

  // --- Métodos de Canales Web ---
  public async testWooCommerceConnection(settings: { storeUrl: string; consumerKey: string; consumerSecret: string }): Promise<WooCommerceTestResult> {
    return WooCommerceTester.test(settings);
  }

  public async testUniversalBridge(settings: { storeUrl: string; secretKey?: string }): Promise<UniversalBridgeTestResult> {
    return UniversalBridgeTester.test(settings);
  }

  // --- Métodos de Sincronización ---
  public async triggerManualSync(): Promise<SyncManualResult> {
    return this.syncEngine.triggerManualSync();
  }

  public async uploadCatalog(options?: { limit?: number; onlyMissing?: boolean }): Promise<CatalogUploadResult> {
    return this.syncEngine.uploadCatalog(options);
  }

  // --- Ciclo de Vida del Agente ---
  public async pair(pairingToken: string, customName?: string): Promise<{
    agentId: string;
    detectedFactusol: FactusolDetectedInstance[];
  }> {
    const cfg = this.configManager.get();
    const name = customName || cfg.agentName || os.hostname();
    this.logger.info(`Iniciando emparejamiento con el Core (Token: ${pairingToken})...`);

    const detected = FactusolDetector.detectAll(cfg.factusolDbPath ? [path.dirname(cfg.factusolDbPath)] : []);
    const primary = detected.length > 0 ? detected[0] : null;

    const requestPayload: AgentPairingRequest = {
      pairingToken,
      name,
      systemInfo: SystemInfoService.getSystemInfo(),
      detectedFactusol: detected,
    };

    const response = await fetch(`${cfg.apiBaseUrl}/api/v1/agents/pair`, {
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

    cfg.agentId = resJson.data.agent.id;
    cfg.agentName = resJson.data.agent.name;
    cfg.authToken = resJson.data.authToken;
    if (primary) {
      cfg.factusolDbPath = primary.databasePath;
    }

    this.configManager.saveConfigToDisk();
    this.logger.info(`Emparejamiento exitoso. Agent ID: ${cfg.agentId}`);

    return {
      agentId: resJson.data.agent.id,
      detectedFactusol: detected,
    };
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    const cfg = this.configManager.get();
    const hwid = await this.licenseService.getHWID();

    await this.autoUpdater.handlePostUpdate();
    const licenseCheck = await this.licenseService.validateLicense();

    this.logger.info(`🚀 Arrancando ERP Bridge Local Agent: ${cfg.agentName || 'Agent'} (v${this.configManager.getVersion()})`, {
      agentId: cfg.agentId || 'Sin registrar (modo standalone)',
      version: this.configManager.getVersion(),
      apiBaseUrl: cfg.apiBaseUrl,
      hwid: hwid.substring(0, 16) + '...',
      licenseStatus: licenseCheck.status,
      plan: licenseCheck.plan || 'Ninguno',
    });

    if (licenseCheck.status === 'VALID' || licenseCheck.status === 'GRACE_PERIOD') {
      this.addEvent('success', `✓ Licencia ${licenseCheck.status} (Plan: ${licenseCheck.plan || 'Professional'})`);
    } else {
      this.addEvent('warn', `⚠️ Licencia no activa (${licenseCheck.status}). Active su clave para sincronizar.`);
    }

    // Auto-detect Factusol if not already set
    if (!cfg.factusolDbPath) {
      const primary = FactusolDetector.getPrimaryInstance();
      if (primary) {
        cfg.factusolDbPath = primary.databasePath;
        this.logger.info(`Auto-asignada base de datos Factusol: ${cfg.factusolDbPath}`);
      }
    }

    // Conectar Factusol e inicializar vigilante
    if (cfg.factusolDbPath && fs.existsSync(cfg.factusolDbPath)) {
      await this.factusolService.connect(cfg.factusolDbPath);

      this.fileWatcherService.start(cfg.factusolDbPath, cfg.organizationId || 'org_default', async (reason) => {
        this.logger.info(`Cambio detectado en base Factusol (${reason}). Disparando sincronización de stock autónoma...`);
        this.addEvent('info', `Cambio detectado en Factusol (${reason}). Sincronizando stock...`);
        if (!this.syncEngine.isBusy()) {
          void this.syncEngine.triggerManualSync();
        }
        if (cfg.agentId && cfg.apiBaseUrl) {
          await fetch(`${cfg.apiBaseUrl}/api/v1/sync/run-reactive`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(cfg.authToken ? { Authorization: `Bearer ${cfg.authToken}` } : {}),
            },
            body: JSON.stringify({
              agentId: cfg.agentId,
              organizationId: cfg.organizationId,
              reason,
              timestamp: new Date().toISOString(),
            }),
          }).catch((err) => {
            this.logger.warn(`No se pudo notificar sync reactivo a la API: ${err instanceof Error ? err.message : String(err)}`);
          });
        }
      });
      this.addEvent('info', '✓ Vigilante de archivos Factusol activo en tiempo real');
    }

    this.syncEngine.startAutoSyncLoop(() => this.isRunning);
    this.startHeartbeat();
    this.licenseService.startValidationLoop();
    this.updateClient.startPeriodicCheck();
  }

  private startHeartbeat(): void {
    const sendBeat = async () => {
      if (!this.isRunning) return;
      const cfg = this.configManager.get();

      try {
        let factusolHealth;
        const connector = this.factusolService.getConnector();
        if (connector) {
          const check = await connector.healthCheck();
          factusolHealth = {
            status: check.status,
            latencyMs: check.latencyMs,
            databasePath: cfg.factusolDbPath,
            message: check.message,
          };
        }

        const heartbeat: AgentHeartbeatPayload = {
          agentId: cfg.agentId || 'agent_local_standalone',
          version: this.configManager.getVersion(),
          status: 'ONLINE',
          systemInfo: SystemInfoService.getSystemInfo(),
          factusolHealth,
          fileWatcherActive: this.fileWatcherService.isActive(),
        };

        if (cfg.agentId && cfg.apiBaseUrl) {
          const res = await fetch(`${cfg.apiBaseUrl}/api/v1/agents/${cfg.agentId}/heartbeat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(cfg.authToken ? { Authorization: `Bearer ${cfg.authToken}` } : {}),
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
      } catch (err) {
        this.logger.warn('Fallo al emitir heartbeat al Core', { err: String(err) });
      }
    };

    void sendBeat();
    const cfg = this.configManager.get();
    this.heartbeatTimer = setInterval(sendBeat, cfg.heartbeatIntervalMs || 30000);
  }

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

  public async checkForUpdates(channel?: UpdateChannel): Promise<UpdateCheckResponse> {
    return this.updateClient.checkForUpdates(channel);
  }

  public async applyUpdate(): Promise<{ success: boolean; message: string }> {
    return this.updateClient.applyUpdate();
  }

  public getUpdateStatus(): UpdateClientState {
    return this.updateClient.getStatus();
  }

  public async checkForUpdatesAndApply(): Promise<void> {
    if (this.isUpdating) return;
    try {
      const check = await this.checkForUpdates();
      if (check.available && check.version && check.downloadUrl && check.sha256 && check.signature) {
        this.logger.info(`Nueva versión detectada al iniciar: v${check.version}`);
        await this.applyUpdate();
      }
    } catch (err) {
      this.logger.warn(`Aviso en comprobación inicial de actualizaciones: ${String(err)}`);
    }
  }

  // --- Métodos de Arranque Automático (Windows) ---
  public async isAutoStartEnabled(): Promise<boolean> {
    return this.autoStartService.isEnabled();
  }

  public async setAutoStart(enabled: boolean): Promise<boolean> {
    const success = enabled ? await this.autoStartService.enable() : await this.autoStartService.disable();
    if (success) {
      this.addEvent('info', enabled ? '✓ Arranque automático con Windows activado' : 'Arranque automático con Windows desactivado');
    }
    return success;
  }

  public setGuiServer(server: AgentGuiServer | null): void {
    this.guiServer = server;
  }

  public getGuiServer(): AgentGuiServer | null {
    return this.guiServer;
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.syncEngine.stopAutoSyncLoop();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.updateClient.stopPeriodicCheck();
    this.licenseService.stopValidationLoop();
    this.fileWatcherService.stop();
    if (this.guiServer) {
      await this.guiServer.stop();
      this.guiServer = null;
    }
    this.eventBus.disconnectAllListeners();
    await this.factusolService.disconnect();
    this.logger.info('ERP Bridge Local Agent detenido con éxito.');
  }
}
