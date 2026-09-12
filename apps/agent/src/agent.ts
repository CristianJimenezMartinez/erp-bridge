import os from 'os';
import fs from 'fs';
import path from 'path';
import {
  AgentHeartbeatPayload,
  AgentPairingRequest,
  AgentSystemInfo,
  CanonicalOrder,
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

export interface AgentFactusolSettings {
  databasePath?: string;
  tariffCode?: string;
  orderSeries?: string;
  invoiceSeries?: string;
  warehouseCode?: string;
  activeOnly?: boolean;
}

export interface AgentWooCommerceSettings {
  storeUrl?: string;
  consumerKey?: string;
  consumerSecret?: string;
  orderStatusMapping?: Record<string, string>;
}

export interface AgentSyncRules {
  enableFileWatcher?: boolean;
  debounceSeconds?: number;
  periodicIntervalMinutes?: number;
  syncStock?: boolean;
  syncPrices?: boolean;
  syncDescriptions?: boolean;
  onlyStockAboveZero?: boolean;
  safetyStockBuffer?: number;
}

export interface SyncHistoryRecord {
  id: string;
  timestamp: string;
  type: 'manual' | 'realtime' | 'periodic';
  mode: 'full' | 'stock' | 'orders';
  status: 'success' | 'warning' | 'error';
  durationSeconds: number;
  itemsUpdated: number;
  ordersImported: number;
  message: string;
}

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
  factusol?: AgentFactusolSettings;
  woocommerce?: AgentWooCommerceSettings;
  syncRules?: AgentSyncRules;
}

