import fs from 'fs';
import {
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
  UpdateOrchestratorService,
} from './update';
import {
  AgentConfigFile,
  AgentFactusolSettings,
  AgentWooCommerceSettings,
  AgentUniversalBridgeSettings,
  AgentShopifySettings,
  AgentHoldedSettings,
  AgentSyncRules,
  AgentNotificationSettings,
  ConfigManager,
} from './config';
import { SyncHistoryRecord, HistoryManager } from './history';
import {
  EventBus,
  LogEvent,
  SystemInfoService,
  AgentStatusDetails,
  PreflightHealthService,
  PreflightHealthReport,
  LiveHealthService,
  LiveHealthReport,
  IncidentReporterService,
  IncidentReportPayload,
  IncidentReportResult,
} from './diagnostics';
import { AgentLicenseStatus, LicenseValidationStatus, LicenseService } from './license';
import { FactusolMetadata, ArticlePreviewItem, PathResolutionResult, FactusolService, FactusolPathResolver } from './factusol';
import {
  WooCommerceTestResult,
  UniversalBridgeTestResult,
  ShopifyTestResult,
  ChannelTesterService,
  SECRET_MASK,
  isSecretMaskedOrEmpty,
} from './channels';
import { SyncManualResult, CatalogUploadResult, FileWatcherService, LocalSyncEngine } from './sync';
import { AutoStartService } from './system';
import { NotificationTesterService } from './notifications';
import {
  SalesLedgerManager,
  GetSalesOrdersOptions,
  PaginatedSalesOrdersResult,
  SalesOrderRecord,
  SalesOrderManager,
} from './orders';
import { StatusAggregatorService, HeartbeatService } from './status';
import { PairingService, ConfigApplierService, FileWatcherCoordinatorService } from './lifecycle';

// Re-exportar tipos y submódulos para 100% de compatibilidad externa
export * from './config';
export * from './history';
export * from './orders';
export * from './diagnostics';
export * from './license';
export * from './factusol';
export * from './channels';
export * from './sync';
export * from './update';
export * from './system';
export * from './status';
export * from './lifecycle';
export * from './notifications';

export { SECRET_MASK, isSecretMaskedOrEmpty };

export interface AgentGuiServer {
  stop(): Promise<void>;
  getUrl?(): string;
}

export class LocalAgent {
  private readonly logger = new Logger('LocalAgent');

  // Subservicios de dominio
  public readonly configManager: ConfigManager;
  public readonly historyManager: HistoryManager;
  public readonly salesLedgerManager: SalesLedgerManager;
  public readonly eventBus: EventBus;
  public readonly licenseService: LicenseService;
  public readonly factusolService: FactusolService;
  public readonly fileWatcherService: FileWatcherService;
  public readonly syncEngine: LocalSyncEngine;
  public readonly autoUpdater: AutoUpdater;
  public readonly updateClient: UpdateClient;
  public readonly autoStartService: AutoStartService;
  public readonly preflightHealthService: PreflightHealthService;

  // Delegados especializados modularizados
  public readonly salesOrderManager: SalesOrderManager;
  public readonly channelTester: ChannelTesterService;
  public readonly statusAggregator: StatusAggregatorService;
  public readonly incidentReporter: IncidentReporterService;
  public readonly heartbeatService: HeartbeatService;
  public readonly updateOrchestrator: UpdateOrchestratorService;
  public readonly pairingService: PairingService;
  public readonly configApplierService: ConfigApplierService;
  public readonly notificationTester: NotificationTesterService;
  public readonly fileWatcherCoordinator: FileWatcherCoordinatorService;

  private isRunning = false;
  private guiServer: AgentGuiServer | null = null;

