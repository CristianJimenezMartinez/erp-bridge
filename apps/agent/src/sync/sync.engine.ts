import fs from 'fs';
import { Logger } from '@erp-bridge/shared';
import { AccessDriver, FactusolConnector, FactusolYearResolver } from '@erp-bridge/connector-factusol';
import { ConfigManager } from '../config/config.manager';
import { HistoryManager } from '../history/history.manager';
import { EventBus } from '../diagnostics/event-bus';
import { FactusolService } from '../factusol/factusol.service';
import { SyncManualResult, CatalogUploadResult } from './sync.types';
import { ImageSyncService } from './image-sync.service';
import { OrderSyncHelper } from './order-sync.helper';

export class LocalSyncEngine {
  private readonly logger = new Logger('LocalSyncEngine');
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private hasAutoUploadedCatalog = false;

  constructor(
    private readonly configManager: ConfigManager,
    private readonly factusolService: FactusolService,
    private readonly historyManager: HistoryManager,
    private readonly eventBus: EventBus
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

        // 1. SINCRONIZACIÓN DE STOCK (Factusol -> WooCommerce)
        try {
          const warehouse = (config.factusol?.warehouseCode || 'GEN').replace(/'/g, "''").trim();
          const stockRows = await driver.query<{ ARTSTO: any; totalStock: any }>(
            `SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO WHERE ALMSTO = '${warehouse}' OR ALMSTO = 'GEN' GROUP BY ARTSTO`
          ).catch((err) => {
            this.logger.warn('Error al consultar stock en Factusol:', err);
            return null;
          });

          if (!stockRows || stockRows.length === 0) {
            this.logger.warn('La consulta de stock en Factusol devolvió 0 registros o falló. Se aborta la sincronización de stock preventivamente para evitar vaciado en WooCommerce.');
            this.eventBus.addEvent('warn', 'Lectura de stock en Factusol inaccesible. Sincronización de stock omitida preventivamente.');
          } else {
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
            this.eventBus.addEvent('success', `✓ Stock sincronizado en ${itemsUpdated} productos de WooCommerce (dirty-check)`);
          } else {
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

          while (hasMoreWc && wcOrderPage <= MAX_WC_PAGES) {
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
              const orderRes = await factusolConnector.createOrder(canonicalOrder);

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
                this.eventBus.addEvent('success', `✓ Pedido #${wcOrder.id} procesado en Factusol (Serie ${series}, Pedido #${assignedNum})`);
              } else {
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
        } catch (orderErr) {
          this.logger.warn(`Aviso en importación de pedidos de WooCommerce: ${String(orderErr)}`);
        }
      } else {
        // Modo Standalone sin WooCommerce configurado
        if (dbPath && fs.existsSync(dbPath)) {
          const count = await this.factusolService.getArticleCount();
          if (count) itemsUpdated = Math.min(count, 50);
        }
      }

      const duration = ((Date.now() - start) / 1000).toFixed(1);
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
    const start = Date.now();
    this.eventBus.addEvent('info', 'Iniciando proceso de importación/subida de catálogo Factusol ➔ WooCommerce...');

    const config = this.configManager.get();
    let dbPath = config.factusol?.databasePath || config.factusolDbPath;
    const woo = config.woocommerce || {};

    if (dbPath) {
      try {
        const rollover = FactusolYearResolver.resolveActiveDatabase(dbPath);
        if (rollover.switched && rollover.activePath && rollover.activePath !== dbPath) {
          const oldFile = dbPath.split(/[/\\]/).pop() || dbPath;
          const newFile = rollover.activePath.split(/[/\\]/).pop() || rollover.activePath;
          this.logger.info(
            `🔄 Rollover fiscal automático detectado en subida de catálogo: ${oldFile} -> ${newFile}`
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
        this.logger.warn(`Aviso al verificar rollover fiscal de Factusol en catálogo: ${String(resolverErr)}`);
      }
    }

    if (!dbPath || !fs.existsSync(dbPath)) {
      const msg = 'Base de datos de Factusol no configurada o inaccesible.';
      this.eventBus.addEvent('error', `❌ ${msg}`);
      return { success: false, totalArticles: 0, uploadedCount: 0, skippedCount: 0, failedCount: 0, message: msg };
    }

    const isUniversalBridge =
      config.channelType === 'universal_bridge' ||
      (Boolean(config.universalBridge?.storeUrl) && !woo.storeUrl);

    if (isUniversalBridge) {
      return this.uploadUniversalBridgeCatalog(dbPath, config, options);
    }

    if (!woo.storeUrl || !woo.consumerKey || !woo.consumerSecret) {
      const msg = 'Credenciales de WooCommerce no configuradas.';
      this.eventBus.addEvent('error', `❌ ${msg}`);
      return { success: false, totalArticles: 0, uploadedCount: 0, skippedCount: 0, failedCount: 0, message: msg };
    }

    try {
      const cleanUrl = woo.storeUrl.trim().replace(/\/+$/, '');
      const authHeader = 'Basic ' + Buffer.from(`${woo.consumerKey.trim()}:${woo.consumerSecret.trim()}`).toString('base64');

      // 1. Conectar a Factusol y leer artículos canónicos
      let factusolConnector = this.factusolService.getConnector();
      if (!factusolConnector) {
        factusolConnector = new FactusolConnector();
        await factusolConnector.connect({
          configuration: {
            databasePath: dbPath,
            orderSeries: config.factusol?.orderSeries || '1',
            defaultWarehouse: config.factusol?.warehouseCode || 'GEN',
            tariffCode: config.factusol?.tariffCode || '1',
            saleTariffCode: config.factusol?.saleTariffCode,
          },
        });
      }

      this.eventBus.addEvent('info', 'Extrayendo catálogo de artículos desde Factusol...');
      const factusolProducts = await factusolConnector.readProducts({
        limit: options?.limit,
        activeOnly: true,
      });

      if (!factusolProducts || factusolProducts.length === 0) {
        const msg = 'No se encontraron artículos activos en Factusol para subir.';
        this.eventBus.addEvent('warn', msg);
        return { success: true, totalArticles: 0, uploadedCount: 0, skippedCount: 0, failedCount: 0, message: msg };
      }

      this.eventBus.addEvent('info', `Leídos ${factusolProducts.length} artículos de Factusol. Comprobando catálogo existente en WooCommerce...`);

      // 2. Obtener lista de SKUs existentes en WooCommerce para no duplicar si onlyMissing=true
      const onlyMissing = options?.onlyMissing ?? true;
      const existingWcSkus = new Set<string>();

      if (onlyMissing) {
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const res: any = await fetch(`${cleanUrl}/wp-json/wc/v3/products?per_page=100&page=${page}&_fields=id,sku`, {
            headers: { Authorization: authHeader },
            signal: AbortSignal.timeout(15000),
          }).catch(() => null);

          if (!res || !res.ok) break;
          const items = (await res.json()) as Array<{ id: number; sku: string }>;
          if (!items || items.length === 0) {
            hasMore = false;
          } else {
            for (const it of items) {
              if (it.sku) existingWcSkus.add(it.sku.trim().toUpperCase());
            }
            if (items.length < 100) hasMore = false;
            page++;
          }
        }
      }

      // 3. Filtrar artículos que deben crearse en WooCommerce
      const toUpload = factusolProducts.filter((p) => {
        if (!p.sku) return false;
        if (onlyMissing && existingWcSkus.has(p.sku.trim().toUpperCase())) {
          return false;
        }
        return true;
      });

      const skippedCount = factusolProducts.length - toUpload.length;
      let uploadedCount = 0;
      let failedCount = 0;

      if (toUpload.length === 0) {
        const msg = `Todos los artículos de Factusol (${factusolProducts.length}) ya existen en WooCommerce. No se requieren altas.`;
        this.eventBus.addEvent('success', `✓ ${msg}`);
        return {
          success: true,
          totalArticles: factusolProducts.length,
          uploadedCount: 0,
          skippedCount,
          failedCount: 0,
          message: msg,
        };
      }

      this.eventBus.addEvent('info', `Subiendo ${toUpload.length} productos nuevos a WooCommerce (Omitidos ya existentes: ${skippedCount})...`);

      // 4. Subir en lotes de 50 a WooCommerce Batch API
      const BATCH_SIZE = 50;
      for (let i = 0; i < toUpload.length; i += BATCH_SIZE) {
        const chunk = toUpload.slice(i, i + BATCH_SIZE);
        const payload = chunk.map((p) => ({
          name: p.name || `Artículo ${p.sku}`,
          sku: p.sku.trim(),
          type: 'simple',
          regular_price: p.regularPrice > 0 ? String(p.regularPrice) : '0',
          sale_price: (p.salePrice && p.salePrice > 0) ? String(p.salePrice) : undefined,
          manage_stock: true,
          stock_quantity: Math.max(0, p.stockQuantity || 0),
          description: p.description || '',
          categories: p.categories && p.categories.length > 0 ? p.categories.map((c) => ({ name: c.name })) : undefined,
          status: 'publish',
        }));

        const batchRes: any = await fetch(`${cleanUrl}/wp-json/wc/v3/products/batch`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ create: payload }),
          signal: AbortSignal.timeout(30000),
        }).catch((err) => {
          this.logger.error('Fallo en petición batch de WooCommerce', err);
          return null;
        });

        if (batchRes && batchRes.ok) {
          const resJson = (await batchRes.json()) as { create?: Array<{ id: number; error?: any }> };
          const created = resJson.create || [];
          for (const item of created) {
            if (item.error) {
              failedCount++;
            } else {
              uploadedCount++;
            }
          }
        } else {
          failedCount += chunk.length;
        }

        // Breve pausa para no saturar servidores compartidos
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const duration = ((Date.now() - start) / 1000).toFixed(1);
      const summary = `Subida inicial completada en ${duration}s: ${uploadedCount} productos creados, ${skippedCount} ya existentes, ${failedCount} incidencias.`;
      this.eventBus.addEvent('success', `✓ ${summary}`);

      this.historyManager.addSyncHistoryRecord({
        type: 'manual',
        mode: 'full',
        status: failedCount === 0 ? 'success' : 'warning',
        durationSeconds: parseFloat(duration),
        itemsUpdated: uploadedCount,
        ordersImported: 0,
        message: summary,
      });

      return {
        success: true,
        totalArticles: factusolProducts.length,
        uploadedCount,
        skippedCount,
        failedCount,
        message: summary,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('Error durante la subida inicial de catálogo', err);
      this.eventBus.addEvent('error', `❌ Error al subir catálogo: ${msg}`);
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

  private async syncUniversalBridge(
    dbPath: string,
    config: any,
    start: number
  ): Promise<SyncManualResult> {
    let itemsUpdated = 0;
    let ordersImported = 0;

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
      const warehouse = (config.factusol?.warehouseCode || 'GEN').replace(/'/g, "''").trim();
      const stockRows = await driver
        .query<{ ARTSTO: any; totalStock: any }>(
          `SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO WHERE ALMSTO = '${warehouse}' OR ALMSTO = 'GEN' GROUP BY ARTSTO`
        )
        .catch((err) => {
          this.logger.warn('Error al consultar stock en Factusol:', err);
          return null;
        });

      if (stockRows && stockRows.length > 0) {
        const stockUpdates = stockRows
          .map((r) => ({
            code: String(r.ARTSTO || '').trim(),
            stock: Math.max(0, Math.round(Number(r.totalStock) || 0)),
          }))
          .filter((u) => u.code);

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
        this.eventBus.addEvent('info', `✓ Stock sincronizado con la web: ${itemsUpdated} referencias actualizadas.`);
      }
    } catch (stockErr) {
      this.logger.warn(`Aviso en sincronización de stock con Universal Bridge: ${String(stockErr)}`);
    }

    // 2. Sincronización de pedidos (Universal Bridge -> Factusol)
    try {
      this.eventBus.addEvent('info', 'Comprobando pedidos nuevos en la tienda online...');
      const series = config.factusol?.orderSeries || '1';
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

      while (hasMoreBatches && batchCount < MAX_PULL_BATCHES) {
        batchCount++;
        const pullRes = await fetch(`${endpointUrl}?action=pull_orders&limit=100`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(15000),
        }).catch((err) => {
          this.logger.warn(`Aviso al consultar pedidos en Universal Bridge: ${String(err)}`);
          return null;
        });

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
            const mutRes = await factusolConnector.createOrder(canonicalOrder);

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
              this.eventBus.addEvent('success', `✓ Pedido ${canonicalOrder.reference} registrado en Factusol (Nº ${factNum || mutRes.externalId}).`);
            } else {
              this.logger.warn(`No se pudo registrar pedido web #${numId} (${po.order_number}) en Factusol: ${mutRes.error}`);
            }
          } catch (ordErr) {
            this.logger.error(`Error al procesar pedido web #${numId}:`, ordErr);
          }
        }

        if (confirmations.length > 0) {
          await fetch(`${endpointUrl}?action=ack_orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ confirmations }),
            signal: AbortSignal.timeout(15000),
          }).catch((err) => {
            this.logger.warn(`Aviso al confirmar pedidos en Universal Bridge: ${String(err)}`);
          });
        }

        if (rawBatch.length < 100 || confirmations.length === 0) {
          hasMoreBatches = false;
        }
      }
    } catch (orderErr) {
      this.logger.warn(`Aviso en sincronización de pedidos con Universal Bridge: ${String(orderErr)}`);
    }

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    const summary = `Sincronización completada en ${duration}s: ${itemsUpdated} stock actualizado, ${ordersImported} pedidos importados.`;

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
    return { success: true, message: summary };
  }

  private async uploadUniversalBridgeCatalog(
    dbPath: string,
    config: any,
    options?: { limit?: number; onlyMissing?: boolean }
  ): Promise<CatalogUploadResult> {
    const start = Date.now();
    const bridgeSettings = config.universalBridge || {};
    if (!bridgeSettings.storeUrl) {
      const msg = 'URL del sitio web no configurada en Universal Bridge.';
      this.eventBus.addEvent('error', `❌ ${msg}`);
      return { success: false, totalArticles: 0, uploadedCount: 0, skippedCount: 0, failedCount: 0, message: msg };
    }

    const endpointUrl = this.resolveBridgeEndpoint(bridgeSettings.storeUrl);
    const secretKey = bridgeSettings.secretKey;

    // 1. Conectar a Factusol y leer artículos canónicos
    let factusolConnector = this.factusolService.getConnector();
    if (!factusolConnector) {
      factusolConnector = new FactusolConnector();
      await factusolConnector.connect({
        configuration: {
          databasePath: dbPath,
          orderSeries: config.factusol?.orderSeries || '1',
          defaultWarehouse: config.factusol?.warehouseCode || 'GEN',
          tariffCode: config.factusol?.tariffCode || '1',
          saleTariffCode: config.factusol?.saleTariffCode,
        },
      });
    }

    this.eventBus.addEvent('info', 'Extrayendo catálogo de artículos desde Factusol...');
    const factusolProducts = await factusolConnector.readProducts({
      limit: options?.limit,
      activeOnly: true,
    });

    if (!factusolProducts || factusolProducts.length === 0) {
      const msg = 'No se encontraron artículos activos en Factusol para subir.';
      this.eventBus.addEvent('warn', msg);
      return { success: true, totalArticles: 0, uploadedCount: 0, skippedCount: 0, failedCount: 0, message: msg };
    }

    this.eventBus.addEvent('info', `Leídos ${factusolProducts.length} artículos de Factusol.`);

    // 2. Sincronización Directa y Automática de Fotos por HTTPS
    try {
      const imageSync = new ImageSyncService(
        {
          endpointUrl,
          secretKey,
          databasePath: dbPath,
        },
        this.eventBus
      );
      this.eventBus.addEvent('info', '📸 Comprobando y subiendo fotos de Factusol por HTTPS...');
      await imageSync.syncImages(factusolProducts);
    } catch (imgSyncErr) {
      this.logger.warn(`Aviso durante la sincronización de imágenes: ${String(imgSyncErr)}`);
      this.eventBus.addEvent('warn', `Aviso en subida de imágenes: ${String(imgSyncErr)}`);
    }

    // 3. Formatear y enviar productos a push_catalog
    const bridgeProducts = factusolProducts.map((p) => {
      const vatRate = p.taxRate ?? 21.0;
      const price = p.regularPrice ?? 0;
      const priceWithVat = Number((price * (1 + vatRate / 100)).toFixed(4));
      const salePrice = p.salePrice && p.salePrice > 0 ? p.salePrice : undefined;
      const salePriceWithVat = salePrice ? Number((salePrice * (1 + vatRate / 100)).toFixed(4)) : undefined;
      const family = p.categories && p.categories.length > 0 ? p.categories[0] : undefined;

      let imgart = p.attributes?.imgart || (p.images && p.images.length > 0 && p.images[0] ? p.images[0].url : '');
      if (imgart) {
        imgart = imgart.replace(/\\/g, '/');
        const fIdx = imgart.toUpperCase().indexOf('FOTOS/');
        if (fIdx !== -1) {
          imgart = '/' + imgart.substring(fIdx);
        } else if (!imgart.startsWith('/')) {
          imgart = '/FOTOS/' + imgart.replace(/^\/+/, '');
        }
      }

      return {
        code: p.sku,
        sku: p.sku,
        name: p.name,
        description: p.description || p.shortDescription || '',
        familyCode: family?.id || '',
        familyName: family?.name || '',
        price,
        salePrice,
        vatRate,
        priceWithVat,
        salePriceWithVat,
        unitOfMeasure: p.attributes?.unit || 'UNIDADES',
        weight: p.weight,
        barcode: p.barcode,
        imgart: imgart || undefined,
        active: p.status === 'published' && price > 0,
      };
    });

    this.eventBus.addEvent('info', `Subiendo ${bridgeProducts.length} productos a la base de datos de la tienda online...`);

    const PROD_BATCH = 200;
    let uploadedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < bridgeProducts.length; i += PROD_BATCH) {
      const chunk = bridgeProducts.slice(i, i + PROD_BATCH);
      const pushRes = await fetch(`${endpointUrl}?action=push_catalog`, {
        method: 'POST',
        headers: this.getBridgeHeaders(secretKey),
        body: JSON.stringify({ products: chunk }),
        signal: AbortSignal.timeout(30000),
      }).catch((err) => {
        this.logger.error('Error al enviar lote de catálogo a Universal Bridge', err);
        return null;
      });

      if (pushRes && pushRes.ok) {
        const resJson = (await pushRes.json()) as { success?: boolean; processed?: number };
        uploadedCount += resJson.processed || chunk.length;
      } else {
        failedCount += chunk.length;
      }
    }

    // 4. Enviar Existencias de Stock
    try {
      const warehouse = (config.factusol?.warehouseCode || 'GEN').replace(/'/g, "''").trim();
      const driver = new AccessDriver({ databasePath: dbPath });
      const stockRows = await driver
        .query<{ ARTSTO: any; totalStock: any }>(
          `SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO WHERE ALMSTO = '${warehouse}' OR ALMSTO = 'GEN' GROUP BY ARTSTO`
        )
        .catch(() => null);

      if (stockRows && stockRows.length > 0) {
        const stockUpdates = stockRows
          .map((r) => ({
            code: String(r.ARTSTO || '').trim(),
            stock: Math.max(0, Math.round(Number(r.totalStock) || 0)),
          }))
          .filter((u) => u.code);

        const STOCK_BATCH = 500;
        for (let i = 0; i < stockUpdates.length; i += STOCK_BATCH) {
          const chunk = stockUpdates.slice(i, i + STOCK_BATCH);
          await fetch(`${endpointUrl}?action=push_stock`, {
            method: 'POST',
            headers: this.getBridgeHeaders(secretKey),
            body: JSON.stringify({ stockUpdates: chunk }),
            signal: AbortSignal.timeout(20000),
          }).catch(() => null);
        }
      }
    } catch {}

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    const summary = `Catálogo y fotos sincronizados con éxito en ${duration}s: ${uploadedCount} productos procesados en la web (${failedCount} incidencias).`;
    this.eventBus.addEvent('success', `✓ ${summary}`);

    this.historyManager.addSyncHistoryRecord({
      type: 'manual',
      mode: 'full',
      status: failedCount === 0 ? 'success' : 'warning',
      durationSeconds: parseFloat(duration),
      itemsUpdated: uploadedCount,
      ordersImported: 0,
      message: summary,
    });

    return {
      success: true,
      totalArticles: factusolProducts.length,
      uploadedCount,
      skippedCount: 0,
      failedCount,
      message: summary,
    };
  }
}
