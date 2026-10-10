import fs from 'fs';
import path from 'path';
import { ConfigManager } from '../config';
import { LicenseService, LicenseValidationStatus } from '../license';
import { FactusolService, FactusolPathResolver } from '../factusol';
import { FileWatcherService } from '../sync';
import { HistoryManager } from '../history';
import {
  EventBus,
  SystemInfoService,
  DiagnosticExporter,
  AgentStatusDetails,
  PreflightHealthService,
  PreflightHealthReport,
} from '../diagnostics';
import { UpdateClientState } from '../update';
import { SECRET_MASK } from '../channels/channel-tester.service';

export interface StatusAggregatorOptions {
  configManager: ConfigManager;
  licenseService: LicenseService;
  factusolService: FactusolService;
  fileWatcherService: FileWatcherService;
  historyManager: HistoryManager;
  eventBus: EventBus;
  preflightHealthService: PreflightHealthService;
  getUpdateStatus: () => UpdateClientState;
  getPreflightHealth: (force?: boolean) => Promise<PreflightHealthReport>;
}

export class StatusAggregatorService {
  private readonly configManager: ConfigManager;
  private readonly licenseService: LicenseService;
  private readonly factusolService: FactusolService;
  private readonly fileWatcherService: FileWatcherService;
  private readonly historyManager: HistoryManager;
  private readonly eventBus: EventBus;
  private readonly preflightHealthService: PreflightHealthService;
  private readonly getUpdateStatus: () => UpdateClientState;
  private readonly getPreflightHealth: (force?: boolean) => Promise<PreflightHealthReport>;

  private cachedLicenseVal: { data: LicenseValidationStatus; timestamp: number } | null = null;
  private cachedFactusolHealth: {
    connected: boolean;
    statusMessage: string;
    articleCount?: number;
    timestamp: number;
  } | null = null;

  constructor(options: StatusAggregatorOptions) {
    this.configManager = options.configManager;
    this.licenseService = options.licenseService;
    this.factusolService = options.factusolService;
    this.fileWatcherService = options.fileWatcherService;
    this.historyManager = options.historyManager;
    this.eventBus = options.eventBus;
    this.preflightHealthService = options.preflightHealthService;
    this.getUpdateStatus = options.getUpdateStatus;
    this.getPreflightHealth = options.getPreflightHealth;
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
      preflight: (this.preflightHealthService as any).cachedReport || undefined,
    });
  }

  public async getStatusDetails(): Promise<AgentStatusDetails> {
    const hwid = await this.licenseService.getHWID();
    const now = Date.now();

    let license: LicenseValidationStatus;
    if (this.cachedLicenseVal && now - this.cachedLicenseVal.timestamp < 60_000) {
      license = this.cachedLicenseVal.data;
    } else {
      license = await this.licenseService.validateLicense();
      this.cachedLicenseVal = { data: license, timestamp: now };
    }

    const cfg = this.configManager.get();
    const rawDbPath = cfg.factusol?.databasePath || cfg.factusolDbPath || '';
    const dbPath = FactusolPathResolver.cleanPath(rawDbPath);

    let preflight: PreflightHealthReport | undefined;
    try {
      preflight = await this.getPreflightHealth();
    } catch {
      // Ignorar excepciones para proteger telemetría del dashboard
    }

    let articleCount: number | undefined;
    let fileSizeBytes: number | undefined;
    let connected = false;
    let statusMessage = dbPath ? 'Desconectado / Offline (Ruta de red o disco no accesible)' : 'No configurado';

    let effectivePath = dbPath;
    if (effectivePath && !fs.existsSync(effectivePath)) {
      const uncFallback = FactusolPathResolver.resolveMappedDriveToUnc(effectivePath);
      if (uncFallback && fs.existsSync(uncFallback)) {
        effectivePath = uncFallback;
      }
    }

    if (effectivePath && fs.existsSync(effectivePath)) {
      try {
        const stats = fs.statSync(effectivePath);
        fileSizeBytes = stats.size;

        if (this.cachedFactusolHealth && now - this.cachedFactusolHealth.timestamp < 30_000) {
          connected = this.cachedFactusolHealth.connected;
          statusMessage = this.cachedFactusolHealth.statusMessage;
          articleCount = this.cachedFactusolHealth.articleCount;
        } else {
          const connector = this.factusolService.getConnector();
          if (connector) {
            const health = await connector.healthCheck();
            connected = health.status === 'HEALTHY';
            statusMessage = health.message || '';
            if (connected) {
              articleCount = await this.factusolService.getArticleCount(effectivePath);
            }
          }
          this.cachedFactusolHealth = { connected, statusMessage, articleCount, timestamp: now };
        }
      } catch (err) {
        statusMessage = err instanceof Error ? err.message : String(err);
      }
    }

    const safeWoo = cfg.woocommerce ? {
      ...cfg.woocommerce,
      consumerSecret: cfg.woocommerce.consumerSecret ? SECRET_MASK : '',
    } : cfg.woocommerce;

    const safeUniv = cfg.universalBridge ? {
      ...cfg.universalBridge,
      secretKey: cfg.universalBridge.secretKey ? SECRET_MASK : '',
      dbPass: cfg.universalBridge.dbPass ? SECRET_MASK : '',
    } : cfg.universalBridge;

    const safeNotif = cfg.notifications ? {
      ...cfg.notifications,
      smtpPass: cfg.notifications.smtpPass ? SECRET_MASK : '',
    } : cfg.notifications;

    const safeShopify = cfg.shopify ? { ...cfg.shopify, accessToken: cfg.shopify.accessToken ? SECRET_MASK : '' } : cfg.shopify;
    const safeHolded = cfg.holded ? { ...cfg.holded, apiKey: cfg.holded.apiKey ? SECRET_MASK : '' } : cfg.holded;

    return {
      agentName: cfg.agentName || 'Bentian Agent',
      agentVersion: this.configManager.getVersion(),
      agentId: cfg.agentId || 'Sin registrar (Modo Standalone)',
      apiBaseUrl: cfg.apiBaseUrl || 'https://bridge.cristianjm.com',
      licenseKey: cfg.licenseKey,
      hwid,
      license,
      factusol: {
        configured: Boolean(dbPath),
        databasePath: dbPath || '',
        fileName: dbPath ? path.basename(dbPath) : '',
        connected,
        watcherActive: this.fileWatcherService.isActive(),
        articleCount,
        fileSizeBytes,
        statusMessage,
      },
      factusolSettings: cfg.factusol,
      woocommerceSettings: safeWoo,
      universalBridgeSettings: safeUniv,
      shopifySettings: safeShopify,
      holdedSettings: safeHolded,
      channelType: cfg.channelType || 'woocommerce',
      syncRules: cfg.syncRules,
      notifications: safeNotif,
      syncHistory: this.historyManager.getSyncHistory(),
      system: SystemInfoService.getSystemInfo(),
      recentEvents: this.eventBus.getRecentEvents(),
      update: this.getUpdateStatus(),
      preflight,
    };
  }
}
