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
  DEFAULT_UPDATE_PUBLIC_KEY,
  UpdateClient,
  UpdateClientState,
  UpdateOptions,
  UpdateOrchestratorService,
} from './update';
import {
  AgentConfigFile,
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
  SimplyGestDetectedInstance,
  SimplyGestArticlePreviewItem,
  SimplyGestTestResult,
  SimplyGestService,
  SimplyGestDetector,
} from './simplygest';
import {
  WooCommerceTestResult,
  UniversalBridgeTestResult,
  ShopifyTestResult,
  PrestashopTestResult,
  PrestashopTestSettings,
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
  TestOrderSimulatorService,
  TestOrderSimulationOptions,
  TestOrderSimulationResult,
} from './orders';
import { StatusAggregatorService, HeartbeatService } from './status';
import { PairingService, ConfigApplierService, FileWatcherCoordinatorService, FullConfigUpdates } from './lifecycle';
import {
  ErpProviderRegistry,
  FactusolAdapter,
  SimplyGestAdapter,
  AgoraErpAdapter,
  Sage50ErpAdapter,
  A3ErpAdapter,
  IErpConnector,
  SupportedErpProviderId,
} from './erp';
import {
  Sage200ErpAdapter,
  IcgManagerErpAdapter,
  VisionwinErpAdapter,
  AplifisaErpAdapter,
  OdooErpAdapter,
  FacturaScriptsErpAdapter,
  BusinessCentralErpAdapter,
  ExtendedErpProviderId,
} from './erp-extensions';
import { enhanceSqlErpAdapter, enhanceSimplyGestAdapter } from './services/sql-erp-enhancer.service';