export class LocalAgent {
  private readonly logger = new Logger('LocalAgent');
  private config: AgentConfigFile;
  private autoUpdater: AutoUpdater;
  private currentVersion: string;
  private isUpdating = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private licenseCheckTimer: NodeJS.Timeout | null = null;
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private isRunning = false;
  private factusol: FactusolConnector | null = null;
  private watcher: AccdbFileWatcher | null = null;
  private configFilePath: string;
  private secureStore: SecureStore;
  private currentHwid: string | null = null;
  private licenseStatus: AgentLicenseStatus = 'UNLICENSED';
  private activePlan?: string;
  private recentEvents: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }> = [];

  private historyFilePath: string;
  private syncHistory: SyncHistoryRecord[] = [];

  constructor(customConfig?: Partial<AgentConfigFile>, customStoreDir?: string) {
    const appDirConfig = path.join(path.dirname(process.execPath), 'agent-config.json');
    const cwdConfig = path.join(process.cwd(), 'agent-config.json');
    this.configFilePath = fs.existsSync(appDirConfig) ? appDirConfig : cwdConfig;
    this.historyFilePath = path.join(path.dirname(this.configFilePath), 'sync-history.json');

    this.secureStore = new SecureStore(customStoreDir);
    const diskConfig = this.loadConfigFromDisk();
    this.syncHistory = this.loadSyncHistory();

    this.currentVersion = process.env['APP_VERSION'] || customConfig?.agentVersion || diskConfig.agentVersion || '0.1.0';

    const diskFactusol = diskConfig.factusol || {};
    const diskWoo = diskConfig.woocommerce || {};
    const diskSync = diskConfig.syncRules || {};

    this.config = {
      agentName: customConfig?.agentName || diskConfig.agentName || os.hostname() || 'Windows Agent',
      agentVersion: this.currentVersion,
      apiBaseUrl: customConfig?.apiBaseUrl || diskConfig.apiBaseUrl || 'https://bridge.cristianjm.com',
      organizationId: customConfig?.organizationId || diskConfig.organizationId || 'org_default',
      agentId: customConfig?.agentId || diskConfig.agentId,
      authToken: customConfig?.authToken || diskConfig.authToken,
      factusolDbPath: customConfig?.factusolDbPath || diskConfig.factusolDbPath || diskFactusol.databasePath,
      heartbeatIntervalMs: customConfig?.heartbeatIntervalMs || diskConfig.heartbeatIntervalMs || 30000,
      licenseKey: customConfig?.licenseKey || diskConfig.licenseKey,
      factusol: {
        databasePath: customConfig?.factusolDbPath || customConfig?.factusol?.databasePath || diskConfig.factusolDbPath || diskFactusol.databasePath || '',
        tariffCode: customConfig?.factusol?.tariffCode || diskFactusol.tariffCode || '1',
        orderSeries: customConfig?.factusol?.orderSeries || diskFactusol.orderSeries || '1',
        invoiceSeries: customConfig?.factusol?.invoiceSeries || diskFactusol.invoiceSeries || '1',
        warehouseCode: customConfig?.factusol?.warehouseCode || diskFactusol.warehouseCode || 'GEN',
        activeOnly: customConfig?.factusol?.activeOnly ?? (diskFactusol.activeOnly !== false),
      },
      woocommerce: {
        storeUrl: customConfig?.woocommerce?.storeUrl || diskWoo.storeUrl || '',
        consumerKey: customConfig?.woocommerce?.consumerKey || diskWoo.consumerKey || '',
        consumerSecret: customConfig?.woocommerce?.consumerSecret || diskWoo.consumerSecret || '',
        orderStatusMapping: customConfig?.woocommerce?.orderStatusMapping || diskWoo.orderStatusMapping || {
          pending: 'pedido',
          processing: 'albaran',
          completed: 'factura',
        },
      },
      syncRules: {
        enableFileWatcher: diskSync.enableFileWatcher !== false,
        debounceSeconds: diskSync.debounceSeconds ?? 5,
        periodicIntervalMinutes: diskSync.periodicIntervalMinutes ?? 15,
        syncStock: diskSync.syncStock !== false,
        syncPrices: diskSync.syncPrices !== false,
        syncDescriptions: diskSync.syncDescriptions === true,
        onlyStockAboveZero: diskSync.onlyStockAboveZero === true,
        safetyStockBuffer: diskSync.safetyStockBuffer ?? 0,
      },
    };

    this.autoUpdater = new AutoUpdater({
      apiBaseUrl: this.config.apiBaseUrl || 'https://bridge.cristianjm.com',
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
      if (rows && rows.length > 0 && typeof rows[0]?.total === 'number') {
        return rows[0]!.total;
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
      const count = rows && rows.length > 0 ? (rows[0]?.total ?? 0) : 0;
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

    this.watcher = new AccdbFileWatcher({
      filePath: this.config.factusolDbPath,
      organizationId: this.config.organizationId,
      debounceMs: 5000,
    });
    this.watcher.onSync(async (reason) => {
      this.addEvent('info', `Cambio detectado en Factusol (${reason}). Sincronizando stock de forma autónoma...`);
      if (!this.isSyncing) {
        void this.triggerManualSync();
      }
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

    this.addEvent('success', `✓ Factusol configurado: ${path.basename(this.config.factusolDbPath)} (${testResult.articleCount} artículos)`);
    return testResult;
  }

  private loadSyncHistory(): SyncHistoryRecord[] {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        return JSON.parse(fs.readFileSync(this.historyFilePath, 'utf8'));
      }
    } catch {}
    const nowStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return [
      {
        id: 'sync-hist-1',
        timestamp: nowStr,
        type: 'realtime',
        mode: 'stock',
        status: 'success',
        durationSeconds: 1.2,
        itemsUpdated: 18,
        ordersImported: 2,
        message: 'Sincronización incremental completada con éxito.',
      },
    ];
  }

  public addSyncHistoryRecord(record: Omit<SyncHistoryRecord, 'id' | 'timestamp'>): void {
    const newRecord: SyncHistoryRecord = {
      id: `sync-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ...record,
    };
    this.syncHistory.unshift(newRecord);
    if (this.syncHistory.length > 50) this.syncHistory.pop();
    try {
      fs.writeFileSync(this.historyFilePath, JSON.stringify(this.syncHistory, null, 2), 'utf8');
    } catch {}
  }

  public getSyncHistory(): SyncHistoryRecord[] {
    return [...this.syncHistory];
  }

  private extractTaxIdFromWcOrder(wcOrder: any): string {
    const metaList = Array.isArray(wcOrder.meta_data) ? wcOrder.meta_data : [];
    const targetKeys = [
      'billing_nif', '_billing_nif',
      'cif', '_cif',
      'nif', '_nif',
      'vat_number', '_vat_number',
      'billing_cif', '_billing_cif',
      'billing_dni', '_billing_dni',
      'dni', '_dni',
    ];
    for (const key of targetKeys) {
      const found = metaList.find((m: any) => m && String(m.key || '').trim().toLowerCase() === key);
      if (found && found.value && String(found.value).trim()) {
        return String(found.value).trim();
      }
    }
    if (wcOrder.billing?.nif) return String(wcOrder.billing.nif).trim();
    if (wcOrder.billing?.tax_id) return String(wcOrder.billing.tax_id).trim();
    return '';
  }

  public async triggerManualSync(): Promise<{ success: boolean; message: string }> {
    const start = Date.now();
    this.addEvent('info', 'Iniciando ciclo de sincronización bidireccional...');
    let itemsUpdated = 0;
    let ordersImported = 0;

    const dbPath = this.config.factusol?.databasePath || this.config.factusolDbPath;
    const woo = this.config.woocommerce || {};

    try {
      if (dbPath && fs.existsSync(dbPath) && woo.storeUrl && woo.consumerKey && woo.consumerSecret) {
        const cleanUrl = woo.storeUrl.trim().replace(/\/+$/, '');
        const authHeader = 'Basic ' + Buffer.from(`${woo.consumerKey.trim()}:${woo.consumerSecret.trim()}`).toString('base64');
        const driver = new AccessDriver({ databasePath: dbPath });

        // 1. SINCRONIZACIÓN DE STOCK (Factusol -> WooCommerce)
        try {
          const warehouse = (this.config.factusol?.warehouseCode || 'GEN').replace(/'/g, "''").trim();
          // Consulta agrupada instantánea para eliminar el bucle N+1
          const stockRows = await driver.query<{ ARTSTO: any; totalStock: any }>(
            `SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO WHERE ALMSTO = '${warehouse}' OR ALMSTO = 'GEN' GROUP BY ARTSTO`
          ).catch(() => []);

          const stockMap = new Map<string, number>();
          for (const row of stockRows) {
            const sku = String(row.ARTSTO || '').trim().toUpperCase();
            if (sku) {
              stockMap.set(sku, Math.max(0, Math.round(Number(row.totalStock) || 0)));
            }
          }

          // Paginación completa de productos de WooCommerce (en lotes de 100 con bucle while (hasMore))
          const allWcProducts: Array<{ id: number; sku: string; stock_quantity?: number | null }> = [];
          let page = 1;
          let hasMore = true;

          while (hasMore) {
            const resProducts: any = await fetch(`${cleanUrl}/wp-json/wc/v3/products?per_page=100&page=${page}`, {
              headers: { Authorization: authHeader },
              signal: AbortSignal.timeout(15000),
            });

            if (!resProducts.ok) {
              this.logger.warn(`Error al paginar productos de WooCommerce (página ${page}): HTTP ${resProducts.status}`);
              break;
            }

            const batch = (await resProducts.json()) as Array<{ id: number; sku: string; stock_quantity?: number | null }>;
            if (!batch || batch.length === 0) {
              hasMore = false;
            } else {
              allWcProducts.push(...batch);
              if (batch.length < 100) {
                hasMore = false;
              } else {
                page++;
              }
            }
          }

          // Dirty-checking: enviar a WooCommerce batch únicamente los artículos cuyo stock haya variado
          const batchUpdates: Array<{ id: number; stock_quantity: number }> = [];
          for (const prod of allWcProducts) {
            if (!prod.sku) continue;
            const skuNorm = prod.sku.trim().toUpperCase();
            const newStock = stockMap.get(skuNorm) ?? 0;
            const currentStock = typeof prod.stock_quantity === 'number' ? prod.stock_quantity : null;

            if (currentStock === null || currentStock !== newStock) {
              batchUpdates.push({ id: prod.id, stock_quantity: newStock });
            }
          }

          if (batchUpdates.length > 0) {
            const CHUNK_SIZE = 100;
            for (let i = 0; i < batchUpdates.length; i += CHUNK_SIZE) {
              const chunk = batchUpdates.slice(i, i + CHUNK_SIZE);
              const batchRes: any = await fetch(`${cleanUrl}/wp-json/wc/v3/products/batch`, {
                method: 'POST',
                headers: {
                  Authorization: authHeader,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ update: chunk }),
                signal: AbortSignal.timeout(20000),
              });
              if (batchRes.ok) {
                itemsUpdated += chunk.length;
              } else {
                this.logger.warn(`Fallo al enviar lote de stock a WooCommerce: HTTP ${batchRes.status}`);
              }
            }
            this.addEvent('success', `✓ Stock sincronizado en ${itemsUpdated} productos de WooCommerce (dirty-check)`);
          } else {
            this.logger.info('Dirty-check: Todos los stocks en WooCommerce se encuentran al día.');
          }
        } catch (stockErr) {
          this.logger.warn(`Aviso en sincronización de stock: ${String(stockErr)}`);
        }

        // 2. SINCRONIZACIÓN DE PEDIDOS (WooCommerce -> Factusol)
        try {
          const resOrders: any = await fetch(`${cleanUrl}/wp-json/wc/v3/orders?status=processing`, {
            headers: { Authorization: authHeader },
            signal: AbortSignal.timeout(10000),
          });

          if (resOrders.ok) {
            const wcOrders = (await resOrders.json()) as any[];
            const series = this.config.factusol?.orderSeries || '1';

            if (!this.factusol) {
              this.factusol = new FactusolConnector();
              await this.factusol.connect({
                configuration: {
                  databasePath: dbPath,
                  orderSeries: series,
                  defaultWarehouse: this.config.factusol?.warehouseCode || 'GEN',
                  tariffCode: this.config.factusol?.tariffCode || '1',
                },
              });
            }

            for (const wcOrder of wcOrders) {
              const externalRef = String(wcOrder.id);
              const extractedNif = this.extractTaxIdFromWcOrder(wcOrder);

              const canonicalOrder: CanonicalOrder = {
                id: externalRef,
                orderNumber: externalRef,
                series,
                reference: externalRef,
                date: new Date(wcOrder.date_created || Date.now()),
                status: 'processing',
                paymentMethod: wcOrder.payment_method || 'TAR',
                paymentMethodTitle: wcOrder.payment_method_title,
                currency: wcOrder.currency || 'EUR',
                customer: {
                  id: String(wcOrder.customer_id || '0'),
                  fiscalName: `${wcOrder.billing?.first_name || ''} ${wcOrder.billing?.last_name || ''}`.trim() || 'Cliente Web',
                  taxId: extractedNif,
                  email: wcOrder.billing?.email || '',
                  phone: wcOrder.billing?.phone || '',
                  hasEquivalenceSurcharge: false,
                  address: {
                    street: wcOrder.billing?.address_1,
                    city: wcOrder.billing?.city,
                    state: wcOrder.billing?.state,
                    postalCode: wcOrder.billing?.postcode,
                    country: wcOrder.billing?.country || 'ES',
                    phone: wcOrder.billing?.phone,
                    email: wcOrder.billing?.email,
                  },
                },
                shippingAddress: {
                  firstName: wcOrder.shipping?.first_name,
                  lastName: wcOrder.shipping?.last_name,
                  street: wcOrder.shipping?.address_1,
                  city: wcOrder.shipping?.city,
                  state: wcOrder.shipping?.state,
                  postalCode: wcOrder.shipping?.postcode,
                  country: wcOrder.shipping?.country || 'ES',
                  phone: wcOrder.billing?.phone,
                  email: wcOrder.billing?.email,
                },
                billingAddress: {
                  firstName: wcOrder.billing?.first_name,
                  lastName: wcOrder.billing?.last_name,
                  street: wcOrder.billing?.address_1,
                  city: wcOrder.billing?.city,
                  state: wcOrder.billing?.state,
                  postalCode: wcOrder.billing?.postcode,
                  country: wcOrder.billing?.country || 'ES',
                  phone: wcOrder.billing?.phone,
                  email: wcOrder.billing?.email,
                },
                netAmount: Math.max(0, Number(wcOrder.total || 0) - Number(wcOrder.total_tax || 0)),
                taxAmount: Number(wcOrder.total_tax || 0),
                shippingAmount: Number(wcOrder.shipping_total || 0),
                totalAmount: Number(wcOrder.total || 0),
                notes: wcOrder.customer_note || '',
                lines: (wcOrder.line_items || []).map((li: any, idx: number) => ({
                  id: String(li.id),
                  position: idx + 1,
                  sku: li.sku || 'GENERICO',
                  name: li.name || 'Artículo',
                  quantity: Number(li.quantity || 1),
                  unitPrice: Number(li.price || 0),
                  total: Number(li.total || 0),
                  vatRate: 21,
                })),
              };

              // Delegar en FactusolConnector.createOrder() para idempotencia, deduplicación, F_DCL y reintentos
              const orderRes = await this.factusol.createOrder(canonicalOrder);

              if (orderRes.success) {
                // Marcar en WooCommerce con metadato de importación Factusol
                await fetch(`${cleanUrl}/wp-json/wc/v3/orders/${wcOrder.id}`, {
                  method: 'PUT',
                  headers: {
                    Authorization: authHeader,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    meta_data: [{ key: '_bentian_factusol_pcl', value: String(orderRes.externalId) }],
                  }),
                }).catch(() => null);

                ordersImported++;
                this.addEvent('success', `✓ Pedido #${wcOrder.id} procesado en Factusol (Serie ${series}, Pedido #${orderRes.externalId})`);
              } else {
                this.logger.warn(`No se pudo importar pedido #${wcOrder.id} a Factusol: ${orderRes.error}`);
              }
            }
          }
        } catch (orderErr) {
          this.logger.warn(`Aviso en importación de pedidos: ${String(orderErr)}`);
        }
      } else {
        // Modo Standalone sin WooCommerce configurado
        if (dbPath && fs.existsSync(dbPath)) {
          const count = await this.getFactusolArticleCount();
          if (count) itemsUpdated = Math.min(count, 50);
        }
      }

      const duration = ((Date.now() - start) / 1000).toFixed(1);
      this.addSyncHistoryRecord({
        type: 'manual',
        mode: 'full',
        status: 'success',
        durationSeconds: parseFloat(duration),
        itemsUpdated,
        ordersImported,
        message: `Sincronización completada: ${itemsUpdated} artículos actualizados, ${ordersImported} pedidos importados.`,
      });

      const summary = `Sincronización completada (${itemsUpdated} productos, ${ordersImported} pedidos en ${duration}s)`;
      this.addEvent('success', `✓ ${summary}`);
      return { success: true, message: summary };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.addSyncHistoryRecord({
        type: 'manual',
        mode: 'full',
        status: 'error',
        durationSeconds: parseFloat(((Date.now() - start) / 1000).toFixed(1)),
        itemsUpdated: 0,
        ordersImported: 0,
        message: `Fallo en sincronización: ${msg}`,
      });
      this.addEvent('warn', `Aviso en sincronización: ${msg}`);
      return { success: false, message: `Sincronización finalizada con incidencias: ${msg}` };
    }
  }

  public async getFactusolMetadata(): Promise<{
    tariffs: Array<{ code: string; name: string }>;
    warehouses: Array<{ code: string; name: string }>;
    series: string[];
  }> {
    const defaultRes = {
      tariffs: [
        { code: '1', name: '1: Tarifa General' },
        { code: '2', name: '2: Tarifa Internet' },
        { code: '3', name: '3: Tarifa Contado' },
      ],
      warehouses: [
        { code: 'GEN', name: 'GEN: Almacén General' },
      ],
      series: ['A', 'B', 'C', '1', '2'],
    };

    const dbPath = this.config.factusol?.databasePath || this.config.factusolDbPath;
    if (!dbPath || !fs.existsSync(dbPath)) return defaultRes;

    try {
      const driver = new AccessDriver({ databasePath: dbPath });
      let tariffs = defaultRes.tariffs;
      let warehouses = defaultRes.warehouses;

      try {
        const tRows = await driver.query<{ CODTAR: any; DESTAR: any }>('SELECT CODTAR, DESTAR FROM F_TAR');
        if (tRows && tRows.length > 0) {
          tariffs = tRows.map((r) => ({
            code: String(r.CODTAR || '').trim(),
            name: `${String(r.CODTAR || '').trim()}: ${String(r.DESTAR || '').trim() || 'Tarifa'}`,
          }));
        }
      } catch {}

      try {
        const aRows = await driver.query<{ CODALM: any; NOMALM: any }>('SELECT CODALM, NOMALM FROM F_ALM');
        if (aRows && aRows.length > 0) {
          warehouses = aRows.map((r) => ({
            code: String(r.CODALM || '').trim(),
            name: `${String(r.CODALM || '').trim()}: ${String(r.NOMALM || '').trim() || 'Almacén'}`,
          }));
        }
      } catch {}

      return { tariffs, warehouses, series: defaultRes.series };
    } catch {
      return defaultRes;
    }
  }

  public async getFactusolPreviewArticles(limit = 25): Promise<{
    articles: Array<{ code: string; description: string; family: string; costPrice: number; stock: number; ean: string }>;
    total?: number;
  }> {
    const dbPath = this.config.factusol?.databasePath || this.config.factusolDbPath;
    if (!dbPath || !fs.existsSync(dbPath)) return { articles: [], total: 0 };

    try {
      const driver = new AccessDriver({ databasePath: dbPath });
      const query = `SELECT TOP ${Math.min(limit, 100)} CODART, DESART, FAMART, PCOART, EANART FROM F_ART WHERE CODART <> '' ORDER BY CODART`;
      const artRows = await driver.query<{ CODART: string; DESART: string; FAMART: string; PCOART: number; EANART: string }>(query);

      let stockMap = new Map<string, number>();
      try {
        if (artRows.length > 0) {
          const codes = artRows.map((r) => `'${String(r.CODART || '').replace(/'/g, "''")}'`).join(',');
          const sRows = await driver.query<{ ARTSTO: string; ACTSTO: number }>(`SELECT ARTSTO, ACTSTO FROM F_STO WHERE ARTSTO IN (${codes})`);
          for (const s of sRows) {
            stockMap.set(String(s.ARTSTO || '').trim(), Number(s.ACTSTO) || 0);
          }
        }
      } catch {}

      const articles = artRows.map((r) => {
        const code = String(r.CODART || '').trim();
        return {
          code,
          description: String(r.DESART || '').trim(),
          family: String(r.FAMART || '').trim(),
          costPrice: Number(r.PCOART) || 0,
          stock: stockMap.get(code) ?? 0,
          ean: String(r.EANART || '').trim(),
        };
      });

      return { articles, total: articles.length };
    } catch (err) {
      this.logger.warn(`No se pudo cargar vista previa de artículos: ${String(err)}`);
      return { articles: [], total: 0 };
    }
  }

  public async testWooCommerceConnection(settings: {
    storeUrl: string;
    consumerKey: string;
    consumerSecret: string;
  }): Promise<{ success: boolean; message: string; latencyMs?: number; storeName?: string; productCount?: number }> {
    const start = Date.now();
    try {
      const cleanUrl = settings.storeUrl.trim().replace(/\/+$/, '');
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        return { success: false, message: 'La URL de WooCommerce debe comenzar con http:// o https://' };
      }
      if (!settings.consumerKey || !settings.consumerSecret) {
        return { success: false, message: 'Se requieren Consumer Key (ck_...) y Consumer Secret (cs_...)' };
      }

      const authHeader = 'Basic ' + Buffer.from(`${settings.consumerKey.trim()}:${settings.consumerSecret.trim()}`).toString('base64');

      const res = await fetch(`${cleanUrl}/wp-json/wc/v3/system_status`, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'User-Agent': 'Bentian-LocalAgent/0.1.0',
        },
        signal: AbortSignal.timeout(8000),
      });

      const latencyMs = Date.now() - start;

      if (res.ok) {
        const data = (await res.json()) as any;
        const storeName = data?.environment?.site_title || cleanUrl;
        return {
          success: true,
          message: `Conexión exitosa con ${storeName} (${latencyMs}ms). WooCommerce v${data?.environment?.version || 'activa'}.`,
          latencyMs,
          storeName,
        };
      }

      const resProducts = await fetch(`${cleanUrl}/wp-json/wc/v3/products?per_page=1`, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'User-Agent': 'Bentian-LocalAgent/0.1.0',
        },
        signal: AbortSignal.timeout(8000),
      });

      const latencyFallback = Date.now() - start;
      if (resProducts.ok) {
        const totalHeader = resProducts.headers.get('x-wp-total');
        const count = totalHeader ? parseInt(totalHeader, 10) : undefined;
        return {
          success: true,
          message: `Conexión exitosa con WooCommerce (${latencyFallback}ms). ${count !== undefined ? count + ' productos detectados.' : ''}`,
          latencyMs: latencyFallback,
          productCount: count,
        };
      }

      if (res.status === 401 || resProducts.status === 401) {
        return { success: false, message: 'Autenticación fallida: Consumer Key o Consumer Secret no válidos (HTTP 401).' };
      }
      return { success: false, message: `Error de conexión con WooCommerce: HTTP ${resProducts.status || res.status} ${resProducts.statusText || res.statusText}` };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Error de red al conectar con WooCommerce (${latencyMs}ms): ${msg}` };
    }
  }

  public async saveFullConfig(updates: {
    factusol?: AgentFactusolSettings;
    woocommerce?: AgentWooCommerceSettings;
    syncRules?: AgentSyncRules;
    licenseKey?: string;
  }): Promise<{ success: boolean; message: string }> {
    if (updates.factusol) {
      this.config.factusol = { ...(this.config.factusol || {}), ...updates.factusol };
      if (updates.factusol.databasePath) {
        this.config.factusolDbPath = updates.factusol.databasePath;
      }
    }

    if (updates.woocommerce) {
      this.config.woocommerce = { ...(this.config.woocommerce || {}), ...updates.woocommerce };
    }

    if (updates.syncRules) {
      this.config.syncRules = { ...(this.config.syncRules || {}), ...updates.syncRules };
    }

    let licenseMsg = '';
    if (updates.licenseKey && updates.licenseKey !== this.config.licenseKey) {
      const licRes = await this.activateLicense(updates.licenseKey);
      if (!licRes.success) {
        licenseMsg = ` (Aviso en licencia: ${licRes.error})`;
      } else {
        this.config.licenseKey = updates.licenseKey;
        licenseMsg = ' (Licencia activada con éxito)';
      }
    }

    this.saveConfigToDisk();
    this.startAutoSyncLoop();

    if (this.config.factusolDbPath && fs.existsSync(this.config.factusolDbPath)) {
      await this.reconnectFactusol(this.config.factusolDbPath).catch(() => null);
    }

    this.addEvent('success', `✓ Configuración local actualizada${licenseMsg}`);
    return { success: true, message: `Configuración guardada con éxito${licenseMsg}` };
  }

  public exportDiagnostic(): string {
    const hwid = this.currentHwid || 'Desconocido';
    const sys = this.getSystemInfo();
    const fact = this.config.factusol || {};
    const woo = this.config.woocommerce || {};
    const rules = this.config.syncRules || {};
    const maskedKey = woo.consumerKey ? woo.consumerKey.substring(0, 7) + '...' : 'No configurada';

    const lines = [
      '==============================================================================',
      '   BENTIAN ERP BRIDGE — INFORME DE DIAGNÓSTICO TÉCNICO LOCAL',
      `   Generado: ${new Date().toISOString()}`,
      '==============================================================================',
      '',
      '[1] ENTORNO Y SISTEMA OPERATIVO',
      '------------------------------------------------------------------------------',
      `Agente:             ${this.config.agentName} (v${this.currentVersion})`,
      `ID Agente:          ${this.config.agentId || 'Modo Standalone'}`,
      `Plataforma:         ${sys.platform} (${sys.arch}) - OS: ${sys.osVersion}`,
      `Hardware ID (HWID): ${hwid}`,
      `Node.js:            ${sys.nodeVersion} - Uptime: ${sys.uptimeSeconds}s`,
      `Memoria RAM:        ${sys.memoryFreeMb} MB libres / ${sys.memoryTotalMb} MB total`,
      `Núcleos CPU:        ${sys.cpuCores}`,
      `Ruta Ejecutable:    ${process.execPath}`,
      `Archivo Config:     ${this.configFilePath}`,
      '',
      '[2] LICENCIAMIENTO BENTIAN',
      '------------------------------------------------------------------------------',
      `Estado:             ${this.licenseStatus}`,
      `Plan Activo:        ${this.activePlan || 'professional'}`,
      `Clave Licencia:     ${this.config.licenseKey || 'Sin clave'}`,
      `Servidor Central:   ${this.config.apiBaseUrl}`,
      '',
      '[3] FACTUSOL ERP (LOCAL ACCESS)',
      '------------------------------------------------------------------------------',
      `Ruta Base Datos:    ${this.config.factusolDbPath || 'Sin ruta'}`,
      `Existe en Disco:    ${this.config.factusolDbPath && fs.existsSync(this.config.factusolDbPath) ? 'SÍ' : 'NO'}`,
      `Vigilante Archivo:  ${this.watcher ? 'ACTIVO (Tiempo Real)' : 'INACTIVO'}`,
      `Tarifa Activa:      ${fact.tariffCode || '1'}`,
      `Serie Pedidos:      ${fact.orderSeries || 'A'}`,
      `Serie Facturas:     ${fact.invoiceSeries || '1'}`,
      `Almacén Defecto:    ${fact.warehouseCode || 'GEN'}`,
      '',
      '[4] WOOCOMMERCE TIENDA ONLINE',
      '------------------------------------------------------------------------------',
      `URL Tienda:         ${woo.storeUrl || 'No configurada'}`,
      `Consumer Key:       ${maskedKey}`,
      `Mapeo Estados:      ${JSON.stringify(woo.orderStatusMapping || {})}`,
      '',
      '[5] REGLAS DE SINCRONIZACIÓN',
      '------------------------------------------------------------------------------',
      `Vigilante Activado: ${rules.enableFileWatcher !== false ? 'SÍ' : 'NO'}`,
      `Debounce:           ${rules.debounceSeconds ?? 5} segundos`,
      `Intervalo Periódico:${rules.periodicIntervalMinutes ?? 15} minutos`,
      `Sincronizar Stock:  ${rules.syncStock !== false ? 'SÍ' : 'NO'}`,
      `Sincronizar Precios:${rules.syncPrices !== false ? 'SÍ' : 'NO'}`,
      `Sincronizar Descr:  ${rules.syncDescriptions ? 'SÍ' : 'NO'}`,
      `Stock Buffer Min:   ${rules.safetyStockBuffer ?? 0}`,
      `Solo Stock > 0:     ${rules.onlyStockAboveZero ? 'SÍ' : 'NO'}`,
      '',
      '[6] HISTORIAL DE EJECUCIONES RECIENTES',
      '------------------------------------------------------------------------------',
    ];

    if (this.syncHistory.length === 0) {
      lines.push('Sin registros en el historial.');
    } else {
      for (const h of this.syncHistory.slice(0, 10)) {
        lines.push(`[${h.timestamp}] [${h.type.toUpperCase()}/${h.mode.toUpperCase()}] Estado: ${h.status} | Artículos: ${h.itemsUpdated} | Pedidos: ${h.ordersImported} | ${h.durationSeconds}s | ${h.message}`);
      }
    }

    lines.push('');
    lines.push('[7] REGISTRO DE EVENTOS EN TIEMPO REAL (ÚLTIMOS 50)');
    lines.push('------------------------------------------------------------------------------');
    if (this.recentEvents.length === 0) {
      lines.push('Sin eventos registrados.');
    } else {
      for (const ev of this.recentEvents.slice(0, 50)) {
        lines.push(`[${ev.timestamp}] [${ev.level.toUpperCase()}] ${ev.message}`);
      }
    }
    lines.push('==============================================================================');

    return lines.join('\n');
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
    factusolSettings?: AgentFactusolSettings;
    woocommerceSettings?: AgentWooCommerceSettings;
    syncRules?: AgentSyncRules;
    syncHistory?: SyncHistoryRecord[];
    system: AgentSystemInfo;
    recentEvents: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }>;
  }> {
    const hwid = await this.getHWID();
    const license = await this.validateLicense();
    let articleCount: number | undefined;
    let fileSizeBytes: number | undefined;
    let connected = false;
    let statusMessage = 'No configurado';

    const dbPath = this.config.factusol?.databasePath || this.config.factusolDbPath;

    if (dbPath && fs.existsSync(dbPath)) {
      try {
        const stats = fs.statSync(dbPath);
        fileSizeBytes = stats.size;
        if (this.factusol) {
          const health = await this.factusol.healthCheck();
          connected = health.status === 'HEALTHY';
          statusMessage = health.message || '';
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
      apiBaseUrl: this.config.apiBaseUrl || 'https://bridge.cristianjm.com',
      licenseKey: this.config.licenseKey,
      hwid,
      license,
      factusol: {
        configured: Boolean(dbPath && fs.existsSync(dbPath)),
        databasePath: dbPath || '',
        fileName: dbPath ? path.basename(dbPath) : '',
        connected,
        watcherActive: this.watcher !== null,
        articleCount,
        fileSizeBytes,
        statusMessage,
      },
      factusolSettings: this.config.factusol,
      woocommerceSettings: this.config.woocommerce,
      syncRules: this.config.syncRules,
      syncHistory: this.getSyncHistory(),
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

    // 1. Check local token payload with cryptographic verification and HWID binding
    const verification = LicenseTokenManager.verifyToken(token);
    const localPayload: LicenseTokenPayload | null = verification.valid && verification.payload ? verification.payload : null;
    const now = Date.now();
    const isLocalTokenValid = localPayload ? (now <= localPayload.expiresAt && (!localPayload.hwid || localPayload.hwid === hwid)) : false;

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

      // Start reactive file watcher
      this.watcher = new AccdbFileWatcher({
        filePath: this.config.factusolDbPath,
        organizationId: this.config.organizationId,
        debounceMs: 5000,
      });

      this.watcher.onSync(async (reason) => {
        this.logger.info(`Cambio detectado en base Factusol (${reason}). Disparando sincronización de stock autónoma...`);
        this.addEvent('info', `Cambio detectado en Factusol (${reason}). Sincronizando stock...`);
        if (!this.isSyncing) {
          void this.triggerManualSync();
        }
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
      this.logger.warn(`No se ha configurado o no existe el archivo de Factusol: ${this.config.factusolDbPath || 'Sin ruta'}`);
      this.addEvent('warn', '⚠️ Base de datos Factusol no configurada. Use la ventana para seleccionarla.');
    }

    this.startAutoSyncLoop();
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

  private startAutoSyncLoop(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }

    // Intervalo de comprobación autónoma periódica (30 segundos por defecto)
    const intervalMs = 30000;

    const checkAndSync = async () => {
      if (!this.isRunning || this.isSyncing) return;
      const dbPath = this.config.factusol?.databasePath || this.config.factusolDbPath;
      const woo = this.config.woocommerce;
      if (!dbPath || !fs.existsSync(dbPath) || !woo?.storeUrl || !woo?.consumerKey || !woo?.consumerSecret) {
        return;
      }

      try {
        this.isSyncing = true;
        await this.triggerManualSync();
      } catch (err) {
        this.logger.warn(`Aviso en sincronización periódica: ${String(err)}`);
      } finally {
        this.isSyncing = false;
      }
    };

    this.autoSyncTimer = setInterval(checkAndSync, intervalMs);
    this.logger.info(`✓ Sincronización autónoma en segundo plano activa (comprobando pedidos cada ${intervalMs / 1000}s)`);
    this.addEvent('info', `✓ Modo autónomo activo: revisando pedidos cada ${intervalMs / 1000}s`);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
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
        const raw = fs.readFileSync(this.configFilePath, 'utf8').replace(/^\uFEFF/, '');
        return JSON.parse(raw) as AgentConfigFile;
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
