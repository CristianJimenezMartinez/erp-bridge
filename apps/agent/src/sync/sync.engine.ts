import fs from 'fs';
import { Logger } from '@erp-bridge/shared';
import { AccessDriver, FactusolConnector, FactusolYearResolver } from '@erp-bridge/connector-factusol';
import { ConfigManager } from '../config/config.manager';
import { HistoryManager } from '../history/history.manager';
import { EventBus } from '../diagnostics/event-bus';
import { AgentDiskLogger } from '../diagnostics/disk-logger';
import { FactusolService } from '../factusol/factusol.service';
import { SyncManualResult, CatalogUploadResult } from './sync.types';
import { ImageSyncService } from './image-sync.service';
import { OrderSyncHelper } from './order-sync.helper';
import { CancellationSyncHelper } from './cancellation-sync.helper';
import { CatalogUploadHelper } from './catalog-upload.helper';

export class LocalSyncEngine {
  private readonly logger = new Logger('LocalSyncEngine');
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private hasAutoUploadedCatalog = false;

  constructor(
    private readonly configManager: ConfigManager,
    private readonly factusolService: FactusolService,
    private readonly historyManager: HistoryManager,
    private readonly eventBus: EventBus,
    private readonly licenseCheckFn?: () => { status: string; plan?: string }
  ) {}

  public isBusy(): boolean {
    return this.isSyncing;
  }

  public extractTaxIdFromWcOrder(wcOrder: any): string {
    return OrderSyncHelper.extractTaxIdFromWcOrder(wcOrder);
  }

  public resolveBridgeEndpoint(storeUrl: string): string {
    let clean = (storeUrl || '').trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    // Blindaje de red: forzar www. en suministrosrubio.com para evitar redirecciones 301 que vacíen peticiones POST
    clean = clean.replace(/^(https?:\/\/)(?:www\.)?suministrosrubio\.com(\/|$)/i, '$1www.suministrosrubio.com$2');
    clean = clean.replace(/\/+$/, '');
    if (!clean.endsWith('.php')) {
      clean += '/erp-bridge-endpoint.php';
    }
    return clean;
  }

  public getBridgeHeaders(secretKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (secretKey) {
      headers['Authorization'] = `Bearer ${secretKey.trim()}`;
    }
    return headers;
  }

  public async triggerManualSync(): Promise<SyncManualResult> {
    if (this.isSyncing) {
      this.logger.warn('Intento de sincronización ignorado: ya existe un ciclo en ejecución.');
      return { success: false, message: 'Ya hay un proceso de sincronización en ejecución.' };
    }

    // Guarda estricta de seguridad y licencias: bloquear sincronización si no está validada
    if (this.licenseCheckFn) {
      const lic = this.licenseCheckFn();
      if (lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
        const msg = `Sincronización bloqueada: Requiere una licencia activa (${lic.status}). Active su clave en el Centro de Control para sincronizar con la tienda web.`;
        this.logger.warn(msg);
        this.eventBus.addEvent('warn', `⚠️ ${msg}`);
        return { success: false, message: msg };
      }
    }

    this.isSyncing = true;
    const start = Date.now();
    try {
      return await this.executeManualSync(start);
    } finally {
      this.isSyncing = false;
    }
  }