  constructor(customConfig?: Partial<AgentConfigFile>, customStoreDir?: string) {
    this.configManager = new ConfigManager(customConfig);
    const storeDir = customStoreDir || this.configManager.getAppDir();
    this.historyManager = new HistoryManager(storeDir);
    this.salesLedgerManager = new SalesLedgerManager(storeDir);
    this.eventBus = new EventBus(80);
    this.licenseService = new LicenseService(this.configManager, this.eventBus, customStoreDir);
    this.factusolService = new FactusolService(this.configManager, this.eventBus);
    this.fileWatcherService = new FileWatcherService();
    this.syncEngine = new LocalSyncEngine(
      this.configManager,
      this.factusolService,
      this.historyManager,
      this.eventBus,
      () => this.licenseService.getLicenseStatus(),
      this.salesLedgerManager
    );
    this.autoStartService = new AutoStartService();

    const cfg = this.configManager.get();
    if (!cfg.shopify) {
      try {
        const cfgPath = this.configManager.getConfigFilePath();
        if (fs.existsSync(cfgPath)) {
          const raw = fs.readFileSync(cfgPath, 'utf8').replace(/^\uFEFF/, '');
          const parsed = JSON.parse(raw);
          if (parsed && parsed.shopify) cfg.shopify = parsed.shopify;
        }
      } catch {}
    }
    if (customConfig?.shopify) {
      cfg.shopify = { ...(cfg.shopify || {}), ...customConfig.shopify };
    }
    this.preflightHealthService = new PreflightHealthService({
      apiBaseUrl: cfg.apiBaseUrl || 'https://bridge.cristianjm.com',
      factusolDbPath: cfg.factusol?.databasePath || cfg.factusolDbPath,
    });
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

    // Inicialización de delegados especializados
    this.salesOrderManager = new SalesOrderManager(this.salesLedgerManager, this.configManager, this.factusolService, this.eventBus);
    this.channelTester = new ChannelTesterService(this.configManager);
    this.statusAggregator = new StatusAggregatorService({
      configManager: this.configManager,
      licenseService: this.licenseService,
      factusolService: this.factusolService,
      fileWatcherService: this.fileWatcherService,
      historyManager: this.historyManager,
      eventBus: this.eventBus,
      preflightHealthService: this.preflightHealthService,
      getUpdateStatus: () => this.getUpdateStatus(),
      getPreflightHealth: (force?: boolean) => this.getPreflightHealth(force),
    });
    this.incidentReporter = new IncidentReporterService(this.configManager, this.licenseService, this.eventBus, () => this.exportDiagnostic());
    this.updateOrchestrator = new UpdateOrchestratorService({
      autoUpdater: this.autoUpdater,
      updateClient: this.updateClient,
      getCurrentVersion: () => this.configManager.getVersion(),
    });
    this.heartbeatService = new HeartbeatService({
      configManager: this.configManager,
      licenseService: this.licenseService,
      factusolService: this.factusolService,
      fileWatcherService: this.fileWatcherService,
      onUpdateDetected: (info) => void this.applyUpdateFromInfo(info),
      isUpdating: () => this.updateOrchestrator.getIsUpdating(),
    });
    this.pairingService = new PairingService(this.configManager);
    this.configApplierService = new ConfigApplierService(this.configManager, this.licenseService, this.factusolService, this.syncEngine, this.eventBus);
    this.notificationTester = new NotificationTesterService(this.configManager);
    this.fileWatcherCoordinator = new FileWatcherCoordinatorService(this.configManager, this.licenseService, this.syncEngine, this.eventBus);

    this.addEvent('info', `🚀 Bentian Local Agent inicializado en ${cfg.agentName} (v${this.configManager.getVersion()})`);
  }

  // --- Métodos de Configuración ---
  public getVersion(): string { return this.configManager.getVersion(); }
  public getConfig(): Readonly<AgentConfigFile> { return this.configManager.getConfig(); }
  public setApiBaseUrl(url: string): void { this.configManager.setApiBaseUrl(url); }
  public setFactusolDbPath(dbPath: string): void { this.configManager.setFactusolDbPath(dbPath); }