// Re-exportar tipos y submódulos para 100% de compatibilidad externa
export * from './config';
export * from './history';
export * from './orders';
export * from './diagnostics';
export * from './license';
export * from './factusol';
export * from './simplygest';
export * from './erp';
export * from './erp-extensions';
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
  public readonly simplygestService: SimplyGestService;
  public readonly factusolAdapter: FactusolAdapter;
  public readonly simplygestAdapter: SimplyGestAdapter;
  public readonly agoraAdapter: AgoraErpAdapter;
  public readonly sage50Adapter: Sage50ErpAdapter;
  public readonly a3erpAdapter: A3ErpAdapter;
  public readonly sage200Adapter: Sage200ErpAdapter;
  public readonly icgAdapter: IcgManagerErpAdapter;
  public readonly visionwinAdapter: VisionwinErpAdapter;
  public readonly aplifisaAdapter: AplifisaErpAdapter;
  public readonly odooAdapter: OdooErpAdapter;
  public readonly facturascriptsAdapter: FacturaScriptsErpAdapter;
  public readonly businesscentralAdapter: BusinessCentralErpAdapter;
  public readonly erpRegistry: ErpProviderRegistry;
  public readonly fileWatcherService: FileWatcherService;
  public readonly syncEngine: LocalSyncEngine;
  public readonly autoUpdater: AutoUpdater;
  public readonly updateClient: UpdateClient;
  public readonly autoStartService: AutoStartService;
  public readonly preflightHealthService: PreflightHealthService;

  // Delegados especializados modularizados
  public readonly salesOrderManager: SalesOrderManager;
  public readonly testOrderSimulator: TestOrderSimulatorService;
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
    this.licenseService = new LicenseService(this.configManager, this.eventBus, customStoreDir || process.env.BENTIAN_DATA_DIR);
    this.factusolService = new FactusolService(this.configManager, this.eventBus);
    this.simplygestService = new SimplyGestService(this.configManager, this.eventBus);
    this.factusolAdapter = new FactusolAdapter(this.configManager, this.factusolService, this.eventBus);
    this.simplygestAdapter = new SimplyGestAdapter(this.configManager, this.simplygestService, this.eventBus);
    this.agoraAdapter = new AgoraErpAdapter(this.configManager, this.eventBus);
    this.sage50Adapter = new Sage50ErpAdapter(this.configManager, this.eventBus);
    this.a3erpAdapter = new A3ErpAdapter(this.configManager, this.eventBus);
    this.sage200Adapter = new Sage200ErpAdapter(this.configManager, this.eventBus);
    this.icgAdapter = new IcgManagerErpAdapter(this.configManager, this.eventBus);
    this.visionwinAdapter = new VisionwinErpAdapter(this.configManager, this.eventBus);
    this.aplifisaAdapter = new AplifisaErpAdapter(this.configManager, this.eventBus);
    this.odooAdapter = new OdooErpAdapter(this.configManager, this.eventBus);
    this.facturascriptsAdapter = new FacturaScriptsErpAdapter(this.configManager, this.eventBus);
    this.businesscentralAdapter = new BusinessCentralErpAdapter(this.configManager, this.eventBus);
    this.erpRegistry = new ErpProviderRegistry(this.configManager, [
      this.factusolAdapter,
      this.simplygestAdapter,
      this.agoraAdapter,
      this.sage50Adapter,
      this.a3erpAdapter,
      this.sage200Adapter,
      this.icgAdapter,
      this.visionwinAdapter,
      this.aplifisaAdapter,
      this.odooAdapter,
      this.facturascriptsAdapter,
      this.businesscentralAdapter,
    ]);
    this.enhanceErpAdapters();
    this.fileWatcherService = new FileWatcherService();
    this.syncEngine = new LocalSyncEngine(
      this.configManager,
      this.factusolService,
      this.historyManager,
      this.eventBus,
      () => this.licenseService.getLicenseStatus(),
      this.salesLedgerManager,
      this.erpRegistry
    );
    this.autoStartService = new AutoStartService();

    const cfg = this.configManager.get();
    if (!cfg.shopify || !cfg.simplygest || !cfg.erpType || !cfg.softwareErp) {
      try {
        const cfgPath = this.configManager.getConfigFilePath();
        if (fs.existsSync(cfgPath)) {
          const raw = fs.readFileSync(cfgPath, 'utf8').replace(/^\uFEFF/, '');
          const parsed = JSON.parse(raw);
          if (parsed) {
            if (parsed.shopify && !cfg.shopify) cfg.shopify = parsed.shopify;
            if (parsed.prestashop && !cfg.prestashop) cfg.prestashop = parsed.prestashop;
            if (parsed.holded && !cfg.holded) cfg.holded = parsed.holded;
            if (parsed.notifications && !cfg.notifications) cfg.notifications = parsed.notifications;
            if (parsed.erpType && !cfg.erpType) cfg.erpType = parsed.erpType;
            if (parsed.simplygest && !cfg.simplygest) cfg.simplygest = parsed.simplygest;
            if (parsed.simplygestDbPath && !cfg.simplygestDbPath) cfg.simplygestDbPath = parsed.simplygestDbPath;
            if (parsed.softwareErp && !cfg.softwareErp) cfg.softwareErp = parsed.softwareErp;
          }
        }
      } catch {}
    }
    if (customConfig?.shopify) {
      cfg.shopify = { ...(cfg.shopify || {}), ...customConfig.shopify };
    }
    if (customConfig?.simplygest) {
      cfg.simplygest = { ...(cfg.simplygest || {}), ...customConfig.simplygest };
    }
    if (customConfig?.simplygestDbPath) {
      cfg.simplygestDbPath = customConfig.simplygestDbPath;
      if (!cfg.simplygest) cfg.simplygest = { databasePath: customConfig.simplygestDbPath };
    }
    if (customConfig?.erpType) {
      cfg.erpType = customConfig.erpType;
    }
    if (customConfig?.softwareErp) {
      cfg.softwareErp = customConfig.softwareErp;
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
      publicKeyPem: DEFAULT_UPDATE_PUBLIC_KEY,
    };

    this.autoUpdater = new AutoUpdater(updateOptions);
    this.updateClient = new UpdateClient(updateOptions, this.eventBus);

    // Inicialización de delegados especializados
    this.salesOrderManager = new SalesOrderManager(
      this.salesLedgerManager,
      this.configManager,
      this.factusolService,
      this.eventBus,
      this.erpRegistry,
      () => this.licenseService.getLicenseStatus()
    );
    this.testOrderSimulator = new TestOrderSimulatorService(
      this.configManager,
      this.eventBus,
      this.salesLedgerManager,
      this.factusolService,
      undefined,
      this.erpRegistry,
      () => this.licenseService.getLicenseStatus()
    );
    this.channelTester = new ChannelTesterService(this.configManager);
    this.statusAggregator = new StatusAggregatorService({
      configManager: this.configManager,
      licenseService: this.licenseService,
      factusolService: this.factusolService,
      simplygestService: this.simplygestService,
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
    this.configApplierService = new ConfigApplierService(
      this.configManager,
      this.licenseService,
      this.factusolService,
      this.syncEngine,
      this.eventBus,
      this.simplygestService,
      this.erpRegistry
    );
    this.notificationTester = new NotificationTesterService(this.configManager);
    this.fileWatcherCoordinator = new FileWatcherCoordinatorService(this.configManager, this.licenseService, this.syncEngine, this.eventBus);

    this.addEvent('info', `🚀 Bentian Local Agent inicializado en ${cfg.agentName} (v${this.configManager.getVersion()})`);
  }

  // --- Métodos de Configuración ---
  public getVersion(): string { return this.configManager.getVersion(); }
  public getConfig(): Readonly<AgentConfigFile> { return this.configManager.getConfig(); }
  public setApiBaseUrl(url: string): void { this.configManager.setApiBaseUrl(url); }
  public setFactusolDbPath(dbPath: string): void { this.configManager.setFactusolDbPath(dbPath); }

  public async saveFullConfig(updates: FullConfigUpdates): Promise<{ success: boolean; message: string }> {
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

  // --- Métodos de SimplyGest ---
  public async testSimplyGestConnection(dbPath: string): Promise<SimplyGestTestResult> {
    return this.simplygestService.testConnection(dbPath);
  }
  public async getSimplyGestPreviewArticles(limit = 25): Promise<{ articles: SimplyGestArticlePreviewItem[]; total?: number }> {
    const articles = await this.simplygestService.getPreviewArticles(undefined, limit);
    return { articles, total: articles.length };
  }
  public detectSimplyGest(): SimplyGestDetectedInstance[] {
    const additional: string[] = [];
    const current = this.configManager.get().simplygest?.databasePath || this.configManager.get().simplygestDbPath;
    if (current) additional.push(current);
    return SimplyGestDetector.detectAll(additional);
  }
  public resolveSimplyGestPath(inputPath: string) {
    return SimplyGestDetector.resolve(inputPath);
  }

  // --- Métodos de Gestión Multi-ERP Unificada ---
  public getActiveErpConnector(): IErpConnector { return this.erpRegistry.getActiveConnector(); }
  public getErpRegistry(): ErpProviderRegistry { return this.erpRegistry; }
  public switchActiveErp(providerId: SupportedErpProviderId) { return this.erpRegistry.setActiveProvider(providerId); }

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
  public async testPrestashopConnection(settings: PrestashopTestSettings): Promise<PrestashopTestResult> {
    return this.channelTester.testPrestashopConnection(settings);
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
    // Garantizar que el arranque automático con Windows esté siempre habilitado
    void this.autoStartService.enable().catch((err) => {
      this.logger.warn(`Aviso al garantizar auto-arranque con Windows: ${String(err)}`);
    });
    // Garantizar tiempos de estabilidad fijos e inmutables
    if (cfg.syncRules) {
      cfg.syncRules.enableFileWatcher = true;
      cfg.syncRules.debounceSeconds = 5;
      cfg.syncRules.periodicIntervalMinutes = 15;
    }
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

    // Sincronizar unidades de red mapeadas (W:, X:, Y:, Z:) de HKCU\Network antes de verificar rutas NAS
    FactusolDetector.syncMappedDrivesInSession();

    if (!cfg.factusolDbPath) {
      const primary = FactusolDetector.getPrimaryInstance();
      if (primary) {
        cfg.factusolDbPath = primary.databasePath;
        this.logger.info(`Auto-asignada base de datos Factusol: ${cfg.factusolDbPath}`);
      }
    }

    let startupDbPath = cfg.factusolDbPath;
    if (startupDbPath && !fs.existsSync(startupDbPath)) {
      const uncPath = FactusolPathResolver.resolveMappedDriveToUnc(startupDbPath);
      if (uncPath && fs.existsSync(uncPath)) {
        startupDbPath = uncPath;
      }
    }

    if (startupDbPath && fs.existsSync(startupDbPath)) {
      await this.factusolService.connect(startupDbPath);
      this.fileWatcherService.start(startupDbPath, cfg.organizationId || 'org_default', async (reason) => {
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

  public async simulateTestOrder(options?: TestOrderSimulationOptions): Promise<TestOrderSimulationResult> {
    return this.testOrderSimulator.simulateOrder(options || {});
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

  private enhanceErpAdapters(): void {
    // 1. Asegurar que FactusolAdapter y SimplyGestAdapter expongan ruta y accesibilidad válidas en Modo Evaluación
    for (const fileAdapter of [this.factusolAdapter, this.simplygestAdapter]) {
      const origGetPath = fileAdapter.getDatabasePath.bind(fileAdapter);
      const origIsAcc = fileAdapter.isDatabaseAccessible.bind(fileAdapter);
      fileAdapter.getDatabasePath = () => {
        if ((fileAdapter as any).isEvaluationMode?.()) {
          return `DEMO://${fileAdapter.providerId}`;
        }
        return origGetPath();
      };
      fileAdapter.isDatabaseAccessible = () => {
        if ((fileAdapter as any).isEvaluationMode?.()) {
          return true;
        }
        return origIsAcc();
      };
    }

    // 2. Extender SimplyGestAdapter para tablas físicas DBISAM (.dat) y SimplyGest Server REST API (:56985)
    enhanceSimplyGestAdapter(this.simplygestAdapter, this.logger);

    // 3. Extender adaptadores SQL Server base (Ágora, Sage 50, a3ERP) con transacciones T-SQL atómicas
    // (Los 7 nuevos conectores españoles ya incorporan enhanceExtendedSpanishSqlAdapter y clientes REST/RPC propios)
    for (const sqlAdapter of [
      this.agoraAdapter,
      this.sage50Adapter,
      this.a3erpAdapter,
    ]) {
      enhanceSqlErpAdapter(sqlAdapter, this.logger);
    }

    const origGetActiveId = this.erpRegistry.getActiveProviderId.bind(this.erpRegistry);
    this.erpRegistry.getActiveProviderId = () => {
      const c = this.configManager.get();
      if (c.softwareErp?.activeProvider) return c.softwareErp.activeProvider;
      const candidate = String(c.erpType || '').trim() as ExtendedErpProviderId;
      if (candidate && this.erpRegistry.getAllConnectors().some((conn) => conn.providerId === (candidate as SupportedErpProviderId))) {
        return candidate as SupportedErpProviderId;
      }
      return origGetActiveId();
    };
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
