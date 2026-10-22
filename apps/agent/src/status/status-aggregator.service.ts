import fs from 'fs';
import path from 'path';
import { ConfigManager } from '../config';
import { LicenseService, LicenseValidationStatus } from '../license';
import { FactusolService, FactusolPathResolver } from '../factusol';
import { SimplyGestService, SimplyGestDetector } from '../simplygest';
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
  simplygestService?: SimplyGestService;
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
  private readonly simplygestService?: SimplyGestService;
  private readonly fileWatcherService: FileWatcherService;
  private readonly historyManager: HistoryManager;
  private readonly eventBus: EventBus;
  private readonly preflightHealthService: PreflightHealthService;
  private readonly getUpdateStatus: () => UpdateClientState;
  private readonly getPreflightHealth: (force?: boolean) => Promise<PreflightHealthReport>;

  private cachedLicenseVal: { data: LicenseValidationStatus; timestamp: number } | null = null;
  private cachedFactusolHealth: {
    path: string;
    connected: boolean;
    statusMessage: string;
    articleCount?: number;
    timestamp: number;
  } | null = null;

  constructor(options: StatusAggregatorOptions) {
    this.configManager = options.configManager;
    this.licenseService = options.licenseService;
    this.factusolService = options.factusolService;
    this.simplygestService = options.simplygestService;
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

    const liveLicState = this.licenseService.getLicenseStatus();
    let license: LicenseValidationStatus;
    if (
      this.cachedLicenseVal &&
      now - this.cachedLicenseVal.timestamp < 60_000 &&
      this.cachedLicenseVal.data.status === liveLicState.status
    ) {
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

        if (
          this.cachedFactusolHealth &&
          this.cachedFactusolHealth.path === effectivePath &&
          now - this.cachedFactusolHealth.timestamp < 15_000
        ) {
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
          this.cachedFactusolHealth = { path: effectivePath, connected, statusMessage, articleCount, timestamp: now };
        }
      } catch (err) {
        statusMessage = err instanceof Error ? err.message : String(err);
      }
    }

    // SimplyGest Status
    const rawSgPath = cfg.simplygest?.databasePath || cfg.simplygestDbPath || '';
    const sgDbPath = SimplyGestDetector.cleanPath(rawSgPath);
    let sgArticleCount: number | undefined;
    let sgFileSizeBytes: number | undefined;
    let sgConnected = false;
    let sgStatusMessage = sgDbPath ? 'Desconectado / Offline (Ruta de red o disco no accesible)' : 'No configurado';

    let effectiveSgPath = sgDbPath;
    if (effectiveSgPath && !fs.existsSync(effectiveSgPath)) {
      const sgRes = SimplyGestDetector.resolve(effectiveSgPath);
      if (sgRes.success && sgRes.resolvedPath) {
        effectiveSgPath = sgRes.resolvedPath;
      }
    }

    if (effectiveSgPath && fs.existsSync(effectiveSgPath)) {
      try {
        const stats = fs.statSync(effectiveSgPath);
        sgFileSizeBytes = stats.size;
        if (this.simplygestService) {
          const connector = this.simplygestService.getConnector();
          if (connector) {
            const health = await connector.healthCheck();
            sgConnected = health.status === 'HEALTHY';
            sgStatusMessage = health.message || '';
            if (sgConnected) {
              sgArticleCount = await this.simplygestService.getArticleCount(effectiveSgPath);
            }
          } else {
            sgConnected = true;
            sgStatusMessage = 'Base de datos Datos.mdb accesible';
          }
        } else {
          sgConnected = true;
          sgStatusMessage = 'Base de datos Datos.mdb accesible';
        }
      } catch (err) {
        sgStatusMessage = err instanceof Error ? err.message : String(err);
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
    const safePrestashop = cfg.prestashop ? { ...cfg.prestashop, apiKey: cfg.prestashop.apiKey ? SECRET_MASK : '' } : cfg.prestashop;
    const safeHolded = cfg.holded ? { ...cfg.holded, apiKey: cfg.holded.apiKey ? SECRET_MASK : '' } : cfg.holded;

    const activeErp = (cfg.softwareErp?.activeProvider || cfg.erpType || 'factusol') as 'factusol' | 'simplygest' | 'agora' | 'sage50' | 'a3erp';
    const activeProviderCfg = (cfg.softwareErp?.providers as any)?.[activeErp] || {};
    const factEval = Boolean(cfg.softwareErp?.providers?.factusol?.evaluationMode || rawDbPath.toUpperCase().startsWith('DEMO'));
    const sgEval = Boolean(cfg.softwareErp?.providers?.simplygest?.evaluationMode || rawSgPath.toUpperCase().startsWith('DEMO'));
    const isEvalActive = Boolean(
      activeProviderCfg.evaluationMode ||
      String(activeProviderCfg.databasePath || '').toUpperCase().startsWith('DEMO') ||
      (activeErp === 'factusol' && factEval) ||
      (activeErp === 'simplygest' && sgEval) ||
      (cfg as any).evaluationMode?.enabled
    );

    if (factEval) {
      connected = true;
      articleCount = 6;
      statusMessage = '🧪 Modo Evaluación Activo (Datos Demo en memoria)';
    }
    if (sgEval) {
      sgConnected = true;
      sgArticleCount = 6;
      sgStatusMessage = '🧪 Modo Evaluación Activo (Datos Demo en memoria)';
    }

    let sqlConnection: { connected: boolean; serverInstance: string; databaseName: string; articleCount?: number; statusMessage?: string } | undefined;
    if (activeErp === 'agora' || activeErp === 'sage50' || activeErp === 'a3erp') {
      const sqlDefaults: Record<string, { inst: string; db: string }> = {
        agora: { inst: '.\\SQLEXPRESS', db: 'AgoraDB' },
        sage50: { inst: '.\\SAGE50', db: 'GESTION' },
        a3erp: { inst: '.\\SQLEXPRESS', db: 'A3ERP' },
      };
      const srv = activeProviderCfg.serverInstance || activeProviderCfg.sqlInstance || sqlDefaults[activeErp]?.inst || '.\\SQLEXPRESS';
      const rawDb = String(activeProviderCfg.databaseName || activeProviderCfg.databasePath || '').trim();
      const dbName = (!isEvalActive && rawDb && !rawDb.startsWith('mssql://') && !rawDb.toUpperCase().startsWith('DEMO'))
        ? rawDb
        : (activeProviderCfg.databaseName || sqlDefaults[activeErp]?.db || 'ERP');
      sqlConnection = {
        connected: Boolean(isEvalActive || activeProviderCfg.serverInstance || activeProviderCfg.sqlInstance || cfg.softwareErp?.provisioned),
        serverInstance: srv,
        databaseName: isEvalActive ? 'DEMO' : dbName,
        articleCount: isEvalActive ? 6 : undefined,
        statusMessage: isEvalActive ? '🧪 Modo Evaluación Activo' : `Conectado a ${srv} (${dbName})`,
      };
    }

    const enrichedSoftwareErp = cfg.softwareErp
      ? { ...cfg.softwareErp, sqlConnection }
      : (sqlConnection ? { activeProvider: activeErp, provisioned: true, sqlConnection } : undefined);

    return {
      agentName: cfg.agentName || 'Bentian Agent',
      agentVersion: this.configManager.getVersion(),
      agentId: cfg.agentId || 'Sin registrar (Modo Standalone)',
      apiBaseUrl: cfg.apiBaseUrl || 'https://bridge.cristianjm.com',
      licenseKey: cfg.licenseKey,
      hwid,
      license,
      erpType: activeErp,
      softwareErp: enrichedSoftwareErp,
      evaluationMode: { enabled: isEvalActive, providerId: activeErp },
      factusol: {
        configured: Boolean(dbPath || factEval),
        databasePath: factEval ? 'DEMO://factusol' : (dbPath || ''),
        fileName: factEval ? 'Catálogo Demo (En memoria)' : (dbPath ? path.basename(dbPath) : ''),
        connected,
        watcherActive: this.fileWatcherService.isActive(),
        articleCount,
        fileSizeBytes,
        statusMessage,
      },
      factusolSettings: cfg.factusol,
      simplygest: {
        configured: Boolean(sgDbPath || sgEval),
        databasePath: sgEval ? 'DEMO://simplygest' : (sgDbPath || ''),
        fileName: sgEval ? 'Catálogo Demo (En memoria)' : (sgDbPath ? path.basename(sgDbPath) : ''),
        connected: sgConnected,
        articleCount: sgArticleCount,
        fileSizeBytes: sgFileSizeBytes,
        statusMessage: sgStatusMessage,
      },
      simplygestSettings: cfg.simplygest,
      woocommerceSettings: safeWoo,
      universalBridgeSettings: safeUniv,
      shopifySettings: safeShopify,
      prestashopSettings: safePrestashop,
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