  public async saveFullConfig(updates: {
    factusol?: AgentFactusolSettings;
    woocommerce?: AgentWooCommerceSettings;
    universalBridge?: AgentUniversalBridgeSettings;
    shopify?: AgentShopifySettings;
    holded?: AgentHoldedSettings;
    channelType?: 'woocommerce' | 'universal_bridge' | 'shopify' | 'holded';
    syncRules?: AgentSyncRules;
    licenseKey?: string;
    notifications?: AgentNotificationSettings;
  }): Promise<{ success: boolean; message: string }> {
    return this.configApplierService.saveFullConfig(updates, () => this.isRunning);
  }

  // --- Métodos de Diagnósticos y Eventos ---
  public getRecentEvents(): LogEvent[] { return this.eventBus.getRecentEvents(); }
  public addEvent(level: 'info' | 'warn' | 'error' | 'success', message: string): void { this.eventBus.addEvent(level, message); }
  public getSyncHistory(): SyncHistoryRecord[] { return this.historyManager.getSyncHistory(); }
  public addSyncHistoryRecord(record: Omit<SyncHistoryRecord, 'id' | 'timestamp'>): void { this.historyManager.addSyncHistoryRecord(record); }

  // --- Métodos de Libro de Ventas (Sales Ledger) Delegados ---
  public getSalesOrders(options?: GetSalesOrdersOptions): PaginatedSalesOrdersResult {
    return this.salesOrderManager.getSalesOrders(options);
  }
  public getSalesOrderById(id: string): SalesOrderRecord | null {
    return this.salesOrderManager.getSalesOrderById(id);
  }
  public async retrySalesOrder(id: string): Promise<{ success: boolean; message: string; order?: SalesOrderRecord }> {
    return this.salesOrderManager.retrySalesOrder(id);
  }

  public getSystemInfo(): AgentSystemInfo { return SystemInfoService.getSystemInfo(); }
  public async getHWID(): Promise<string> { return this.licenseService.getHWID(); }
  public exportDiagnostic(): string { return this.statusAggregator.exportDiagnostic(); }

  public async reportIncident(payload: IncidentReportPayload): Promise<IncidentReportResult> {
    return this.incidentReporter.reportIncident(payload);
  }

  public async getPreflightHealth(force = false): Promise<PreflightHealthReport> {
    const cfg = this.configManager.get();
    const dbPath = cfg.factusol?.databasePath || cfg.factusolDbPath;
    (this.preflightHealthService as any).options.apiBaseUrl = cfg.apiBaseUrl || 'https://bridge.cristianjm.com';
    (this.preflightHealthService as any).options.factusolDbPath = dbPath;
    return this.preflightHealthService.runDiagnostics(force);
  }

  public async getStatusDetails(): Promise<AgentStatusDetails> {
    return this.statusAggregator.getStatusDetails();
  }

  // --- Métodos de Notificaciones Delegados ---
  public async testEmailNotification(custom?: AgentNotificationSettings): Promise<{ success: boolean; message: string }> {
    return this.notificationTester.testEmailNotification(custom);
  }
  public async testTelegramNotification(custom?: AgentNotificationSettings): Promise<{ success: boolean; message: string }> {
    return this.notificationTester.testTelegramNotification(custom);
  }
  public async testDiscordNotification(custom?: AgentNotificationSettings): Promise<{ success: boolean; message: string }> {
    return this.notificationTester.testDiscordNotification(custom);
  }

  public async getLiveHealth(): Promise<LiveHealthReport> {
    return LiveHealthService.runDiagnostics(this.configManager.get(), this.licenseService.getLicenseStatus());
  }

  // --- Métodos de Licenciamiento ---
  public getLicenseStatus(): { status: AgentLicenseStatus; plan?: string } { return this.licenseService.getLicenseStatus(); }
  public async activateLicense(licenseKey: string): Promise<LicenseActivationResponse> { return this.licenseService.activateLicense(licenseKey); }
  public async validateLicense(): Promise<LicenseValidationStatus> { return this.licenseService.validateLicense(); }
  public async deactivateLicense(customKey?: string): Promise<{ success: boolean; message?: string }> { return this.licenseService.deactivateLicense(customKey); }

