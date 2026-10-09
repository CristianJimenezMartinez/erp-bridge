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
  VERSION_REGEX,
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
  AgentNotificationSettings,
  ConfigManager,
} from './config';
import { SyncHistoryRecord, HistoryManager } from './history';
import { EventBus, LogEvent, SystemInfoService, DiagnosticExporter, AgentStatusDetails, PreflightHealthService, PreflightHealthReport, LiveHealthService, LiveHealthReport, AgentDiskLogger } from './diagnostics';
import { AgentLicenseStatus, LicenseValidationStatus, LicenseService } from './license';
import { FactusolMetadata, ArticlePreviewItem, PathResolutionResult, FactusolService, FactusolPathResolver } from './factusol';
import { WooCommerceTestResult, UniversalBridgeTestResult, WooCommerceTester, UniversalBridgeTester } from './channels';
import { SyncManualResult, CatalogUploadResult, FileWatcherService, LocalSyncEngine } from './sync';
import { AutoStartService } from './system';
import { OrderNotifierService } from './notifications/order-notifier.service';
import { OrderPlausibilityAdapter } from './adapters/order-plausibility.adapter';
import {
  SalesLedgerManager,
  GetSalesOrdersOptions,
  PaginatedSalesOrdersResult,
  SalesOrderRecord,
} from './orders';

// Re-exportar tipos para 100% de compatibilidad externa
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

export interface AgentGuiServer {
  stop(): Promise<void>;
  getUrl?(): string;
}