  private async executeManualSync(start: number): Promise<SyncManualResult> {
    this.eventBus.addEvent('info', 'Iniciando ciclo de sincronización bidireccional...');
    let itemsUpdated = 0;
    let ordersImported = 0;

    const config = this.configManager.get();
    let dbPath = config.factusol?.databasePath || config.factusolDbPath;
    const woo = config.woocommerce || {};

    // Comprobación y resolución de Rollover Fiscal Automático de Factusol
    if (dbPath) {
      try {
        const rollover = FactusolYearResolver.resolveActiveDatabase(dbPath);
        if (rollover.switched && rollover.activePath && rollover.activePath !== dbPath) {
          const oldFile = dbPath.split(/[/\\]/).pop() || dbPath;
          const newFile = rollover.activePath.split(/[/\\]/).pop() || rollover.activePath;
          this.logger.info(
            `🔄 Rollover fiscal automático detectado: ${oldFile} -> ${newFile} (Ejercicio ${rollover.previousYear ?? '?'} -> ${rollover.currentYear ?? '?'})`
          );
          this.eventBus.addEvent(
            'info',
            `🔄 Cambio de ejercicio fiscal Factusol automático: ${oldFile} ➔ ${newFile}`
          );
          const newPath = rollover.activePath;
          dbPath = newPath;
          this.configManager.setFactusolDbPath(newPath);
          await this.factusolService.reconnect(newPath).catch((err) => {
            this.logger.warn(`Aviso al reconectar factusolService tras rollover fiscal: ${String(err)}`);
          });
        }
      } catch (resolverErr) {
        this.logger.warn(`Aviso al verificar rollover fiscal de Factusol: ${String(resolverErr)}`);
      }
    }

    const isUniversalBridge =
      config.channelType === 'universal_bridge' ||
      (Boolean(config.universalBridge?.storeUrl) && !woo.storeUrl);

    if (isUniversalBridge) {
      if (!dbPath || !fs.existsSync(dbPath)) {
        const msg = 'Base de datos de Factusol no configurada o inaccesible.';
        this.eventBus.addEvent('error', `❌ ${msg}`);
        return { success: false, message: msg };
      }
      return this.syncUniversalBridge(dbPath, config, start);
    }

    try {
      if (dbPath && fs.existsSync(dbPath) && woo.storeUrl && woo.consumerKey && woo.consumerSecret) {
        const cleanUrl = woo.storeUrl.trim().replace(/\/+$/, '');
        const authHeader = 'Basic ' + Buffer.from(`${woo.consumerKey.trim()}:${woo.consumerSecret.trim()}`).toString('base64');
        const driver = new AccessDriver({ databasePath: dbPath });
        const timings: Record<string, number> = {};

        // 1. SINCRONIZACIÓN DE STOCK (Factusol -> WooCommerce)
        try {
          const tStockQueryStart = performance.now();
          const warehouse = (config.factusol?.warehouseCode || 'GEN').replace(/'/g, "''").trim();
          const stockRows = await driver.query<{ ARTSTO: any; totalStock: any }>(
            `SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO WHERE ALMSTO = '${warehouse}' OR ALMSTO = 'GEN' GROUP BY ARTSTO`
          ).catch((err) => {
            this.logger.warn('Error al consultar stock en Factusol:', err);
            return null;
          });
          const stockQueryDurationMs = Math.round(performance.now() - tStockQueryStart);
          timings['queryFactusolStockMs'] = stockQueryDurationMs;

          if (!stockRows || stockRows.length === 0) {
            AgentDiskLogger.getInstance().log({
              level: 'WARN',
              component: 'SyncEngine',
              action: 'query_factusol_stock',
              duration_ms: stockQueryDurationMs,
              status: 'FAILURE',
              message: `Consulta de stock en Factusol devolvió 0 registros o falló en ${stockQueryDurationMs}ms`,
              metadata: { warehouse },
            });
            this.logger.warn('La consulta de stock en Factusol devolvió 0 registros o falló. Se aborta la sincronización de stock preventivamente para evitar vaciado en WooCommerce.');
            this.eventBus.addEvent('warn', 'Lectura de stock en Factusol inaccesible. Sincronización de stock omitida preventivamente.');
          } else {
            AgentDiskLogger.getInstance().log({
              level: 'SUCCESS',
              component: 'SyncEngine',
              action: 'query_factusol_stock',
              duration_ms: stockQueryDurationMs,
              status: 'SUCCESS',
              message: `Consulta Factusol F_STO completada (${stockRows.length} referencias) en ${stockQueryDurationMs}ms`,
              metadata: { warehouse, count: stockRows.length },
            });

            const stockMap = new Map<string, number>();
            for (const row of stockRows) {
              const sku = String(row.ARTSTO || '').trim().toUpperCase();
              if (sku) {
                stockMap.set(sku, Math.max(0, Math.round(Number(row.totalStock) || 0)));
              }
            }

            // Paginación completa de productos de WooCommerce (en lotes de 100 con bucle while (hasMore))
            const tPaginationStart = performance.now();
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
            const paginationDurationMs = Math.round(performance.now() - tPaginationStart);
            timings['paginateWcProductsMs'] = paginationDurationMs;

            // Si la tienda WooCommerce está vacía (0 productos), activar Install & Plug
            if (allWcProducts.length === 0 && !this.hasAutoUploadedCatalog) {
              this.hasAutoUploadedCatalog = true;
              this.logger.info('🚀 Tienda WooCommerce vacía detectada (0 productos). Activando "Install & Plug": subiendo catálogo inicial de Factusol automáticamente...');
              this.eventBus.addEvent('info', '🚀 Tienda WooCommerce vacía. Activando "Install & Plug": subiendo catálogo de Factusol automáticamente...');
              void this.uploadCatalog().catch((catErr) => {
                this.logger.warn(`Aviso en subida inicial automática de catálogo a WooCommerce: ${String(catErr)}`);
              });
            }

            // Dirty-checking: enviar a WooCommerce batch únicamente los artículos gestionados en Factusol cuyo stock haya variado
            const batchUpdates: Array<{ id: number; stock_quantity: number }> = [];
            for (const prod of allWcProducts) {
              if (!prod.sku) continue;
              const skuNorm = prod.sku.trim().toUpperCase();
              if (!stockMap.has(skuNorm)) {
                // Si el artículo no está en Factusol, no se toca en la tienda online
                continue;
              }
              const newStock = stockMap.get(skuNorm)!;
              const currentStock = typeof prod.stock_quantity === 'number' ? prod.stock_quantity : null;

              if (currentStock === null || currentStock !== newStock) {
                batchUpdates.push({ id: prod.id, stock_quantity: newStock });
              }
            }

            const tBatchPushStart = performance.now();
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
              const batchPushDurationMs = Math.round(performance.now() - tBatchPushStart);
              timings['pushStockMs'] = batchPushDurationMs;
              AgentDiskLogger.getInstance().log({
                level: 'SUCCESS',
                component: 'SyncEngine',
                action: 'push_channel_stock',
                duration_ms: batchPushDurationMs,
                status: 'SUCCESS',
                message: `Stock sincronizado en ${itemsUpdated} productos de WooCommerce (dirty-check) en ${batchPushDurationMs}ms`,
                metadata: { channel: 'woocommerce', itemsUpdated },
              });
              this.eventBus.addEvent('success', `✓ Stock sincronizado en ${itemsUpdated} productos de WooCommerce (dirty-check)`);
            } else {
              const batchPushDurationMs = Math.round(performance.now() - tBatchPushStart);
              timings['pushStockMs'] = batchPushDurationMs;
              AgentDiskLogger.getInstance().log({
                level: 'INFO',
                component: 'SyncEngine',
                action: 'push_channel_stock',
                duration_ms: batchPushDurationMs,
                status: 'SKIPPED',
                message: `Dirty-check: Todos los stocks en WooCommerce se encuentran al día (0 modificaciones necesarias)`,
                metadata: { channel: 'woocommerce', totalChecked: allWcProducts.length },
              });
              this.logger.info('Dirty-check: Todos los stocks en WooCommerce se encuentran al día.');
            }
          }
        } catch (stockErr) {
          this.logger.warn(`Aviso en sincronización de stock: ${String(stockErr)}`);
        }

        // 2. SINCRONIZACIÓN DE PEDIDOS (WooCommerce -> Factusol)
        try {
          const series = config.factusol?.orderSeries || '1';
          const warehouse = config.factusol?.warehouseCode || 'GEN';

          let factusolConnector = this.factusolService.getConnector();
          if (!factusolConnector) {
            factusolConnector = new FactusolConnector();
            await factusolConnector.connect({
              configuration: {
                databasePath: dbPath,
                orderSeries: series,
                defaultWarehouse: warehouse,
                tariffCode: config.factusol?.tariffCode || '1',
                saleTariffCode: config.factusol?.saleTariffCode,
              },
            });
          }

          let wcOrderPage = 1;
          const MAX_WC_PAGES = 10;
          let hasMoreWc = true;
          let pullOrdersDurationMs = 0;
          let orderInsertTotalMs = 0;

          while (hasMoreWc && wcOrderPage <= MAX_WC_PAGES) {
            const tFetchPage = performance.now();
            const resOrders: any = await fetch(
              `${cleanUrl}/wp-json/wc/v3/orders?status=processing&per_page=100&page=${wcOrderPage}&orderby=date&order=desc`,
              {
                headers: { Authorization: authHeader },
                signal: AbortSignal.timeout(15000),
              }
            ).catch((err) => {
              this.logger.warn(`Error al consultar pedidos en WooCommerce (página ${wcOrderPage}): ${String(err)}`);
              return null;
            });
            pullOrdersDurationMs += Math.round(performance.now() - tFetchPage);

            if (!resOrders || !resOrders.ok) {
              break;
            }

            const wcOrders = (await resOrders.json().catch(() => [])) as any[];
            if (!Array.isArray(wcOrders) || wcOrders.length === 0) {
              hasMoreWc = false;
              break;
            }

            let newOrdersInBatch = 0;
            for (const wcOrder of wcOrders) {
              if (OrderSyncHelper.isWcOrderAlreadyProcessed(wcOrder)) {
                continue;
              }
              newOrdersInBatch++;

              const canonicalOrder = OrderSyncHelper.wooCommerceToCanonical(wcOrder, series, warehouse);
              const tInsertOrder = performance.now();
              const orderRes = await factusolConnector.createOrder(canonicalOrder);
              const insertDurationMs = Math.round(performance.now() - tInsertOrder);
              orderInsertTotalMs += insertDurationMs;

              if (orderRes.success) {
                const assignedNum = String(orderRes.externalId || orderRes.orderNumber || wcOrder.id);
                // Marcar en WooCommerce con metadato de importación Factusol
                await fetch(`${cleanUrl}/wp-json/wc/v3/orders/${wcOrder.id}`, {
                  method: 'PUT',
                  headers: {
                    Authorization: authHeader,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    meta_data: [{ key: '_bentian_factusol_pcl', value: assignedNum }],
                  }),
                }).catch(() => null);

                ordersImported++;
                AgentDiskLogger.getInstance().log({
                  level: 'SUCCESS',
                  component: 'SyncEngine',
                  action: 'insert_factusol_order',
                  duration_ms: insertDurationMs,
                  status: 'SUCCESS',
                  message: `Pedido #${wcOrder.id} procesado en Factusol en ${insertDurationMs}ms (Serie ${series}, Pedido #${assignedNum})`,
                  metadata: {
                    channel: 'woocommerce',
                    wcOrderId: wcOrder.id,
                    factusolOrderNumber: assignedNum,
                    series,
                  },
                });
                this.eventBus.addEvent('success', `✓ Pedido #${wcOrder.id} procesado en Factusol (Serie ${series}, Pedido #${assignedNum})`);
              } else {
                AgentDiskLogger.getInstance().log({
                  level: 'ERROR',
                  component: 'SyncEngine',
                  action: 'insert_factusol_order',
                  duration_ms: insertDurationMs,
                  status: 'FAILURE',
                  message: `No se pudo importar pedido #${wcOrder.id} a Factusol tras ${insertDurationMs}ms: ${orderRes.error}`,
                  metadata: {
                    channel: 'woocommerce',
                    wcOrderId: wcOrder.id,
                    series,
                    error: orderRes.error,
                  },
                });
                this.logger.warn(`No se pudo importar pedido #${wcOrder.id} a Factusol: ${orderRes.error}`);
              }
            }

            // Parada temprana: si en orden desc todos los 100 pedidos ya estaban sincronizados, detener
            if (newOrdersInBatch === 0 || wcOrders.length < 100) {
              hasMoreWc = false;
            } else {
              wcOrderPage++;
            }
          }

          timings['pullOrdersMs'] = pullOrdersDurationMs;
          timings['orderInsertMs'] = orderInsertTotalMs;
        } catch (orderErr) {
          this.logger.warn(`Aviso en importación de pedidos de WooCommerce: ${String(orderErr)}`);
        }

        // 3. SINCRONIZACIÓN INVERSA DE PEDIDOS CANCELADOS/REEMBOLSADOS (WooCommerce -> Factusol)
        try {
          const cancelSeries = config.factusol?.orderSeries || '1';
          const cancelWarehouse = config.factusol?.warehouseCode || 'GEN';
          this.eventBus.addEvent('info', 'Comprobando pedidos cancelados/reembolsados en WooCommerce...');
          const tCancelStart = performance.now();
          const cancelRes = await CancellationSyncHelper.syncWooCommerceCancellations({
            storeUrl: cleanUrl,
            authHeader,
            driver,
            orderSeries: cancelSeries,
            defaultWarehouse: cancelWarehouse,
            eventBus: this.eventBus,
          });
          const cancelDurationMs = Math.round(performance.now() - tCancelStart);
          timings['cancellationsMs'] = cancelDurationMs;

          if (cancelRes.ordersCancelled > 0) {
            AgentDiskLogger.getInstance().log({
              level: 'SUCCESS',
              component: 'SyncEngine',
              action: 'sync_cancellations',
              duration_ms: cancelDurationMs,
              status: 'SUCCESS',
              message: `Stock repuesto en Factusol para ${cancelRes.ordersCancelled} pedidos cancelados/reembolsados de WooCommerce en ${cancelDurationMs}ms`,
              metadata: { channel: 'woocommerce', ordersCancelled: cancelRes.ordersCancelled },
            });
            this.eventBus.addEvent('success', `✓ Stock repuesto en Factusol para ${cancelRes.ordersCancelled} pedidos cancelados/reembolsados de WooCommerce.`);
          }
        } catch (cancelErr) {
          this.logger.warn(`Aviso en sincronización inversa de cancelaciones de WooCommerce: ${String(cancelErr)}`);
        }
      } else {
        // Modo Standalone sin WooCommerce configurado
        if (dbPath && fs.existsSync(dbPath)) {
          const count = await this.factusolService.getArticleCount();
          if (count) itemsUpdated = Math.min(count, 50);
        }
      }

      const cycleDurationMs = Date.now() - start;
      const duration = (cycleDurationMs / 1000).toFixed(1);
      this.historyManager.addSyncHistoryRecord({
        type: 'manual',
        mode: 'full',
        status: 'success',
        durationSeconds: parseFloat(duration),
        itemsUpdated,
        ordersImported,
        message: `Sincronización completada: ${itemsUpdated} artículos actualizados, ${ordersImported} pedidos importados.`,
      });

      const summary = `Sincronización completada (${itemsUpdated} productos, ${ordersImported} pedidos en ${duration}s)`;
      this.eventBus.addEvent('success', `✓ ${summary}`);
      AgentDiskLogger.getInstance().log({
        level: 'SUCCESS',
        component: 'SyncEngine',
        action: 'sync_cycle_complete',
        duration_ms: cycleDurationMs,
        status: 'SUCCESS',
        message: `Ciclo completo de sincronización WooCommerce finalizado en ${cycleDurationMs}ms`,
        metadata: {
          channel: 'woocommerce',
          itemsUpdated,
          ordersImported,
        },
      });
      return { success: true, message: summary };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.historyManager.addSyncHistoryRecord({
        type: 'manual',
        mode: 'full',
        status: 'error',
        durationSeconds: parseFloat(((Date.now() - start) / 1000).toFixed(1)),
        itemsUpdated: 0,
        ordersImported: 0,
        message: `Fallo en sincronización: ${msg}`,
      });
      this.eventBus.addEvent('warn', `Aviso en sincronización: ${msg}`);
      return { success: false, message: `Sincronización finalizada con incidencias: ${msg}` };
    }
  }

  public startAutoSyncLoop(isRunningGetter: () => boolean): void {
    this.stopAutoSyncLoop();
    const intervalMs = 30000;

    const checkAndSync = async () => {
      if (!isRunningGetter() || this.isSyncing) return;

      // Guarda de licencia: no sincronizar automáticamente en segundo plano si la licencia no es válida
      if (this.licenseCheckFn) {
        const lic = this.licenseCheckFn();
        if (lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
          return;
        }
      }

      const config = this.configManager.get();
      const dbPath = config.factusol?.databasePath || config.factusolDbPath;
      const woo = config.woocommerce;
      const isBridge =
        config.channelType === 'universal_bridge' ||
        (Boolean(config.universalBridge?.storeUrl) && !woo?.storeUrl);
      const isWoo = Boolean(
        woo?.storeUrl && woo?.consumerKey && woo?.consumerSecret
      );

      if (!dbPath || !fs.existsSync(dbPath) || (!isBridge && !isWoo)) {
        return;
      }

      try {
        await this.triggerManualSync();
      } catch (err) {
        this.logger.warn(`Aviso en sincronización periódica: ${String(err)}`);
      }
    };

    this.autoSyncTimer = setInterval(checkAndSync, intervalMs);
    this.logger.info(`✓ Sincronización autónoma en segundo plano activa (comprobando pedidos cada ${intervalMs / 1000}s)`);
    this.eventBus.addEvent('info', `✓ Modo autónomo activo: revisando pedidos cada ${intervalMs / 1000}s`);
  }

  public stopAutoSyncLoop(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  public async uploadCatalog(options?: { limit?: number; onlyMissing?: boolean }): Promise<CatalogUploadResult> {
    if (this.licenseCheckFn) {
      const lic = this.licenseCheckFn();
      if (lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
        const msg = `Subida de catálogo bloqueada: Requiere una licencia activa (${lic.status}). Active su clave en el Centro de Control.`;
        this.logger.warn(msg);
        this.eventBus.addEvent('warn', `⚠️ ${msg}`);
        return {
          success: false,
          totalArticles: 0,
          uploadedCount: 0,
          skippedCount: 0,
          failedCount: 0,
          message: msg,
        };
      }
    }

    if (this.isSyncing) {
      const busyMsg = 'Subida de catálogo omitida: el motor de sincronización ya está ejecutando otra tarea activa.';
      this.logger.warn(busyMsg);
      return {
        success: false,
        totalArticles: 0,
        uploadedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        message: busyMsg,
      };
    }
    this.isSyncing = true;
    try {
      return await CatalogUploadHelper.uploadCatalog(
        {
          configManager: this.configManager,
          factusolService: this.factusolService,
          historyManager: this.historyManager,
          eventBus: this.eventBus,
          logger: this.logger,
          resolveBridgeEndpoint: (url) => this.resolveBridgeEndpoint(url),
          getBridgeHeaders: (key) => this.getBridgeHeaders(key),
        },
        options
      );
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncUniversalBridge(
    dbPath: string,
    config: any,
    start: number
  ): Promise<SyncManualResult> {
    let itemsUpdated = 0;
    let ordersImported = 0;
    const timings: Record<string, number> = {};

    const bridgeSettings = config.universalBridge || {};
    if (!bridgeSettings.storeUrl) {
      const msg = 'URL del sitio web no configurada en Universal Bridge.';
      this.eventBus.addEvent('warn', msg);
      return { success: false, message: msg };
    }

    const endpointUrl = this.resolveBridgeEndpoint(bridgeSettings.storeUrl);
    const secretKey = bridgeSettings.secretKey;
    const headers = this.getBridgeHeaders(secretKey);
    const driver = new AccessDriver({ databasePath: dbPath });

    // 0. Filosofía "Install & Plug": Comprobación autónoma de catálogo inicial en la web
    if (!this.hasAutoUploadedCatalog) {
      try {
        const pingRes = await fetch(`${endpointUrl}?action=ping`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(10000),
        }).catch(() => null);

        if (pingRes && pingRes.ok) {
          const pingJson = (await pingRes.json().catch(() => null)) as { articleCount?: number } | null;
          if (pingJson && typeof pingJson.articleCount === 'number') {
            if (pingJson.articleCount === 0) {
              this.hasAutoUploadedCatalog = true;
              this.logger.info('🚀 Tienda web vacía detectada (0 artículos). Activando "Install & Plug": subiendo catálogo y fotos desde Factusol automáticamente...');
              this.eventBus.addEvent('info', '🚀 Tienda web vacía (0 artículos). Activando "Install & Plug": subiendo catálogo y fotos desde Factusol automáticamente...');
              void this.uploadUniversalBridgeCatalog(dbPath, config).catch((catErr) => {
                this.logger.warn(`Aviso en subida autónoma inicial de catálogo: ${String(catErr)}`);
              });
            } else {
              this.hasAutoUploadedCatalog = true;
            }
          }
        }
      } catch (pingErr) {
        this.logger.warn(`Aviso al comprobar estado inicial de la tienda web: ${String(pingErr)}`);
      }
    }

    // 1. Sincronización de existencias de stock (Factusol -> Universal Bridge)
    try {
      this.eventBus.addEvent('info', 'Consultando existencias de stock en Factusol...');
      const tStockQueryStart = performance.now();
      const warehouse = (config.factusol?.warehouseCode || 'GEN').replace(/'/g, "''").trim();
      const stockRows = await driver
        .query<{ ARTSTO: any; totalStock: any }>(
          `SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO WHERE ALMSTO = '${warehouse}' OR ALMSTO = 'GEN' GROUP BY ARTSTO`
        )
        .catch((err) => {
          this.logger.warn('Error al consultar stock en Factusol:', err);
          return null;
        });
      const stockQueryDurationMs = Math.round(performance.now() - tStockQueryStart);
      timings['queryFactusolStockMs'] = stockQueryDurationMs;

      if (stockRows && stockRows.length > 0) {
        AgentDiskLogger.getInstance().log({
          level: 'SUCCESS',
          component: 'SyncEngine',
          action: 'query_factusol_stock',
          duration_ms: stockQueryDurationMs,
          status: 'SUCCESS',
          message: `Consulta Factusol F_STO completada (${stockRows.length} referencias) en ${stockQueryDurationMs}ms`,
          metadata: { warehouse, count: stockRows.length },
        });

        const stockUpdates = stockRows
          .map((r) => ({
            code: String(r.ARTSTO || '').trim(),
            stock: Math.max(0, Math.round(Number(r.totalStock) || 0)),
          }))
          .filter((u) => u.code);

        const tPushStockStart = performance.now();
        const STOCK_BATCH = 500;
        for (let i = 0; i < stockUpdates.length; i += STOCK_BATCH) {
          const chunk = stockUpdates.slice(i, i + STOCK_BATCH);
          const res = await fetch(`${endpointUrl}?action=push_stock`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ stockUpdates: chunk }),
            signal: AbortSignal.timeout(20000),
          }).catch((err) => {
            this.logger.warn(`Error al enviar lote de stock a Universal Bridge: ${String(err)}`);
            return null;
          });

          if (res && res.ok) {
            itemsUpdated += chunk.length;
          }
        }
        const pushStockDurationMs = Math.round(performance.now() - tPushStockStart);
        timings['pushStockMs'] = pushStockDurationMs;

        AgentDiskLogger.getInstance().log({
          level: 'SUCCESS',
          component: 'SyncEngine',
          action: 'push_channel_stock',
          duration_ms: pushStockDurationMs,
          status: 'SUCCESS',
          message: `Stock sincronizado en Universal Bridge: ${itemsUpdated} referencias actualizadas en ${pushStockDurationMs}ms`,
          metadata: { channel: 'universal_bridge', itemsUpdated },
        });
        this.eventBus.addEvent('info', `✓ Stock sincronizado con la web: ${itemsUpdated} referencias actualizadas.`);
      } else {
        AgentDiskLogger.getInstance().log({
          level: 'WARN',
          component: 'SyncEngine',
          action: 'query_factusol_stock',
          duration_ms: stockQueryDurationMs,
          status: 'FAILURE',
          message: `Consulta Factusol F_STO devolvió 0 registros o falló en ${stockQueryDurationMs}ms`,
          metadata: { warehouse },
        });
      }
    } catch (stockErr) {
      this.logger.warn(`Aviso en sincronización de stock con Universal Bridge: ${String(stockErr)}`);
    }

    // 2. Sincronización de pedidos (Universal Bridge -> Factusol)
    try {
      this.eventBus.addEvent('info', 'Comprobando pedidos nuevos en la tienda online...');
      const series = config.factusol?.orderSeries || 'W';
      const warehouse = config.factusol?.warehouseCode || 'GEN';

      let factusolConnector = this.factusolService.getConnector();
      if (!factusolConnector) {
        factusolConnector = new FactusolConnector();
        await factusolConnector.connect({
          configuration: {
            databasePath: dbPath,
            orderSeries: series,
            invoiceSeries: config.factusol?.invoiceSeries || '1',
            defaultWarehouse: warehouse,
            tariffCode: config.factusol?.tariffCode || '1',
            saleTariffCode: config.factusol?.saleTariffCode,
          },
        });
      }

      const MAX_PULL_BATCHES = 10;
      const seenOrderIds = new Set<number>();
      let batchCount = 0;
      let hasMoreBatches = true;
      let pullOrdersTotalMs = 0;
      let orderInsertTotalMs = 0;
      let ackOrdersTotalMs = 0;

      while (hasMoreBatches && batchCount < MAX_PULL_BATCHES) {
        batchCount++;
        const tPullBatchStart = performance.now();
        const pullRes = await fetch(`${endpointUrl}?action=pull_orders&limit=100`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(15000),
        }).catch((err) => {
          this.logger.warn(`Aviso al consultar pedidos en Universal Bridge: ${String(err)}`);
          return null;
        });
        pullOrdersTotalMs += Math.round(performance.now() - tPullBatchStart);

        if (!pullRes || !pullRes.ok) {
          break;
        }

        const pullJson = (await pullRes.json().catch(() => null)) as { success?: boolean; orders?: any[] } | null;
        const rawBatch = pullJson?.orders || [];
        const pendingOrders = rawBatch.filter((po) => po && po.id && !seenOrderIds.has(Number(po.id)));

        if (pendingOrders.length === 0) {
          hasMoreBatches = false;
          break;
        }

        const confirmations: Array<{
          id: number;
          orderId: number;
          webOrderId: number;
          factusolOrderNumber: number;
          factusolSeries: string;
        }> = [];

        for (const po of pendingOrders) {
          const numId = Number(po.id);
          seenOrderIds.add(numId);
          try {
            const canonicalOrder = OrderSyncHelper.universalBridgeToCanonical(po, series, warehouse);
            const tInsertOrderStart = performance.now();
            const mutRes = await factusolConnector.createOrder(canonicalOrder);
            const insertDurationMs = Math.round(performance.now() - tInsertOrderStart);
            orderInsertTotalMs += insertDurationMs;

            if (mutRes.success) {
              ordersImported++;
              const factNum = Number(mutRes.externalId || mutRes.orderNumber) || 0;
              confirmations.push({
                id: numId,
                orderId: numId,
                webOrderId: numId,
                factusolOrderNumber: factNum,
                factusolSeries: series,
              });

              AgentDiskLogger.getInstance().log({
                level: 'SUCCESS',
                component: 'SyncEngine',
                action: 'insert_factusol_order',
                duration_ms: insertDurationMs,
                status: 'SUCCESS',
                message: `Pedido ${canonicalOrder.reference} registrado en Factusol en ${insertDurationMs}ms (Nº ${factNum || mutRes.externalId})`,
                metadata: {
                  channel: 'universal_bridge',
                  orderId: numId,
                  factusolOrderNumber: factNum,
                  series,
                },
              });
              this.eventBus.addEvent('success', `✓ Pedido ${canonicalOrder.reference} registrado en Factusol (Nº ${factNum || mutRes.externalId}).`);
            } else {
              AgentDiskLogger.getInstance().log({
                level: 'ERROR',
                component: 'SyncEngine',
                action: 'insert_factusol_order',
                duration_ms: insertDurationMs,
                status: 'FAILURE',
                message: `No se pudo registrar pedido web #${numId} (${po.order_number}) en Factusol tras ${insertDurationMs}ms: ${mutRes.error}`,
                metadata: {
                  channel: 'universal_bridge',
                  orderId: numId,
                  series,
                  error: mutRes.error,
                },
              });
              this.logger.warn(`No se pudo registrar pedido web #${numId} (${po.order_number}) en Factusol: ${mutRes.error}`);
            }
          } catch (ordErr) {
            this.logger.error(`Error al procesar pedido web #${numId}:`, ordErr);
          }
        }

        if (confirmations.length > 0) {
          const tAckStart = performance.now();
          await fetch(`${endpointUrl}?action=ack_orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ confirmations }),
            signal: AbortSignal.timeout(15000),
          }).catch((err) => {
            this.logger.warn(`Aviso al confirmar pedidos en Universal Bridge: ${String(err)}`);
          });
          const ackDurationMs = Math.round(performance.now() - tAckStart);
          ackOrdersTotalMs += ackDurationMs;

          AgentDiskLogger.getInstance().log({
            level: 'SUCCESS',
            component: 'SyncEngine',
            action: 'ack_channel_orders',
            duration_ms: ackDurationMs,
            status: 'SUCCESS',
            message: `Confirmación ACK de ${confirmations.length} pedidos en Universal Bridge en ${ackDurationMs}ms`,
            metadata: { confirmedCount: confirmations.length },
          });
        }

        if (rawBatch.length < 100 || confirmations.length === 0) {
          hasMoreBatches = false;
        }
      }

      timings['pullOrdersMs'] = pullOrdersTotalMs;
      timings['orderInsertMs'] = orderInsertTotalMs;
      timings['ackOrdersMs'] = ackOrdersTotalMs;
    } catch (orderErr) {
      this.logger.warn(`Aviso en sincronización de pedidos con Universal Bridge: ${String(orderErr)}`);
    }

    // 3. Sincronización inversa de pedidos cancelados (Universal Bridge -> Factusol)
    let ordersCancelled = 0;
    try {
      this.eventBus.addEvent('info', 'Comprobando pedidos cancelados en la tienda online...');
      const tCancelStart = performance.now();
      const cancelRes = await CancellationSyncHelper.syncUniversalBridgeCancellations({
        endpointUrl,
        headers,
        driver,
        orderSeries: config.factusol?.orderSeries || '1',
        defaultWarehouse: config.factusol?.warehouseCode || 'GEN',
        eventBus: this.eventBus,
      });
      ordersCancelled = cancelRes.ordersCancelled;
      const cancelDurationMs = Math.round(performance.now() - tCancelStart);
      timings['cancellationsMs'] = cancelDurationMs;

      if (ordersCancelled > 0) {
        AgentDiskLogger.getInstance().log({
          level: 'SUCCESS',
          component: 'SyncEngine',
          action: 'sync_cancellations',
          duration_ms: cancelDurationMs,
          status: 'SUCCESS',
          message: `Stock repuesto en Factusol para ${ordersCancelled} pedidos cancelados de Universal Bridge en ${cancelDurationMs}ms`,
          metadata: { channel: 'universal_bridge', ordersCancelled },
        });
      }
    } catch (cancelErr) {
      this.logger.warn(`Aviso en sincronización inversa de cancelaciones con Universal Bridge: ${String(cancelErr)}`);
    }

    const cycleDurationMs = Date.now() - start;
    const duration = (cycleDurationMs / 1000).toFixed(1);
    const cancelMsg = ordersCancelled > 0 ? `, ${ordersCancelled} pedidos cancelados/repuestos` : '';
    const summary = `Sincronización completada en ${duration}s: ${itemsUpdated} stock actualizado, ${ordersImported} pedidos importados${cancelMsg}.`;

    this.historyManager.addSyncHistoryRecord({
      type: 'manual',
      mode: 'full',
      status: 'success',
      durationSeconds: parseFloat(duration),
      itemsUpdated,
      ordersImported,
      message: summary,
    });

    this.eventBus.addEvent('success', `✓ ${summary}`);
    AgentDiskLogger.getInstance().log({
      level: 'SUCCESS',
      component: 'SyncEngine',
      action: 'sync_cycle_complete',
      duration_ms: cycleDurationMs,
      status: 'SUCCESS',
      message: `Ciclo completo de sincronización Universal Bridge finalizado en ${cycleDurationMs}ms`,
      metadata: {
        channel: 'universal_bridge',
        itemsUpdated,
        ordersImported,
        ordersCancelled,
        timings,
      },
    });
    return { success: true, message: summary };
  }

  private async uploadUniversalBridgeCatalog(
    dbPath: string,
    config: any,
    options?: { limit?: number; onlyMissing?: boolean }
  ): Promise<CatalogUploadResult> {
    return CatalogUploadHelper.uploadUniversalBridgeCatalog(
      {
        configManager: this.configManager,
        factusolService: this.factusolService,
        historyManager: this.historyManager,
        eventBus: this.eventBus,
        logger: this.logger,
        resolveBridgeEndpoint: (url) => this.resolveBridgeEndpoint(url),
        getBridgeHeaders: (key) => this.getBridgeHeaders(key),
      },
      dbPath,
      config,
      options
    );
  }
}
