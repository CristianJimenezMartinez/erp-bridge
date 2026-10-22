import fs from 'fs';
import { Logger } from '@erp-bridge/shared';
import { AccessDriver, FactusolYearResolver } from '@erp-bridge/connector-factusol';
import { ConfigManager } from '../config/config.manager';
import { HistoryManager } from '../history/history.manager';
import { EventBus } from '../diagnostics/event-bus';
import { AgentDiskLogger } from '../diagnostics/disk-logger';
import { FactusolService } from '../factusol/factusol.service';
import { IErpConnector, ErpProviderRegistry } from '../erp';
import { SyncManualResult, CatalogUploadResult } from './sync.types';
import { OrderSyncHelper } from './order-sync.helper';
import { CancellationSyncHelper } from './cancellation-sync.helper';
import { CatalogUploadHelper } from './catalog-upload.helper';
import { ProgressiveCatalogHelper, ProgressiveCatalogContext } from './progressive-catalog.helper';
import { OrderNotifierService } from '../notifications/order-notifier.service';
import { SalesLedgerManager } from '../orders/sales-ledger.manager';
import { OrderPlausibilityAdapter } from '../adapters/order-plausibility.adapter';
import { ShopifySyncHelper } from './shopify-sync.helper';
import { PrestashopSyncHelper } from './prestashop-sync.helper';

export class LocalSyncEngine {
  private readonly logger = new Logger('LocalSyncEngine');
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private lastUniversalBridgeStock: Map<string, number> = new Map();

  constructor(
    private readonly configManager: ConfigManager,
    private readonly factusolService: FactusolService,
    private readonly historyManager: HistoryManager,
    private readonly eventBus: EventBus,
    private readonly licenseCheckFn?: () => { status: string; plan?: string },
    private readonly salesLedgerManager?: SalesLedgerManager,
    private readonly erpRegistry?: ErpProviderRegistry
  ) {}

  public getActiveErpConnector(): IErpConnector {
    if (this.erpRegistry) {
      return this.erpRegistry.getActiveConnector();
    }
    const cfg = this.configManager.get();
    const active = cfg.softwareErp?.activeProvider || cfg.erpType || 'factusol';
    if (active === 'simplygest') {
      const { SimplyGestService } = require('../simplygest/simplygest.service');
      const { SimplyGestAdapter } = require('../erp/adapters/simplygest.adapter');
      const sgService = new SimplyGestService(this.configManager, this.eventBus);
      return new SimplyGestAdapter(this.configManager, sgService, this.eventBus);
    }
    const { FactusolAdapter } = require('../erp/adapters/factusol.adapter');
    return new FactusolAdapter(this.configManager, this.factusolService, this.eventBus);
  }

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