export const SECRET_MASK = '••••••••';
export function isSecretMaskedOrEmpty(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return true;
  const str = String(val).trim();
  return str === SECRET_MASK || /^[•*]{4,}$/.test(str);
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

  private isRunning = false;
  private isUpdating = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private guiServer: AgentGuiServer | null = null;
  private cachedLicenseVal: { data: LicenseValidationStatus; timestamp: number } | null = null;
  private cachedFactusolHealth: { connected: boolean; statusMessage: string; articleCount?: number; timestamp: number } | null = null;

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
    notifications?: AgentNotificationSettings;
  }): Promise<{ success: boolean; message: string }> {
    const cfg = this.configManager.get();
    if (updates.factusol) {
      cfg.factusol = { ...(cfg.factusol || {}), ...updates.factusol };
      if (updates.factusol.databasePath !== undefined) {
        const cleaned = FactusolPathResolver.cleanPath(updates.factusol.databasePath);
        const resolved = FactusolPathResolver.resolve(cleaned);
        const finalPath = (resolved.success && resolved.resolvedPath) ? resolved.resolvedPath : cleaned;
        cfg.factusolDbPath = finalPath;
        cfg.factusol.databasePath = finalPath;
        updates.factusol.databasePath = finalPath;
      }
    }
    if (updates.woocommerce) {
      const existingSecret = cfg.woocommerce?.consumerSecret;
      cfg.woocommerce = { ...(cfg.woocommerce || {}), ...updates.woocommerce };
      if (isSecretMaskedOrEmpty(updates.woocommerce.consumerSecret) && existingSecret) {
        cfg.woocommerce.consumerSecret = existingSecret;
      }
    }
    if (updates.universalBridge) {
      const existingSecretKey = cfg.universalBridge?.secretKey;
      const existingDbPass = cfg.universalBridge?.dbPass;
      cfg.universalBridge = { ...(cfg.universalBridge || {}), ...updates.universalBridge };
      if (isSecretMaskedOrEmpty(updates.universalBridge.secretKey) && existingSecretKey) {
        cfg.universalBridge.secretKey = existingSecretKey;
      }
      if (isSecretMaskedOrEmpty(updates.universalBridge.dbPass) && existingDbPass) {
        cfg.universalBridge.dbPass = existingDbPass;
      }
    }
    if (updates.channelType) {
      cfg.channelType = updates.channelType;
    }
    if (updates.syncRules) {
      cfg.syncRules = { ...(cfg.syncRules || {}), ...updates.syncRules };
    }
    if (updates.notifications) {
      const existingSmtpPass = cfg.notifications?.smtpPass;
      cfg.notifications = { ...(cfg.notifications || {}), ...updates.notifications };
      if (isSecretMaskedOrEmpty(updates.notifications.smtpPass) && existingSmtpPass) {
        cfg.notifications.smtpPass = existingSmtpPass;
      }
    }

    let licenseMsg = '';
    if (updates.licenseKey && updates.licenseKey !== cfg.licenseKey && !isSecretMaskedOrEmpty(updates.licenseKey)) {
      const licRes = await this.licenseService.activateLicense(updates.licenseKey);
      if (!licRes.success) {
        licenseMsg = ` (Aviso en licencia: ${licRes.error})`;
      } else {
        cfg.licenseKey = updates.licenseKey;
        licenseMsg = ' (Licencia activada con éxito)';
      }
    }

    const saveRes = this.configManager.saveConfigToDisk();
    if (!saveRes.success) {
      this.addEvent('error', `✕ Fallo al guardar en disco: ${saveRes.error}`);
      return {
        success: false,
        message: `Error al persistir la configuración en disco: ${saveRes.error}. Comprueba los permisos de acceso.`
      };
    }

    this.syncEngine.startAutoSyncLoop(() => this.isRunning);

    if (cfg.factusolDbPath) {
      let activePath = cfg.factusolDbPath;
      if (!fs.existsSync(activePath)) {
        const unc = FactusolPathResolver.resolveMappedDriveToUnc(activePath);
        if (unc && fs.existsSync(unc)) activePath = unc;
      }
      if (fs.existsSync(activePath)) {
        await this.factusolService.reconnect(activePath).catch(() => null);
      } else {
        this.logger.warn(`Ruta de Factusol guardada pero no accesible inmediatamente (Desconectado/Offline): ${cfg.factusolDbPath}`);
      }
    }

    this.addEvent('success', `✓ Configuración guardada en disco (${path.basename(saveRes.filePath)})${licenseMsg}`);
    return { success: true, message: `Configuración guardada correctamente en disco${licenseMsg}` };
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

  // --- Métodos de Libro de Ventas (Sales Ledger) ---
  public getSalesOrders(options?: GetSalesOrdersOptions): PaginatedSalesOrdersResult {
    return this.salesLedgerManager.getOrders(options);
  }

  public getSalesOrderById(id: string): SalesOrderRecord | null {
    return this.salesLedgerManager.getOrderById(id);
  }

  public async retrySalesOrder(id: string): Promise<{ success: boolean; message: string; order?: SalesOrderRecord }> {
    const order = this.salesLedgerManager.getOrderById(id);
    if (!order) {
      return { success: false, message: 'Pedido no encontrado en el registro local.' };
    }
    if (order.status === 'synced') {
      return {
        success: false,
        message: `El pedido #${order.orderNumber} ya se encuentra sincronizado en Factusol (Nº ${order.factusolOrderNumber || '-'}).`,
      };
    }

    const config = this.configManager.get();
    const series = order.factusolSeries || config.factusol?.orderSeries || '1';
    const warehouse = config.factusol?.warehouseCode || 'GEN';

    const canonicalOrder = {
      id: order.webOrderId,
      orderNumber: order.orderNumber,
      reference: order.orderNumber,
      orderDate: order.date || new Date().toISOString(),
      status: 'processing',
      customer: {
        id: order.webOrderId,
        name: order.customerName,
        email: order.customerEmail || 'cliente@tienda.com',
        phone: order.customerPhone || '',
      },
      shippingAddress: {
        firstName: order.customerName.split(' ')[0] || 'Cliente',
        lastName: order.customerName.split(' ').slice(1).join(' ') || '',
        street: order.shippingAddress || '',
        city: '',
        postalCode: '',
        country: 'ES',
        phone: order.customerPhone || '',
        email: order.customerEmail || '',
      },
      billingAddress: {
        firstName: order.customerName.split(' ')[0] || 'Cliente',
        lastName: order.customerName.split(' ').slice(1).join(' ') || '',
        street: order.shippingAddress || '',
        city: '',
        postalCode: '',
        country: 'ES',
        phone: order.customerPhone || '',
        email: order.customerEmail || '',
      },
      lines: (order.lines || []).map((l, idx) => ({
        id: `line-${idx + 1}`,
        sku: l.sku,
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.total,
        taxRate: 21,
        taxAmount: Math.round(l.total * 0.21 * 100) / 100,
      })),
      totals: {
        subtotal: Math.round((order.totalAmount / 1.21) * 100) / 100,
        tax: Math.round((order.totalAmount - order.totalAmount / 1.21) * 100) / 100,
        total: order.totalAmount,
        discount: 0,
        shipping: 0,
      },
      paymentMethod: order.paymentMethod || 'Web',
      currency: order.currency || 'EUR',
      series,
      warehouse,
    };

    let connector = this.factusolService.getConnector();
    if (!connector) {
      const connected = await this.factusolService.connect();
      if (!connected) {
        const err = 'No se pudo conectar con la base de datos de Factusol.';
        this.salesLedgerManager.markOrderRetried(id, 'failed', err);
        return { success: false, message: err };
      }
      connector = this.factusolService.getConnector();
    }
    if (!connector) {
      const err = 'Driver OLEDB de Factusol no inicializado.';
      this.salesLedgerManager.markOrderRetried(id, 'failed', err);
      return { success: false, message: err };
    }

    const plausibility = OrderPlausibilityAdapter.validateAndSanitize(canonicalOrder);
    if (!plausibility.valid || !plausibility.sanitizedOrder) {
      const err = `Pedido descartado por validación de seguridad: ${plausibility.error}`;
      this.salesLedgerManager.markOrderRetried(id, 'failed', err);
      return { success: false, message: err };
    }
    const safeOrder = plausibility.sanitizedOrder;

    try {
      const res = await connector.createOrder(safeOrder as any);
      if (res.success) {
        const assignedNum = String(res.externalId || res.orderNumber || order.webOrderId);
        const updated = this.salesLedgerManager.markOrderRetried(id, 'synced', undefined, assignedNum, series);
        this.addEvent('success', `✓ Reintento exitoso: Pedido #${order.orderNumber} registrado en Factusol (Nº ${assignedNum}).`);
        AgentDiskLogger.getInstance().log({
          level: 'SUCCESS',
          component: 'SalesLedger',
          action: 'retry_sales_order',
          status: 'SUCCESS',
          message: `Reintento exitoso: Pedido #${order.orderNumber} -> Factusol Nº ${assignedNum}`,
          metadata: { orderId: id, factusolOrderNumber: assignedNum, series },
        });
        return {
          success: true,
          message: `Pedido #${order.orderNumber} insertado correctamente en Factusol (Serie ${series}, Pedido #${assignedNum}).`,
          order: updated || undefined,
        };
      } else {
        const errMsg = res.error || 'Error desconocido al registrar pedido en Factusol';
        this.salesLedgerManager.markOrderRetried(id, 'failed', errMsg);
        this.addEvent('warn', `Aviso en reintento de pedido #${order.orderNumber}: ${errMsg}`);
        return { success: false, message: `No se pudo registrar en Factusol: ${errMsg}` };
      }
    } catch (retryErr) {
      const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      this.salesLedgerManager.markOrderRetried(id, 'failed', msg);
      return { success: false, message: `Error durante el reintento: ${msg}` };
    }
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
      preflight: (this.preflightHealthService as any).cachedReport || undefined,
    });
  }

  public async reportIncident(payload: {
    contact: string;
    category: string;
    description: string;
    includeDiagnostics?: boolean;
    timestamp?: string;
  }): Promise<{ success: boolean; ticketId: string; message: string; cloudReceived: boolean }> {
    const ticketId = `#INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const cfg = this.configManager.get();
    const hwid = await this.getHWID();
    const licStatus = this.licenseService.getLicenseStatus();
    const diagnosticsText = payload.includeDiagnostics !== false ? this.exportDiagnostic() : null;

    const incidentRecord = {
      ticketId,
      createdAt: new Date().toISOString(),
      contact: payload.contact,
      category: payload.category || 'other',
      description: payload.description,
      agentId: cfg.agentId || 'ag_local',
      organizationId: cfg.organizationId || 'org_default',
      appVersion: this.getVersion(),
      hwid,
      licenseKey: cfg.licenseKey ? `${cfg.licenseKey.substring(0, 8)}...` : 'Sin clave',
      plan: licStatus.plan,
      diagnostics: diagnosticsText
    };

    // 1. Persistencia local en %APPDATA%\\Bentian Agent\\incidents\\ (Regla 1 AppData)
    try {
      const appDataDir = path.dirname(this.configManager.getConfigFilePath());
      const incidentsDir = path.join(appDataDir, 'incidents');
      if (!fs.existsSync(incidentsDir)) {
        fs.mkdirSync(incidentsDir, { recursive: true });
      }
      const tempFile = path.join(incidentsDir, `incident-${ticketId.replace('#', '')}.tmp`);
      const finalFile = path.join(incidentsDir, `incident-${ticketId.replace('#', '')}.json`);
      fs.writeFileSync(tempFile, JSON.stringify(incidentRecord, null, 2), 'utf8');
      fs.renameSync(tempFile, finalFile);
    } catch (err) {
      this.logger.warn('Aviso: no se pudo guardar copia local de la incidencia:', { err: String(err) });
    }

    // 2. Intentar despacho al servidor central si hay conectividad
    let cloudReceived = false;
    let serverMessage = 'Incidencia registrada y asignada al equipo de soporte técnico.';
    const apiBaseUrl = cfg.apiBaseUrl || 'https://bridge.cristianjm.com';

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/agents/fleet/report-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          contact: payload.contact,
          category: payload.category,
          description: payload.description,
          diagnostics: diagnosticsText,
          agentId: cfg.agentId || 'ag_local',
          organizationId: cfg.organizationId || 'org_default',
          appVersion: this.getVersion(),
          hwid
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        cloudReceived = true;
        const data: any = await res.json().catch(() => ({}));
        if (data.message) serverMessage = data.message;
      }
    } catch (netErr) {
      this.logger.warn('No se pudo enviar la incidencia a la API central en este momento:', { err: String(netErr) });
    }

    this.logger.info(`Incidencia técnica registrada: ${ticketId} [${payload.category}]`);
    this.eventBus.emit('event', {
      level: 'INFO',
      component: 'Support',
      action: 'incident_reported',
      message: `Incidencia técnica registrada: ${ticketId} (${payload.category})`
    });

    return {
      success: true,
      ticketId,
      cloudReceived,
      message: cloudReceived
        ? serverMessage
        : `La incidencia se ha registrado en el equipo con el ticket ${ticketId}. Guardada copia técnica local.`
    };
  }

  public async getPreflightHealth(force = false): Promise<PreflightHealthReport> {
    const cfg = this.configManager.get();
    const dbPath = cfg.factusol?.databasePath || cfg.factusolDbPath;
    (this.preflightHealthService as any).options.apiBaseUrl = cfg.apiBaseUrl || 'https://bridge.cristianjm.com';
    (this.preflightHealthService as any).options.factusolDbPath = dbPath;
    return this.preflightHealthService.runDiagnostics(force);
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

  public async testEmailNotification(customSettings?: AgentNotificationSettings): Promise<{ success: boolean; message: string }> {
    const cfg = this.configManager.get();
    let settings = customSettings || cfg.notifications || {};
    if (customSettings && isSecretMaskedOrEmpty(customSettings.smtpPass) && cfg.notifications?.smtpPass) {
      settings = { ...settings, smtpPass: cfg.notifications.smtpPass };
    }
    return OrderNotifierService.sendTestEmail(settings, cfg.apiBaseUrl, cfg.licenseKey);
  }

  public async getLiveHealth(): Promise<LiveHealthReport> {
    return LiveHealthService.runDiagnostics(
      this.configManager.get(),
      this.licenseService.getLicenseStatus()
    );
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
    const cfg = this.configManager.get();
    let finalSecret = settings.consumerSecret;
    if (isSecretMaskedOrEmpty(finalSecret) && cfg.woocommerce?.consumerSecret) {
      finalSecret = cfg.woocommerce.consumerSecret;
    }
    return WooCommerceTester.test({ ...settings, consumerSecret: finalSecret });
  }

  public async testUniversalBridge(settings: { storeUrl: string; secretKey?: string }): Promise<UniversalBridgeTestResult> {
    const cfg = this.configManager.get();
    let finalKey = settings.secretKey;
    if (isSecretMaskedOrEmpty(finalKey) && cfg.universalBridge?.secretKey) {
      finalKey = cfg.universalBridge.secretKey;
    }
    return UniversalBridgeTester.test({ ...settings, secretKey: finalKey });
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
        AgentDiskLogger.getInstance().log({
          level: 'INFO',
          component: 'FileWatcher',
          action: 'file_change_detected',
          duration_ms: 0,
          status: 'SUCCESS',
          message: `Cambio en Factusol detectado por vigilante en tiempo real (${reason}). Sincronizando stock...`,
          metadata: { reason, databasePath: cfg.factusolDbPath },
        });

        const lic = this.licenseService.getLicenseStatus();
        if (lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
          return;
        }

        if (!this.syncEngine.isBusy()) {
          void this.syncEngine.triggerManualSync(false);
        }
        if (cfg.agentId && cfg.apiBaseUrl) {
          const tNotify = performance.now();
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
          })
            .then((res) => {
              const dur = Math.round(performance.now() - tNotify);
              AgentDiskLogger.getInstance().log({
                level: res.ok ? 'DEBUG' : 'WARN',
                component: 'FileWatcher',
                action: 'notify_reactive_sync',
                duration_ms: dur,
                status: res.ok ? 'SUCCESS' : 'FAILURE',
                message: `Notificación de sincronización reactiva a la API (${dur}ms, HTTP ${res.status})`,
              });
            })
            .catch((err) => {
              this.logger.warn(`No se pudo notificar sync reactivo a la API: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
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

    this.startHeartbeat();
    this.licenseService.startValidationLoop();
    this.updateClient.startPeriodicCheck();
  }

  private startHeartbeat(): void {
    const sendBeat = async () => {
      if (!this.isRunning) return;
      const cfg = this.configManager.get();
      const hwid = await this.licenseService.getHWID().catch(() => 'unknown_hwid');
      const effectiveAgentId = cfg.agentId || `ag_${hwid.substring(0, 16)}`;

      try {
        let factusolHealth: any;
        const connector = this.factusolService.getConnector();
        if (connector) {
          const check = await connector.healthCheck();
          const count = await this.factusolService.getArticleCount(cfg.factusolDbPath).catch(() => undefined);
          factusolHealth = {
            status: check.status,
            latencyMs: check.latencyMs,
            databasePath: cfg.factusolDbPath,
            message: check.message,
            articleCount: count,
          };
        }

        const heartbeat: AgentHeartbeatPayload & Record<string, any> = {
          agentId: effectiveAgentId,
          hwid,
          version: this.configManager.getVersion(),
          status: 'ONLINE',
          systemInfo: SystemInfoService.getSystemInfo(),
          factusolHealth,
          fileWatcherActive: this.fileWatcherService.isActive(),
          channelInfo: {
            channelType: cfg.channelType || (cfg.universalBridge?.storeUrl ? 'universal_bridge' : 'woocommerce'),
            storeUrl: cfg.universalBridge?.storeUrl || cfg.woocommerce?.storeUrl || '',
          },
        };

        if (cfg.apiBaseUrl) {
          const tBeatNetStart = performance.now();
          const res = await fetch(`${cfg.apiBaseUrl}/api/v1/agents/${effectiveAgentId}/heartbeat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(cfg.authToken ? { Authorization: `Bearer ${cfg.authToken}` } : {}),
            },
            body: JSON.stringify(heartbeat),
          }).catch(() => null);
          const beatLatencyMs = Math.round(performance.now() - tBeatNetStart);

          AgentDiskLogger.getInstance().log({
            level: res && res.ok ? 'INFO' : 'WARN',
            component: 'Heartbeat',
            action: 'send_heartbeat',
            duration_ms: beatLatencyMs,
            status: res && res.ok ? 'SUCCESS' : 'FAILURE',
            message: res && res.ok
              ? `Latido Heartbeat enviado a ${cfg.apiBaseUrl} en ${beatLatencyMs}ms (HTTP ${res.status})`
              : `Aviso en latido Heartbeat al Core tras ${beatLatencyMs}ms (${res ? `HTTP ${res.status}` : 'Sin respuesta de red'})`,
            metadata: {
              agentId: effectiveAgentId,
              apiBaseUrl: cfg.apiBaseUrl,
              factusolStatus: factusolHealth?.status,
              factusolLatencyMs: factusolHealth?.latencyMs,
              articleCount: factusolHealth?.articleCount,
              fileWatcherActive: this.fileWatcherService.isActive(),
            },
          });

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
    const tUpdateStart = performance.now();

    if (!info.version || !VERSION_REGEX.test(info.version)) {
      this.logger.error(`Versión de actualización sospechosa o no válida: "${info.version}". Rechazando actualización.`);
      this.isUpdating = false;
      return;
    }

    if (!this.autoUpdater.isNewer(info.version, this.configManager.getVersion())) {
      this.logger.warn(`Versión de actualización v${info.version} no es superior a la versión actual v${this.configManager.getVersion()}. Rechazando posible intento de downgrade.`);
      this.isUpdating = false;
      return;
    }

    let downloadedFile: string | null = null;
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
      const tDownloadStart = performance.now();
      downloadedFile = await this.autoUpdater.downloadUpdate(downloadUrl, info.version);
      const downloadMs = Math.round(performance.now() - tDownloadStart);

      const tVerifyStart = performance.now();
      const isValid = this.autoUpdater.verifyUpdate(downloadedFile, sha256, signature);
      const verifyMs = Math.round(performance.now() - tVerifyStart);

      if (!isValid) {
        if (downloadedFile && fs.existsSync(downloadedFile)) {
          try { fs.unlinkSync(downloadedFile); } catch {}
        }
        this.logger.error(`Firma o integridad inválida para v${info.version}. Actualización rechazada de forma segura.`);
        await this.autoUpdater.reportStatus(info.version, 'failed', 'Fallo de verificación criptográfica Ed25519');
        AgentDiskLogger.getInstance().log({
          level: 'ERROR',
          component: 'AutoUpdater',
          action: 'apply_update',
          duration_ms: Math.round(performance.now() - tUpdateStart),
          status: 'FAILURE',
          message: `Firma criptográfica inválida para v${info.version}`,
        });
        this.isUpdating = false;
        return;
      }

      this.logger.info(`✓ Verificación criptográfica exitosa. Aplicando reemplazo atómico en Windows...`);
      AgentDiskLogger.getInstance().log({
        level: 'SUCCESS',
        component: 'AutoUpdater',
        action: 'apply_update',
        duration_ms: Math.round(performance.now() - tUpdateStart),
        status: 'SUCCESS',
        message: `Actualización a v${info.version} descargada (${downloadMs}ms) y verificada (${verifyMs}ms). Iniciando reemplazo.`,
        metadata: { version: info.version, downloadMs, verifyMs },
      });
      await this.autoUpdater.applyUpdate(downloadedFile, undefined, true, sha256);
    } catch (err) {
      if (downloadedFile && fs.existsSync(downloadedFile)) {
        try { fs.unlinkSync(downloadedFile); } catch {}
      }
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
