import fs from 'fs';
import { Logger } from '@erp-bridge/shared';
import { AccessDriver, FactusolConnector, FactusolYearResolver } from '@erp-bridge/connector-factusol';
import { ConfigManager } from '../config/config.manager';
import { HistoryManager } from '../history/history.manager';
import { EventBus } from '../diagnostics/event-bus';
import { AgentDiskLogger } from '../diagnostics/disk-logger';
import { FactusolService } from '../factusol/factusol.service';
import { CatalogUploadResult } from './sync.types';
import { ImageSyncService } from './image-sync.service';

export interface CatalogUploadContext {
  configManager: ConfigManager;
  factusolService: FactusolService;
  historyManager: HistoryManager;
  eventBus: EventBus;
  logger: Logger;
  resolveBridgeEndpoint: (storeUrl: string) => string;
  getBridgeHeaders: (secretKey?: string) => Record<string, string>;
}

export class CatalogUploadHelper {
  public static async uploadCatalog(
    ctx: CatalogUploadContext,
    options?: { limit?: number; onlyMissing?: boolean }
  ): Promise<CatalogUploadResult> {
    const start = Date.now();
    ctx.eventBus.addEvent('info', 'Iniciando proceso de importación/subida de catálogo Factusol ➔ WooCommerce...');

    const config = ctx.configManager.get();
    let dbPath = config.factusol?.databasePath || config.factusolDbPath;
    const woo = config.woocommerce || {};

    if (dbPath) {
      try {
        const rollover = FactusolYearResolver.resolveActiveDatabase(dbPath);
        if (rollover.switched && rollover.activePath && rollover.activePath !== dbPath) {
          const oldFile = dbPath.split(/[/\\]/).pop() || dbPath;
          const newFile = rollover.activePath.split(/[/\\]/).pop() || rollover.activePath;
          ctx.logger.info(
            `🔄 Rollover fiscal automático detectado en subida de catálogo: ${oldFile} -> ${newFile}`
          );
          ctx.eventBus.addEvent(
            'info',
            `🔄 Cambio de ejercicio fiscal Factusol automático: ${oldFile} ➔ ${newFile}`
          );
          const newPath = rollover.activePath;
          dbPath = newPath;
          ctx.configManager.setFactusolDbPath(newPath);
          await ctx.factusolService.reconnect(newPath).catch((err) => {
            ctx.logger.warn(`Aviso al reconectar factusolService tras rollover fiscal: ${String(err)}`);
          });
        }
      } catch (resolverErr) {
        ctx.logger.warn(`Aviso al verificar rollover fiscal de Factusol en catálogo: ${String(resolverErr)}`);
      }
    }

    if (!dbPath || !fs.existsSync(dbPath)) {
      const msg = 'Base de datos de Factusol no configurada o inaccesible.';
      ctx.eventBus.addEvent('error', `❌ ${msg}`);
      return { success: false, totalArticles: 0, uploadedCount: 0, skippedCount: 0, failedCount: 0, message: msg };
    }

    const isUniversalBridge =
      config.channelType === 'universal_bridge' ||
      (Boolean(config.universalBridge?.storeUrl) && !woo.storeUrl);

    if (isUniversalBridge) {
      return this.uploadUniversalBridgeCatalog(ctx, dbPath, config, options);
    }

    if (!woo.storeUrl || !woo.consumerKey || !woo.consumerSecret) {
      const msg = 'Credenciales de WooCommerce no configuradas.';
      ctx.eventBus.addEvent('error', `❌ ${msg}`);
      return { success: false, totalArticles: 0, uploadedCount: 0, skippedCount: 0, failedCount: 0, message: msg };
    }

    const cleanUrl = woo.storeUrl.trim().replace(/\/+$/, '');
    const authHeader = 'Basic ' + Buffer.from(`${woo.consumerKey.trim()}:${woo.consumerSecret.trim()}`).toString('base64');

    try {
      // 1. Conectar a Factusol y leer artículos canónicos
      let factusolConnector = ctx.factusolService.getConnector();
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

      ctx.eventBus.addEvent('info', 'Extrayendo catálogo de artículos desde Factusol...');
      const tReadCatalogStart = performance.now();
      const factusolProducts = await factusolConnector.readProducts({
        limit: options?.limit,
        activeOnly: true,
      });
      const readCatalogMs = Math.round(performance.now() - tReadCatalogStart);

      if (!factusolProducts || factusolProducts.length === 0) {
        const msg = 'No se encontraron artículos activos en Factusol para subir.';
        ctx.eventBus.addEvent('warn', msg);
        return { success: true, totalArticles: 0, uploadedCount: 0, skippedCount: 0, failedCount: 0, message: msg };
      }

      ctx.eventBus.addEvent('info', `Leídos ${factusolProducts.length} artículos de Factusol en ${readCatalogMs}ms. Comprobando catálogo existente en WooCommerce...`);

      // 2. Obtener lista de SKUs existentes en WooCommerce para no duplicar si onlyMissing=true
      const onlyMissing = options?.onlyMissing ?? true;
      const existingWcSkus = new Set<string>();
      let existingCheckMs = 0;

      if (onlyMissing) {
        const tExistingStart = performance.now();
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
        existingCheckMs = Math.round(performance.now() - tExistingStart);
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
        const durationMs = Date.now() - start;
        const msg = `Todos los artículos de Factusol (${factusolProducts.length}) ya existen en WooCommerce. No se requieren altas.`;
        ctx.eventBus.addEvent('success', `✓ ${msg}`);
        AgentDiskLogger.getInstance().log({
          level: 'INFO',
          component: 'SyncEngine',
          action: 'upload_catalog_complete',
          duration_ms: durationMs,
          status: 'SKIPPED',
          message: msg,
          metadata: {
            channel: 'woocommerce',
            totalArticles: factusolProducts.length,
            skippedCount,
            timings: { readCatalogMs, existingCheckMs },
          },
        });
        return {
          success: true,
          totalArticles: factusolProducts.length,
          uploadedCount: 0,
          skippedCount,
          failedCount: 0,
          message: msg,
        };
      }

      ctx.eventBus.addEvent('info', `Subiendo ${toUpload.length} productos nuevos a WooCommerce (Omitidos ya existentes: ${skippedCount})...`);

      // 4. Subir en lotes de 50 a WooCommerce Batch API
      const tUploadBatchesStart = performance.now();
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
          ctx.logger.error('Fallo en petición batch de WooCommerce', err);
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

      const uploadBatchesMs = Math.round(performance.now() - tUploadBatchesStart);
      const cycleDurationMs = Date.now() - start;
      const duration = (cycleDurationMs / 1000).toFixed(1);
      const summary = `Subida inicial completada en ${duration}s: ${uploadedCount} productos creados, ${skippedCount} ya existentes, ${failedCount} incidencias.`;
      ctx.eventBus.addEvent('success', `✓ ${summary}`);

      ctx.historyManager.addSyncHistoryRecord({
        type: 'manual',
        mode: 'full',
        status: failedCount === 0 ? 'success' : 'warning',
        durationSeconds: parseFloat(duration),
        itemsUpdated: uploadedCount,
        ordersImported: 0,
        message: summary,
      });

      AgentDiskLogger.getInstance().log({
        level: failedCount === 0 ? 'SUCCESS' : 'WARN',
        component: 'SyncEngine',
        action: 'upload_catalog_complete',
        duration_ms: cycleDurationMs,
        status: failedCount === 0 ? 'SUCCESS' : 'FAILURE',
        message: summary,
        metadata: {
          channel: 'woocommerce',
          totalArticles: factusolProducts.length,
          uploadedCount,
          skippedCount,
          failedCount,
          timings: {
            readCatalogMs,
            existingCheckMs,
            uploadBatchesMs,
          },
        },
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
      ctx.logger.error('Error durante la subida inicial de catálogo', err);
      ctx.eventBus.addEvent('error', `❌ Error al subir catálogo: ${msg}`);
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

  public static async uploadUniversalBridgeCatalog(
    ctx: CatalogUploadContext,
    dbPath: string,
    config: any,
    options?: { limit?: number; onlyMissing?: boolean }
  ): Promise<CatalogUploadResult> {
    const start = Date.now();
    const bridgeSettings = config.universalBridge || {};
    if (!bridgeSettings.storeUrl) {
      const msg = 'URL del sitio web no configurada en Universal Bridge.';
      ctx.eventBus.addEvent('error', `❌ ${msg}`);
      return { success: false, totalArticles: 0, uploadedCount: 0, skippedCount: 0, failedCount: 0, message: msg };
    }

    const endpointUrl = ctx.resolveBridgeEndpoint(bridgeSettings.storeUrl);
    const secretKey = bridgeSettings.secretKey;

    try {
      // 1. Conectar a Factusol y leer artículos canónicos
      let factusolConnector = ctx.factusolService.getConnector();
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

      ctx.eventBus.addEvent('info', 'Extrayendo catálogo de artículos desde Factusol...');
      const tReadCatalogStart = performance.now();
      const factusolProducts = await factusolConnector.readProducts({
        limit: options?.limit,
        activeOnly: true,
      });
      const readCatalogMs = Math.round(performance.now() - tReadCatalogStart);

      if (!factusolProducts || factusolProducts.length === 0) {
        const msg = 'No se encontraron artículos activos en Factusol para subir.';
        ctx.eventBus.addEvent('warn', msg);
        return { success: true, totalArticles: 0, uploadedCount: 0, skippedCount: 0, failedCount: 0, message: msg };
      }

      ctx.eventBus.addEvent('info', `Leídos ${factusolProducts.length} artículos de Factusol en ${readCatalogMs}ms.`);

      // 2. Sincronización Directa y Automática de Fotos por HTTPS
      let imgSyncMs = 0;
      try {
        const tImgSyncStart = performance.now();
        const imageSync = new ImageSyncService(
          {
            endpointUrl,
            secretKey,
            databasePath: dbPath,
          },
          ctx.eventBus
        );
        ctx.eventBus.addEvent('info', '📸 Comprobando y subiendo fotos de Factusol por HTTPS...');
        await imageSync.syncImages(factusolProducts);
        imgSyncMs = Math.round(performance.now() - tImgSyncStart);
      } catch (imgSyncErr) {
        ctx.logger.warn(`Aviso durante la sincronización de imágenes: ${String(imgSyncErr)}`);
        ctx.eventBus.addEvent('warn', `Aviso en subida de imágenes: ${String(imgSyncErr)}`);
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

      ctx.eventBus.addEvent('info', `Subiendo ${bridgeProducts.length} productos a la base de datos de la tienda online...`);

      const tPushCatalogStart = performance.now();
      const PROD_BATCH = 200;
      let uploadedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < bridgeProducts.length; i += PROD_BATCH) {
        const chunk = bridgeProducts.slice(i, i + PROD_BATCH);
        const pushRes = await fetch(`${endpointUrl}?action=push_catalog`, {
          method: 'POST',
          headers: ctx.getBridgeHeaders(secretKey),
          body: JSON.stringify({ products: chunk }),
          signal: AbortSignal.timeout(30000),
        }).catch((err) => {
          ctx.logger.error('Error al enviar lote de catálogo a Universal Bridge', err);
          return null;
        });

        if (pushRes && pushRes.ok) {
          const resJson = (await pushRes.json()) as { success?: boolean; processed?: number };
          uploadedCount += resJson.processed || chunk.length;
        } else {
          failedCount += chunk.length;
        }
      }
      const pushCatalogMs = Math.round(performance.now() - tPushCatalogStart);

      // 4. Enviar Existencias de Stock
      let pushStockMs = 0;
      try {
        const tPushStockStart = performance.now();
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
              headers: ctx.getBridgeHeaders(secretKey),
              body: JSON.stringify({ stockUpdates: chunk }),
              signal: AbortSignal.timeout(20000),
            }).catch(() => null);
          }
        }
        pushStockMs = Math.round(performance.now() - tPushStockStart);
      } catch {}

      const cycleDurationMs = Date.now() - start;
      const duration = (cycleDurationMs / 1000).toFixed(1);
      const summary = `Catálogo y fotos sincronizados con éxito en ${duration}s: ${uploadedCount} productos procesados en la web (${failedCount} incidencias).`;
      ctx.eventBus.addEvent('success', `✓ ${summary}`);

      ctx.historyManager.addSyncHistoryRecord({
        type: 'manual',
        mode: 'full',
        status: failedCount === 0 ? 'success' : 'warning',
        durationSeconds: parseFloat(duration),
        itemsUpdated: uploadedCount,
        ordersImported: 0,
        message: summary,
      });

      AgentDiskLogger.getInstance().log({
        level: failedCount === 0 ? 'SUCCESS' : 'WARN',
        component: 'SyncEngine',
        action: 'upload_catalog_complete',
        duration_ms: cycleDurationMs,
        status: failedCount === 0 ? 'SUCCESS' : 'FAILURE',
        message: summary,
        metadata: {
          channel: 'universal_bridge',
          totalArticles: factusolProducts.length,
          uploadedCount,
          failedCount,
          timings: {
            readCatalogMs,
            imgSyncMs,
            pushCatalogMs,
            pushStockMs,
          },
        },
      });

      return {
        success: true,
        totalArticles: factusolProducts.length,
        uploadedCount,
        skippedCount: 0,
        failedCount,
        message: summary,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ctx.logger.error('Error durante la subida inicial de catálogo a Universal Bridge', err);
      ctx.eventBus.addEvent('error', `❌ Error al subir catálogo: ${msg}`);
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
}