  public async triggerManualSync(isManual: boolean = true): Promise<SyncManualResult> {
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
      return await this.executeManualSync(start, isManual);
    } finally {
      this.isSyncing = false;
    }
  }

  private async executeManualSync(start: number, isManual: boolean = true): Promise<SyncManualResult> {
    if (isManual) {
      this.eventBus.addEvent('info', 'Iniciando ciclo de sincronización bidireccional...');
    } else {
      this.logger.debug('Iniciando sondeo rutinario de sincronización bidireccional...');
    }
    let itemsUpdated = 0;
    let ordersImported = 0;
    let ordersCancelled = 0;

    const config = this.configManager.get();
    const erpConnector = this.getActiveErpConnector();
    const erpDisplayName = erpConnector.displayName;
    const isFactusol = erpConnector.providerId === 'factusol';
    let dbPath = erpConnector.getDatabasePath();
    const woo = config.woocommerce || {};

    // Comprobación y resolución de Rollover Fiscal Automático de Factusol
    if (isFactusol && dbPath && fs.existsSync(dbPath)) {
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

    const isRealFactusolFile = isFactusol && Boolean(dbPath && fs.existsSync(dbPath));
    const isErpAccessible = Boolean(dbPath && (isRealFactusolFile || erpConnector.isDatabaseAccessible()));

    if (isUniversalBridge) {
      if (!isErpAccessible) {
        const msg = `Base de datos de ${erpDisplayName} no configurada o inaccesible (${dbPath || 'Sin ruta'}).`;
        this.eventBus.addEvent('error', `❌ ${msg}`);
        return { success: false, message: msg };
      }
      return this.syncUniversalBridge(dbPath, config, start, isManual, erpConnector);
    }

    const isShopify =
      config.channelType === 'shopify' ||
      (Boolean(config.shopify?.shopSubdomain) && !woo.storeUrl);

    if (isShopify) {
      if (!isErpAccessible) {
        const msg = `Base de datos de ${erpDisplayName} no configurada o inaccesible (${dbPath || 'Sin ruta'}).`;
        this.eventBus.addEvent('error', `❌ ${msg}`);
        return { success: false, message: msg };
      }
      return this.syncShopify(dbPath, config, start, isManual, erpConnector);
    }

    const isPrestashop =
      config.channelType === 'prestashop' ||
      (Boolean(config.prestashop?.storeUrl) && !woo.storeUrl);

    if (isPrestashop) {
      if (!isErpAccessible) {
        const msg = `Base de datos de ${erpDisplayName} no configurada o inaccesible (${dbPath || 'Sin ruta'}).`;
        this.eventBus.addEvent('error', `❌ ${msg}`);
        return { success: false, message: msg };
      }
      return this.syncPrestashop(dbPath, config, start, isManual, erpConnector);
    }

    try {
      if (isErpAccessible && woo.storeUrl && woo.consumerKey && woo.consumerSecret) {
        const cleanUrl = woo.storeUrl.trim().replace(/\/+$/, '');
        const authHeader = 'Basic ' + Buffer.from(`${woo.consumerKey.trim()}:${woo.consumerSecret.trim()}`).toString('base64');
        const driver = isRealFactusolFile ? new AccessDriver({ databasePath: dbPath }) : null;
        const timings: Record<string, number> = {};
        let knownWcSkus: Set<string> | undefined;

        // 1. SINCRONIZACIÓN DE STOCK (ERP -> WooCommerce)
        try {
          const tStockQueryStart = performance.now();
          const warehouse = (
            config.softwareErp?.providers?.[erpConnector.providerId]?.warehouseCode ||
            (erpConnector.providerId === 'simplygest' ? config.simplygest?.warehouseCode : config.factusol?.warehouseCode) ||
            'GEN'
          ).replace(/'/g, "''").trim();

          let stockMap: Map<string, number>;
          try {
            stockMap = await erpConnector.getStockMap(warehouse);
          } catch (err) {
            this.logger.warn(`Error al consultar stock en ${erpDisplayName}: ${String(err)}`);
            stockMap = new Map();
          }
          const stockQueryDurationMs = Math.round(performance.now() - tStockQueryStart);
          timings['queryErpStockMs'] = stockQueryDurationMs;

          if (!stockMap || stockMap.size === 0) {
            AgentDiskLogger.getInstance().log({
              level: 'WARN', component: 'SyncEngine', action: 'query_erp_stock', duration_ms: stockQueryDurationMs, status: 'FAILURE',
              message: `Consulta de stock en ${erpDisplayName} devolvió 0 registros o falló en ${stockQueryDurationMs}ms`, metadata: { warehouse },
            });
            this.logger.warn(`La consulta de stock en ${erpDisplayName} devolvió 0 registros o falló. Se aborta la sincronización de stock preventivamente para evitar vaciado en WooCommerce.`);
            this.eventBus.addEvent('warn', `Lectura de stock en ${erpDisplayName} inaccesible. Sincronización de stock omitida preventivamente.`);
          } else {
            AgentDiskLogger.getInstance().log({
              level: 'SUCCESS', component: 'SyncEngine', action: 'query_erp_stock', duration_ms: stockQueryDurationMs, status: 'SUCCESS',
              message: `Consulta de stock en ${erpDisplayName} completada (${stockMap.size} referencias) en ${stockQueryDurationMs}ms`, metadata: { warehouse, count: stockMap.size },
            });

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
            knownWcSkus = new Set(allWcProducts.map((p) => (p.sku || '').trim().toUpperCase()).filter(Boolean));

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

        // 2. SINCRONIZACIÓN DE PEDIDOS (WooCommerce -> ERP)
        try {
          const series = (
            config.softwareErp?.providers?.[erpConnector.providerId]?.orderSeries ||
            (erpConnector.providerId === 'simplygest' ? config.simplygest?.orderSeries : config.factusol?.orderSeries) ||
            '1'
          );
          const warehouse = (
            config.softwareErp?.providers?.[erpConnector.providerId]?.warehouseCode ||
            (erpConnector.providerId === 'simplygest' ? config.simplygest?.warehouseCode : config.factusol?.warehouseCode) ||
            'GEN'
          );

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
              const plausibility = OrderPlausibilityAdapter.validateAndSanitize(canonicalOrder);
              if (!plausibility.valid || !plausibility.sanitizedOrder) {
                this.logger.warn(`Pedido #${wcOrder.id} de WooCommerce rechazado por validación de seguridad: ${plausibility.error}`);
                this.recordSalesOrder(
                  'woocommerce', String(wcOrder.id), String(wcOrder.number || wcOrder.id),
                  wcOrder.date_created, series, canonicalOrder, 'failed', undefined, plausibility.error,
                  parseFloat(String(wcOrder.total || 0)), wcOrder.currency,
                  wcOrder.payment_method_title
                );
                continue;
              }
              const safeOrder = plausibility.sanitizedOrder;
              const tInsertOrder = performance.now();
              const orderRes = await erpConnector.createOrder(safeOrder, series, warehouse);
              const insertDurationMs = Math.round(performance.now() - tInsertOrder);
              orderInsertTotalMs += insertDurationMs;

              if (orderRes.success) {
                const assignedNum = String(orderRes.externalId || orderRes.orderNumber || wcOrder.id);
                // Marcar en WooCommerce con metadato de importación Factusol/ERP
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
                this.recordSalesOrder(
                  'woocommerce', String(wcOrder.id), String(wcOrder.number || wcOrder.id),
                  wcOrder.date_created, series, canonicalOrder, 'synced', assignedNum, undefined,
                  parseFloat(String(wcOrder.total || canonicalOrder.totalAmount || 0)), wcOrder.currency,
                  canonicalOrder.paymentMethod || wcOrder.payment_method_title
                );
                AgentDiskLogger.getInstance().log({
                  level: 'SUCCESS', component: 'SyncEngine', action: 'insert_erp_order', duration_ms: insertDurationMs, status: 'SUCCESS',
                  message: `Pedido #${wcOrder.id} procesado en ${erpDisplayName} en ${insertDurationMs}ms (Serie ${series}, Pedido #${assignedNum})`,
                  metadata: { channel: 'woocommerce', wcOrderId: wcOrder.id, orderNumber: assignedNum, series },
                });
                this.eventBus.addEvent('success', `✓ Pedido #${wcOrder.id} procesado en ${erpDisplayName} (Serie ${series}, Pedido #${assignedNum})`);

                // Despachar alerta por correo (asíncrono sin bloquear ciclo de sync)
                OrderNotifierService.notifyNewOrder({
                  order: canonicalOrder,
                  channel: 'woocommerce',
                  factusolOrderNumber: assignedNum,
                  series,
                  config: this.configManager.get(),
                }).catch((err) => {
                  this.logger.warn(`Aviso al despachar email de pedido #${wcOrder.id}: ${String(err)}`);
                });
              } else {
                this.recordSalesOrder(
                  'woocommerce', String(wcOrder.id), String(wcOrder.number || wcOrder.id),
                  wcOrder.date_created, series, canonicalOrder, 'failed', undefined,
                  orderRes.error || `No se pudo importar pedido a ${erpDisplayName}`,
                  parseFloat(String(wcOrder.total || canonicalOrder.totalAmount || 0)), wcOrder.currency,
                  canonicalOrder.paymentMethod || wcOrder.payment_method_title
                );
                AgentDiskLogger.getInstance().log({
                  level: 'ERROR', component: 'SyncEngine', action: 'insert_erp_order', duration_ms: insertDurationMs, status: 'FAILURE',
                  message: `No se pudo importar pedido #${wcOrder.id} a ${erpDisplayName} tras ${insertDurationMs}ms: ${orderRes.error}`,
                  metadata: { channel: 'woocommerce', wcOrderId: wcOrder.id, series, error: orderRes.error },
                });
                this.logger.warn(`No se pudo importar pedido #${wcOrder.id} a ${erpDisplayName}: ${orderRes.error}`);
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
        if (isRealFactusolFile && driver) {
          try {
            const cancelSeries = config.factusol?.orderSeries || '1';
            const cancelWarehouse = config.factusol?.warehouseCode || 'GEN';
            this.logger.debug('Comprobando pedidos cancelados/reembolsados en WooCommerce...');
            const tCancelStart = performance.now();
            const cancelRes = await CancellationSyncHelper.syncWooCommerceCancellations({
              storeUrl: cleanUrl,
              authHeader,
              driver,
              orderSeries: cancelSeries,
              defaultWarehouse: cancelWarehouse,
              eventBus: this.eventBus,
            });
            ordersCancelled = cancelRes.ordersCancelled;
            const cancelDurationMs = Math.round(performance.now() - tCancelStart);
            timings['cancellationsMs'] = cancelDurationMs;

            if (cancelRes.ordersCancelled > 0) {
              AgentDiskLogger.getInstance().log({
                level: 'SUCCESS', component: 'SyncEngine', action: 'sync_cancellations', duration_ms: cancelDurationMs, status: 'SUCCESS',
                message: `Stock repuesto en Factusol para ${cancelRes.ordersCancelled} pedidos cancelados/reembolsados de WooCommerce en ${cancelDurationMs}ms`,
                metadata: { channel: 'woocommerce', ordersCancelled: cancelRes.ordersCancelled },
              });
              this.eventBus.addEvent('success', `✓ Stock repuesto en Factusol para ${cancelRes.ordersCancelled} pedidos cancelados/reembolsados de WooCommerce.`);
            }
          } catch (cancelErr) {
            this.logger.warn(`Aviso en sincronización inversa de cancelaciones de WooCommerce: ${String(cancelErr)}`);
          }
        }

        // 4. Subida Progresiva de Catálogo (Factusol -> WooCommerce)
        if (isRealFactusolFile) {
          try {
            await ProgressiveCatalogHelper.processProgressiveUpload(
              this.createProgressiveContext(),
              { channel: 'woocommerce', dbPath, knownExistingSkus: knownWcSkus }
            );
          } catch (catErr) {
            this.logger.warn(`Aviso en subida progresiva de catálogo (WooCommerce): ${String(catErr)}`);
          }
        }
      } else if (config.channelType === 'woocommerce' && !woo.storeUrl) {
        if (isManual) {
          const msg = 'Dirección de la tienda WooCommerce no configurada.';
          this.eventBus.addEvent('warn', msg);
          return { success: false, message: msg };
        }
      } else {
        // Modo Standalone sin WooCommerce configurado
        if (isErpAccessible) {
          const count = await erpConnector.getArticleCount();
          if (count) itemsUpdated = Math.min(count, 50);
        }
      }

      const cycleDurationMs = Date.now() - start;
      const duration = (cycleDurationMs / 1000).toFixed(1);
      if (isManual || ordersImported > 0 || ordersCancelled > 0) {
        this.historyManager.addSyncHistoryRecord({
          type: isManual ? 'manual' : 'periodic',
          mode: 'full',
          status: 'success',
          durationSeconds: parseFloat(duration),
          itemsUpdated,
          ordersImported,
          message: `Sincronización completada: ${itemsUpdated} artículos actualizados, ${ordersImported} pedidos importados.`,
        });
      }

      const summary = `Sincronización completada (${itemsUpdated} productos, ${ordersImported} pedidos en ${duration}s)`;
      const hasActivity = itemsUpdated > 0 || ordersImported > 0;
      if (isManual || hasActivity) {
        this.eventBus.addEvent('success', `✓ ${summary}`);
      } else {
        this.logger.debug(`Sondeo rutinario completado sin novedades: ${summary}`);
      }
      AgentDiskLogger.getInstance().log({
        level: 'SUCCESS', component: 'SyncEngine', action: 'sync_cycle_complete', duration_ms: cycleDurationMs, status: 'SUCCESS',
        message: `Ciclo completo de sincronización WooCommerce finalizado en ${cycleDurationMs}ms`,
        metadata: { channel: 'woocommerce', itemsUpdated, ordersImported },
      });
      return { success: true, message: summary };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.historyManager.addSyncHistoryRecord({
        type: isManual ? 'manual' : 'periodic',
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
      const erpConnector = this.getActiveErpConnector();
      const dbPath = erpConnector.getDatabasePath();
      const woo = config.woocommerce;
      const isBridge =
        config.channelType === 'universal_bridge' ||
        (Boolean(config.universalBridge?.storeUrl) && !woo?.storeUrl);
      const isWoo = Boolean(
        woo?.storeUrl && woo?.consumerKey && woo?.consumerSecret
      );
      const isShopify =
        config.channelType === 'shopify' ||
        (Boolean(config.shopify?.shopSubdomain) && !woo?.storeUrl);
      const isPrestashop =
        config.channelType === 'prestashop' ||
        (Boolean(config.prestashop?.storeUrl) && !woo?.storeUrl);

      const isErpAccessible = Boolean(dbPath && (erpConnector.isDatabaseAccessible() || fs.existsSync(dbPath)));
      if (!isErpAccessible || (!isBridge && !isWoo && !isShopify && !isPrestashop)) {
        return;
      }

      try {
        await this.triggerManualSync(false);
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
          erpConnector: this.getActiveErpConnector(),
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
    start: number,
    isManual: boolean = true,
    erpConnector?: IErpConnector
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

    const connector = erpConnector || this.getActiveErpConnector();
    const erpDisplayName = connector.displayName;
    const isFactusol = connector.providerId === 'factusol';
    const warehouse = (
      config.softwareErp?.providers?.[connector.providerId]?.warehouseCode ||
      (connector.providerId === 'simplygest' ? config.simplygest?.warehouseCode : config.factusol?.warehouseCode) ||
      'GEN'
    ).replace(/'/g, "''").trim();
    const series = (
      config.softwareErp?.providers?.[connector.providerId]?.orderSeries ||
      (connector.providerId === 'simplygest' ? config.simplygest?.orderSeries : config.factusol?.orderSeries) ||
      'W'
    ).trim();

    try {
      const endpointUrl = this.resolveBridgeEndpoint(bridgeSettings.storeUrl);
      const secretKey = bridgeSettings.secretKey;
      const headers = this.getBridgeHeaders(secretKey);

      // 1. Sincronización de existencias de stock (ERP -> Universal Bridge)
      try {
        this.logger.debug(`Consultando existencias de stock en ${erpDisplayName}...`);
        const tStockQueryStart = performance.now();

        let stockMap: Map<string, number>;
        try {
          stockMap = await connector.getStockMap(warehouse);
        } catch (err) {
          this.logger.warn(`Error al consultar stock en ${erpDisplayName}: ${String(err)}`);
          stockMap = new Map();
        }

        const stockQueryDurationMs = Math.round(performance.now() - tStockQueryStart);
        timings['queryErpStockMs'] = stockQueryDurationMs;

        if (stockMap && stockMap.size > 0) {
          AgentDiskLogger.getInstance().log({
            level: 'SUCCESS',
            component: 'SyncEngine',
            action: 'query_erp_stock',
            duration_ms: stockQueryDurationMs,
            status: 'SUCCESS',
            message: `Consulta ${erpDisplayName} completada (${stockMap.size} referencias) en ${stockQueryDurationMs}ms`,
            metadata: { warehouse, count: stockMap.size },
          });

          const stockUpdates = Array.from(stockMap.entries()).map(([code, stock]) => ({
            code,
            stock: Math.max(0, Math.round(stock)),
          })).filter((u) => u.code);

          // Dirty-checking en existencias para Universal Bridge:
          // Si las existencias no han cambiado, no envía paquetes repetitivos ni marca itemsUpdated cada 30 segundos
          const changedStockUpdates = stockUpdates.filter((u) => {
            const lastStock = this.lastUniversalBridgeStock.get(u.code);
            return lastStock === undefined || lastStock !== u.stock;
          });

          const tPushStockStart = performance.now();
          if (changedStockUpdates.length > 0) {
            const STOCK_BATCH = 500;
            for (let i = 0; i < changedStockUpdates.length; i += STOCK_BATCH) {
              const chunk = changedStockUpdates.slice(i, i + STOCK_BATCH);
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
                for (const u of chunk) {
                  this.lastUniversalBridgeStock.set(u.code, u.stock);
                }
              }
            }
            const pushStockDurationMs = Math.round(performance.now() - tPushStockStart);
            timings['pushStockMs'] = pushStockDurationMs;

            AgentDiskLogger.getInstance().log({
              level: 'SUCCESS', component: 'SyncEngine', action: 'push_channel_stock', duration_ms: pushStockDurationMs, status: 'SUCCESS',
              message: `Stock sincronizado en Universal Bridge: ${itemsUpdated} referencias actualizadas en ${pushStockDurationMs}ms (dirty-check)`,
              metadata: { channel: 'universal_bridge', itemsUpdated },
            });
            if (itemsUpdated > 0) {
              this.eventBus.addEvent('info', `✓ Stock sincronizado con la web: ${itemsUpdated} referencias actualizadas.`);
            }
          } else {
            const pushStockDurationMs = Math.round(performance.now() - tPushStockStart);
            timings['pushStockMs'] = pushStockDurationMs;
            AgentDiskLogger.getInstance().log({
              level: 'INFO', component: 'SyncEngine', action: 'push_channel_stock', duration_ms: pushStockDurationMs, status: 'SKIPPED',
              message: `Dirty-check Universal Bridge: existencias al día en ${erpDisplayName} (0 modificaciones necesarias)`,
              metadata: { channel: 'universal_bridge', totalTracked: this.lastUniversalBridgeStock.size },
            });
            this.logger.debug(`Dirty-check: existencias de Universal Bridge al día en ${erpDisplayName}.`);
          }
        } else {
          AgentDiskLogger.getInstance().log({
            level: 'WARN', component: 'SyncEngine', action: 'query_erp_stock', duration_ms: stockQueryDurationMs, status: 'FAILURE',
            message: `Consulta de stock en ${erpDisplayName} devolvió 0 registros o falló en ${stockQueryDurationMs}ms`, metadata: { warehouse },
          });
          if (stockMap === null || stockMap === undefined) {
            this.eventBus.addEvent('warn', `⚠️ Base de datos ${erpDisplayName} no accesible o fallo al consultar existencias.`);
          }
        }
      } catch (stockErr) {
        this.logger.warn(`Aviso en sincronización de stock con Universal Bridge: ${String(stockErr)}`);
      }

      // 2. Sincronización de pedidos (Universal Bridge -> ERP)
      try {
        this.logger.debug('Comprobando pedidos nuevos en la tienda online...');

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
              const plausibility = OrderPlausibilityAdapter.validateAndSanitize(canonicalOrder);
              if (!plausibility.valid || !plausibility.sanitizedOrder) {
                this.logger.warn(`Pedido #${numId} de Universal Bridge rechazado por validación de seguridad: ${plausibility.error}`);
                this.recordSalesOrder(
                  'universal_bridge', String(po.id), String(po.order_number || po.id),
                  po.created_at || po.date || '', series, canonicalOrder, 'failed', undefined,
                  plausibility.error, parseFloat(String(po.total || po.total_amount || 0)), po.currency,
                  po.payment_method
                );
                continue;
              }
              const safeOrder = plausibility.sanitizedOrder;
              const tInsertOrderStart = performance.now();
              const mutRes = await connector.createOrder(safeOrder, series, warehouse);
              const insertDurationMs = Math.round(performance.now() - tInsertOrderStart);
              orderInsertTotalMs += insertDurationMs;

              if (mutRes.success) {
                ordersImported++;
                const assignedNum = Number(mutRes.externalId || mutRes.orderNumber) || 0;
                confirmations.push({
                  id: numId,
                  orderId: numId,
                  webOrderId: numId,
                  factusolOrderNumber: assignedNum,
                  factusolSeries: series,
                });

                this.recordSalesOrder(
                  'universal_bridge', String(po.id), String(po.order_number || canonicalOrder.orderNumber || po.id),
                  po.created_at || po.date || (canonicalOrder.date instanceof Date ? canonicalOrder.date.toISOString() : ''),
                  series, canonicalOrder, 'synced', String(assignedNum || mutRes.externalId), undefined,
                  parseFloat(String(canonicalOrder.totalAmount || po.total || po.total_amount || 0)), po.currency,
                  canonicalOrder.paymentMethod || po.payment_method
                );

                AgentDiskLogger.getInstance().log({
                  level: 'SUCCESS', component: 'SyncEngine', action: 'insert_erp_order', duration_ms: insertDurationMs, status: 'SUCCESS',
                  message: `Pedido ${canonicalOrder.reference} registrado en ${erpDisplayName} en ${insertDurationMs}ms (Nº ${assignedNum || mutRes.externalId})`,
                  metadata: { channel: 'universal_bridge', orderId: numId, orderNumber: assignedNum, series },
                });
                this.eventBus.addEvent('success', `✓ Pedido ${canonicalOrder.reference} registrado en ${erpDisplayName} (Nº ${assignedNum || mutRes.externalId}).`);

                // Despachar alerta por correo (asíncrono sin bloquear ciclo de sync)
                OrderNotifierService.notifyNewOrder({
                  order: canonicalOrder,
                  channel: 'universal_bridge',
                  factusolOrderNumber: assignedNum || mutRes.externalId || 0,
                  series,
                  config: this.configManager.get(),
                }).catch((err) => {
                  this.logger.warn(`Aviso al despachar email de pedido ${canonicalOrder.reference}: ${String(err)}`);
                });
              } else {
                this.recordSalesOrder(
                  'universal_bridge', String(po.id), String(po.order_number || canonicalOrder.orderNumber || po.id),
                  po.created_at || po.date || (canonicalOrder.date instanceof Date ? canonicalOrder.date.toISOString() : ''),
                  series, canonicalOrder, 'failed', undefined, mutRes.error || `No se pudo registrar pedido en ${erpDisplayName}`,
                  parseFloat(String(canonicalOrder.totalAmount || po.total || po.total_amount || 0)), po.currency,
                  canonicalOrder.paymentMethod || po.payment_method
                );

                AgentDiskLogger.getInstance().log({
                  level: 'ERROR', component: 'SyncEngine', action: 'insert_erp_order', duration_ms: insertDurationMs, status: 'FAILURE',
                  message: `No se pudo registrar pedido web #${numId} (${po.order_number}) en ${erpDisplayName} tras ${insertDurationMs}ms: ${mutRes.error}`,
                  metadata: { channel: 'universal_bridge', orderId: numId, series, error: mutRes.error },
                });
                this.logger.warn(`No se pudo registrar pedido web #${numId} (${po.order_number}) en ${erpDisplayName}: ${mutRes.error}`);
              }
            } catch (ordErr) {
              this.logger.error(`Error al procesar pedido web #${numId}:`, ordErr);
              if (this.salesLedgerManager && po) {
                try {
                  this.salesLedgerManager.recordOrder({
                    channel: 'universal_bridge',
                    webOrderId: String(po.id || numId),
                    orderNumber: String(po.order_number || numId),
                    date: po.created_at || po.date || new Date().toISOString(),
                    customerName: po.customer?.fullName || po.customer?.name || 'Cliente Web',
                    totalAmount: parseFloat(String(po.total || po.total_amount || 0)),
                    currency: po.currency || 'EUR',
                    status: 'failed',
                    error: ordErr instanceof Error ? ordErr.message : String(ordErr),
                    lines: [],
                  });
                } catch {}
              }
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
      const isRealFactusolFile = isFactusol && Boolean(dbPath && fs.existsSync(dbPath));
      let ordersCancelled = 0;
      if (isRealFactusolFile) {
        try {
          this.logger.debug('Comprobando pedidos cancelados en la tienda online...');
          const tCancelStart = performance.now();
          const cancelDriver = new AccessDriver({ databasePath: dbPath });
          const cancelRes = await CancellationSyncHelper.syncUniversalBridgeCancellations({
            endpointUrl,
            headers,
            driver: cancelDriver,
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
      }

      // 4. Subida Progresiva de Catálogo (Universal Bridge)
      if (isRealFactusolFile) {
        try {
          await ProgressiveCatalogHelper.processProgressiveUpload(
            this.createProgressiveContext(),
            { channel: 'universal_bridge', dbPath }
          );
        } catch (catErr) {
          this.logger.warn(`Aviso en subida progresiva de catálogo (Universal Bridge): ${String(catErr)}`);
        }
      }

    const cycleDurationMs = Date.now() - start;
    const duration = (cycleDurationMs / 1000).toFixed(1);
    const cancelMsg = ordersCancelled > 0 ? `, ${ordersCancelled} pedidos cancelados/repuestos` : '';
    const summary = `Sincronización completada en ${duration}s: ${itemsUpdated} stock actualizado, ${ordersImported} pedidos importados${cancelMsg}.`;

    if (isManual || ordersImported > 0 || ordersCancelled > 0) {
      this.historyManager.addSyncHistoryRecord({
        type: isManual ? 'manual' : 'periodic', mode: 'full', status: 'success',
        durationSeconds: parseFloat(duration), itemsUpdated, ordersImported, message: summary,
      });
    }

    const hasActivity = itemsUpdated > 0 || ordersImported > 0 || ordersCancelled > 0;
    if (isManual || hasActivity) {
      this.eventBus.addEvent('success', `✓ ${summary}`);
    } else {
      this.logger.debug(`Sondeo rutinario completado sin novedades: ${summary}`);
    }
      AgentDiskLogger.getInstance().log({
        level: 'SUCCESS', component: 'SyncEngine', action: 'sync_cycle_complete', duration_ms: cycleDurationMs, status: 'SUCCESS',
        message: `Ciclo completo de sincronización Universal Bridge finalizado en ${cycleDurationMs}ms`,
        metadata: { channel: 'universal_bridge', itemsUpdated, ordersImported, ordersCancelled, timings },
      });
      return { success: true, message: summary };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const cycleDurationMs = Date.now() - start;
      const duration = (cycleDurationMs / 1000).toFixed(1);
      this.historyManager.addSyncHistoryRecord({
        type: isManual ? 'manual' : 'periodic', mode: 'full', status: 'error',
        durationSeconds: parseFloat(duration), itemsUpdated: 0, ordersImported: 0,
        message: `Fallo en sincronización Universal Bridge: ${msg}`,
      });
      this.eventBus.addEvent('warn', `Aviso en sincronización Universal Bridge: ${msg}`);
      return { success: false, message: `Sincronización finalizada con incidencias: ${msg}` };
    }
  }

  private async syncShopify(dbPath: string, config: any, start: number, isManual = true, erpConnector?: IErpConnector): Promise<SyncManualResult> {
    return this.runHelperChannelSync('shopify', 'Shopify', dbPath, config, start, isManual, erpConnector);
  }

  private async syncPrestashop(dbPath: string, config: any, start: number, isManual = true, erpConnector?: IErpConnector): Promise<SyncManualResult> {
    return this.runHelperChannelSync('prestashop', 'PrestaShop', dbPath, config, start, isManual, erpConnector);
  }

  private async runHelperChannelSync(
    channelKey: 'shopify' | 'prestashop',
    channelLabel: string,
    dbPath: string,
    config: any,
    start: number,
    isManual: boolean,
    erpConnector?: IErpConnector
  ): Promise<SyncManualResult> {
    try {
      const connector = erpConnector || this.getActiveErpConnector();
      const isRealFactusolFile = connector.providerId === 'factusol' && Boolean(dbPath && fs.existsSync(dbPath));
      const driver = isRealFactusolFile ? new AccessDriver({ databasePath: dbPath }) : (null as any);
      const warehouse = config.softwareErp?.providers?.[connector.providerId]?.warehouseCode ||
        (connector.providerId === 'simplygest' ? config.simplygest?.warehouseCode : config.factusol?.warehouseCode) || 'GEN';
      const series = config.softwareErp?.providers?.[connector.providerId]?.orderSeries ||
        (connector.providerId === 'simplygest' ? config.simplygest?.orderSeries : config.factusol?.orderSeries) || '1';
      const opts = { plausibilityAdapter: OrderPlausibilityAdapter, orderNotifier: OrderNotifierService, salesLedgerManager: this.salesLedgerManager, eventBus: this.eventBus, series, warehouse, erpConnector: connector };

      const stockRes = channelKey === 'shopify'
        ? await ShopifySyncHelper.syncStockToShopify(driver, config, warehouse, { erpConnector: connector })
        : await PrestashopSyncHelper.syncStockToPrestashop(driver, config, warehouse, { erpConnector: connector });
      const orderRes = channelKey === 'shopify'
        ? await ShopifySyncHelper.importShopifyOrders(driver, config, opts)
        : await PrestashopSyncHelper.importPrestashopOrders(driver, config, opts);

      const { itemsUpdated } = stockRes;
      const { ordersImported } = orderRes;
      const cycleDurationMs = Date.now() - start;
      const duration = (cycleDurationMs / 1000).toFixed(1);
      const summary = `✓ Sincronización completada con ${channelLabel} (${itemsUpdated} productos, ${ordersImported} pedidos)`;

      if (isManual || itemsUpdated > 0 || ordersImported > 0) {
        this.historyManager.addSyncHistoryRecord({ type: isManual ? 'manual' : 'periodic', mode: 'full', status: 'success', durationSeconds: parseFloat(duration), itemsUpdated, ordersImported, message: summary });
        this.eventBus.addEvent('success', summary);
      }
      AgentDiskLogger.getInstance().log({ level: 'SUCCESS', component: 'SyncEngine', action: 'sync_cycle_complete', duration_ms: cycleDurationMs, status: 'SUCCESS', message: `Ciclo completo de sincronización ${channelLabel} finalizado en ${cycleDurationMs}ms`, metadata: { channel: channelKey, itemsUpdated, ordersImported } });
      return { success: true, message: summary };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const duration = parseFloat(((Date.now() - start) / 1000).toFixed(1));
      this.historyManager.addSyncHistoryRecord({ type: isManual ? 'manual' : 'periodic', mode: 'full', status: 'error', durationSeconds: duration, itemsUpdated: 0, ordersImported: 0, message: `Fallo en sincronización ${channelLabel}: ${msg}` });
      this.eventBus.addEvent('warn', `Aviso en sincronización ${channelLabel}: ${msg}`);
      return { success: false, message: `Sincronización finalizada con incidencias: ${msg}` };
    }
  }

  private createProgressiveContext(): ProgressiveCatalogContext {
    return {
      configManager: this.configManager,
      factusolService: this.factusolService,
      eventBus: this.eventBus,
      logger: this.logger,
      resolveBridgeEndpoint: (url) => this.resolveBridgeEndpoint(url),
      getBridgeHeaders: (key) => this.getBridgeHeaders(key),
    };
  }

  private recordSalesOrder(
    channel: 'woocommerce' | 'universal_bridge' | 'shopify',
    webOrderId: string,
    orderNumber: string,
    date: string,
    series: string,
    canonicalOrder: any,
    status: 'synced' | 'pending' | 'failed',
    assignedNum?: string,
    error?: string,
    totalAmount?: number,
    currency?: string,
    paymentMethod?: string
  ): void {
    if (!this.salesLedgerManager) return;
    try {
      this.salesLedgerManager.recordOrder({
        channel: channel as any,
        webOrderId,

        orderNumber,
        date: date || new Date().toISOString(),
        factusolSeries: series,
        factusolOrderNumber: assignedNum,
        customerName: canonicalOrder.customer?.fiscalName || canonicalOrder.customer?.name || 'Cliente Web',
        customerEmail: canonicalOrder.customer?.email,
        customerPhone: canonicalOrder.customer?.phone,
        totalAmount: Number(totalAmount ?? canonicalOrder.totalAmount ?? 0),
        currency: currency || canonicalOrder.currency || 'EUR',
        status,
        error,
        lines: (canonicalOrder.lines || []).map((l: any) => ({
          sku: l.sku || '', name: l.name || '', quantity: Number(l.quantity) || 1, unitPrice: Number(l.unitPrice) || 0, total: Number(l.total) || 0,
        })),
        shippingAddress: [
          canonicalOrder.shippingAddress?.street, canonicalOrder.shippingAddress?.city,
          canonicalOrder.shippingAddress?.postalCode, canonicalOrder.shippingAddress?.state,
        ].filter(Boolean).join(', '),
        paymentMethod: paymentMethod || canonicalOrder.paymentMethod,
      });
    } catch (err) {
      this.logger.warn(`Aviso al registrar pedido en libro de ventas: ${String(err)}`);
    }
  }
}