  // --- Métodos de Factusol ---
  public async testFactusolConnection(dbPath: string) { return this.factusolService.testConnection(dbPath); }
  public async reconnectFactusol(dbPath: string) { return this.factusolService.reconnect(dbPath); }
  public async getFactusolArticleCount(customDbPath?: string) { return this.factusolService.getArticleCount(customDbPath); }
  public async getFactusolMetadata(customDbPath?: string): Promise<FactusolMetadata> { return this.factusolService.getMetadata(customDbPath); }
  public async getFactusolPreviewArticles(limit = 25): Promise<{ articles: ArticlePreviewItem[]; total?: number }> {
    return this.factusolService.getPreviewArticles(undefined, limit);
  }
  public resolveFactusolPath(inputPath: string): PathResolutionResult { return FactusolPathResolver.resolve(inputPath); }

  // --- Métodos de Canales Web Delegados ---
  public async testWooCommerceConnection(settings: { storeUrl: string; consumerKey: string; consumerSecret: string }): Promise<WooCommerceTestResult> {
    return this.channelTester.testWooCommerceConnection(settings);
  }
  public async testUniversalBridge(settings: { storeUrl: string; secretKey?: string }): Promise<UniversalBridgeTestResult> {
    return this.channelTester.testUniversalBridge(settings);
  }
  public async testShopifyConnection(settings: { shopSubdomain: string; accessToken: string; apiVersion?: string }): Promise<ShopifyTestResult> {
    return this.channelTester.testShopifyConnection(settings);
  }
  public async testHoldedConnection(config: { apiKey: string; defaultWarehouseId?: string }): Promise<{ success: boolean; latencyMs: number; message?: string }> {
    return this.channelTester.testHoldedConnection(config);
  }

  // --- Métodos de Sincronización ---
  public async triggerManualSync(): Promise<SyncManualResult> { return this.syncEngine.triggerManualSync(); }
  public async uploadCatalog(options?: { limit?: number; onlyMissing?: boolean }): Promise<CatalogUploadResult> {
    return this.syncEngine.uploadCatalog(options);
  }

  // --- Ciclo de Vida del Agente ---
  public async pair(pairingToken: string, customName?: string): Promise<{ agentId: string; detectedFactusol: FactusolDetectedInstance[] }> {
    return this.pairingService.pair(pairingToken, customName);
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

    if (!cfg.factusolDbPath) {
      const primary = FactusolDetector.getPrimaryInstance();
      if (primary) {
        cfg.factusolDbPath = primary.databasePath;
        this.logger.info(`Auto-asignada base de datos Factusol: ${cfg.factusolDbPath}`);
      }
    }

    if (cfg.factusolDbPath && fs.existsSync(cfg.factusolDbPath)) {
      await this.factusolService.connect(cfg.factusolDbPath);
      this.fileWatcherService.start(cfg.factusolDbPath, cfg.organizationId || 'org_default', async (reason) => {
        await this.fileWatcherCoordinator.handleFileWatcherChange(reason);
      });
      this.addEvent('info', '✓ Vigilante de archivos Factusol activo en tiempo real');
    }

    this.syncEngine.startAutoSyncLoop(() => this.isRunning);

    // Filosofía "Install & Plug": disparo inicial tras arranque a los 3s
    setTimeout(() => {
      if (this.isRunning && !this.syncEngine.isBusy()) {
        void this.syncEngine.triggerManualSync(false).catch(() => null);
      }
    }, 3000);

    this.heartbeatService.start(() => this.isRunning);
    this.licenseService.startValidationLoop();
    this.updateClient.startPeriodicCheck();
  }

  public async applyUpdateFromInfo(info: { version: string; downloadUrl?: string; sha256?: string; signature?: string }): Promise<void> {
    return this.updateOrchestrator.applyUpdateFromInfo(info);
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
    return this.updateOrchestrator.checkForUpdatesAndApply();
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
    this.heartbeatService.stop();
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

// Alias de conveniencia
export { LocalAgent as Agent };
