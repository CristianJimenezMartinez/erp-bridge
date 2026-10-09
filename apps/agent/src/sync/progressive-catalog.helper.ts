import fs from 'fs';
import { CanonicalProduct, Logger } from '@erp-bridge/shared';
import { FactusolConnector } from '@erp-bridge/connector-factusol';
import { ConfigManager } from '../config/config.manager';
import { EventBus } from '../diagnostics/event-bus';
import { FactusolService } from '../factusol/factusol.service';
import { ImageSyncService } from './image-sync.service';

export interface ProgressiveCatalogContext {
  configManager: ConfigManager;
  factusolService: FactusolService;
  eventBus: EventBus;
  logger: Logger;
  resolveBridgeEndpoint: (storeUrl: string) => string;
  getBridgeHeaders: (secretKey?: string) => Record<string, string>;
}

export interface ProgressiveCatalogOptions {
  channel: 'woocommerce' | 'universal_bridge';
  dbPath: string;
  knownExistingSkus?: Set<string>;
  limit?: number;
}

/**
 * Helper modular para la subida progresiva y autónoma de catálogo en segundo plano.
 *
 * Misión:
 * En cada ciclo rutinario de sincronización, detecta artículos de Factusol
 * que aún no existen en la tienda online y sube un micro-lote (15 artículos por ciclo),
 * junto con sus fotos asociadas vía ImageSyncService, sin bloquear el hilo principal
 * ni sobrecargar el servidor web ni la base de datos de Factusol.
 */
export class ProgressiveCatalogHelper {
  private static readonly logger = new Logger('ProgressiveCatalogHelper');
  private static isRunning = false;
  private static lastRunTime = 0;
  private static readonly DEBOUNCE_COOLDOWN_MS = 20_000; // 20s de respiro mínimo entre ejecuciones
  private static readonly MICRO_BATCH_SIZE = 15;
  private static knownWebSkus: Set<string> = new Set();
  private static lastKnownSkusFetchTime = 0;
  private static readonly SKUS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min TTL

  public static resetState(): void {
    this.isRunning = false;
    this.lastRunTime = 0;
    this.knownWebSkus.clear();
    this.lastKnownSkusFetchTime = 0;
  }

  public static async processProgressiveUpload(
    ctx: ProgressiveCatalogContext,
    options: ProgressiveCatalogOptions
  ): Promise<number> {
    const now = Date.now();
    if (this.isRunning) {
      this.logger.debug('Subida progresiva omitida: ejecución previa aún en curso.');
      return 0;
    }
    if (now - this.lastRunTime < this.DEBOUNCE_COOLDOWN_MS) {
      this.logger.debug('Subida progresiva en periodo de respiro (debounce).');
      return 0;
    }

    this.isRunning = true;
    try {
      return await this.executeProgressiveUpload(ctx, options);
    } catch (err) {
      this.logger.warn(`Aviso durante la subida progresiva de catálogo: ${String(err)}`);
      return 0;
    } finally {
      this.lastRunTime = Date.now();
      this.isRunning = false;
    }
  }

  private static async executeProgressiveUpload(
    ctx: ProgressiveCatalogContext,
    options: ProgressiveCatalogOptions
  ): Promise<number> {
    if (!options.dbPath || !fs.existsSync(options.dbPath)) {
      return 0;
    }

    const config = ctx.configManager.get();
    const batchLimit = options.limit || this.MICRO_BATCH_SIZE;

    // 1. Conectar a Factusol y leer artículos
    let factusolConnector = ctx.factusolService.getConnector();
    if (!factusolConnector) {
      factusolConnector = new FactusolConnector();
      await factusolConnector.connect({
        configuration: {
          databasePath: options.dbPath,
          orderSeries: config.factusol?.orderSeries || '1',
          defaultWarehouse: config.factusol?.warehouseCode || 'GEN',
          tariffCode: config.factusol?.tariffCode || '1',
          saleTariffCode: config.factusol?.saleTariffCode,
        },
      });
    }

    const activeOnlyConfig = config.factusol?.activeOnly;
    let factusolProducts = await factusolConnector.readProducts({
      activeOnly: activeOnlyConfig !== false,
    });

    if ((!factusolProducts || factusolProducts.length === 0) && activeOnlyConfig !== false) {
      factusolProducts = await factusolConnector.readProducts({ activeOnly: false });
    }

    if (!factusolProducts || factusolProducts.length === 0) {
      return 0;
    }

    // 2. Alimentar / refrescar caché de SKUs existentes en la tienda web
    const now = Date.now();
    if (options.knownExistingSkus && options.knownExistingSkus.size > 0) {
      for (const sku of options.knownExistingSkus) {
        if (sku) this.knownWebSkus.add(sku.trim().toUpperCase());
      }
      this.lastKnownSkusFetchTime = now;
    } else if (this.knownWebSkus.size === 0 || now - this.lastKnownSkusFetchTime > this.SKUS_CACHE_TTL_MS) {
      if (options.channel === 'woocommerce') {
        await this.refreshWooCommerceSkus(config);
      } else {
        await this.refreshUniversalBridgeSkus(ctx, config);
      }
    }

    // 3. Filtrar artículos pendientes de alta en la web
    const pendingProducts: CanonicalProduct[] = [];
    for (const p of factusolProducts) {
      if (!p.sku) continue;
      const skuNorm = p.sku.trim().toUpperCase();
      if (!this.knownWebSkus.has(skuNorm)) {
        pendingProducts.push(p);
        if (pendingProducts.length >= batchLimit) {
          break;
        }
      }
    }

    if (pendingProducts.length === 0) {
      this.logger.debug('Subida progresiva: catálogo 100% al día en la web, 0 artículos pendientes.');
      return 0;
    }

    // Pequeño respiro cooperativo antes de la subida
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 4. Subida del micro-lote según canal
    if (options.channel === 'universal_bridge') {
      return await this.uploadUniversalBridgeMicroBatch(ctx, config, options.dbPath, pendingProducts);
    } else {
      return await this.uploadWooCommerceMicroBatch(ctx, config, pendingProducts);
    }
  }

  private static async uploadUniversalBridgeMicroBatch(
    ctx: ProgressiveCatalogContext,
    config: any,
    dbPath: string,
    batch: CanonicalProduct[]
  ): Promise<number> {
    const bridge = config.universalBridge || {};
    if (!bridge.storeUrl) return 0;
    const endpointUrl = ctx.resolveBridgeEndpoint(bridge.storeUrl);
    const secretKey = bridge.secretKey;

    // A) Sincronización de fotos asociadas al micro-lote
    try {
      const imageSync = new ImageSyncService(
        {
          endpointUrl,
          secretKey,
          databasePath: dbPath,
        },
        ctx.eventBus
      );
      await imageSync.syncImages(batch);
    } catch (imgErr) {
      this.logger.warn(`Aviso al sincronizar imágenes en subida progresiva: ${String(imgErr)}`);
    }

    // B) Formatear artículos para push_catalog
    const bridgeProducts = batch.map((p) => {
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

    // C) Envío a push_catalog
    const pushRes = await fetch(`${endpointUrl}?action=push_catalog`, {
      method: 'POST',
      headers: ctx.getBridgeHeaders(secretKey),
      body: JSON.stringify({ products: bridgeProducts }),
      signal: AbortSignal.timeout(30000),
    }).catch((err) => {
      this.logger.error('Error al subir micro-lote progresivo a Universal Bridge', err);
      return null;
    });

    if (pushRes && pushRes.ok) {
      const resJson = (await pushRes.json().catch(() => null)) as { success?: boolean; processed?: number } | null;
      const uploadedCount = resJson?.processed || bridgeProducts.length;

      for (const p of batch) {
        if (p.sku) this.knownWebSkus.add(p.sku.trim().toUpperCase());
      }

      ctx.eventBus.addEvent('success', `✓ Subida progresiva: ${uploadedCount} artículos nuevos dados de alta en la web`);
      this.logger.info(`✓ Subida progresiva: ${uploadedCount} artículos nuevos dados de alta en la web`);
      return uploadedCount;
    }

    return 0;
  }

  private static async uploadWooCommerceMicroBatch(
    ctx: ProgressiveCatalogContext,
    config: any,
    batch: CanonicalProduct[]
  ): Promise<number> {
    const woo = config.woocommerce || {};
    if (!woo.storeUrl || !woo.consumerKey || !woo.consumerSecret) return 0;
    const cleanUrl = woo.storeUrl.trim().replace(/\/+$/, '');
    const authHeader = 'Basic ' + Buffer.from(`${woo.consumerKey.trim()}:${woo.consumerSecret.trim()}`).toString('base64');

    const payload = batch.map((p) => ({
      name: p.name || `Artículo ${p.sku}`,
      sku: p.sku.trim(),
      type: 'simple',
      regular_price: p.regularPrice > 0 ? String(p.regularPrice) : '0',
      sale_price: p.salePrice && p.salePrice > 0 ? String(p.salePrice) : undefined,
      manage_stock: true,
      stock_quantity: Math.max(0, p.stockQuantity || 0),
      description: p.description || '',
      categories: p.categories && p.categories.length > 0 ? p.categories.map((c) => ({ name: c.name })) : undefined,
      status: 'publish',
    }));

    const batchRes = await fetch(`${cleanUrl}/wp-json/wc/v3/products/batch`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ create: payload }),
      signal: AbortSignal.timeout(30000),
    }).catch((err) => {
      this.logger.error('Error al subir micro-lote progresivo a WooCommerce', err);
      return null;
    });

    if (batchRes && batchRes.ok) {
      const resJson = (await batchRes.json().catch(() => null)) as {
        create?: Array<{ id: number; error?: any; sku?: string }>;
      } | null;
      const created = resJson?.create || [];
      let uploadedCount = 0;

      for (let i = 0; i < created.length; i++) {
        const item = created[i];
        if (item && !item.error) {
          uploadedCount++;
          const sku = item.sku || batch[i]?.sku;
          if (sku) this.knownWebSkus.add(sku.trim().toUpperCase());
        }
      }

      if (uploadedCount > 0) {
        ctx.eventBus.addEvent('success', `✓ Subida progresiva: ${uploadedCount} artículos nuevos dados de alta en la web`);
        this.logger.info(`✓ Subida progresiva: ${uploadedCount} artículos nuevos dados de alta en la web`);
      }
      return uploadedCount;
    }

    return 0;
  }

  private static async refreshWooCommerceSkus(config: any): Promise<void> {
    const woo = config.woocommerce || {};
    if (!woo.storeUrl || !woo.consumerKey || !woo.consumerSecret) return;
    const cleanUrl = woo.storeUrl.trim().replace(/\/+$/, '');
    const authHeader = 'Basic ' + Buffer.from(`${woo.consumerKey.trim()}:${woo.consumerSecret.trim()}`).toString('base64');
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(`${cleanUrl}/wp-json/wc/v3/products?per_page=100&page=${page}&_fields=id,sku`, {
        headers: { Authorization: authHeader },
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);

      if (!res || !res.ok) break;
      const items = (await res.json().catch(() => null)) as Array<{ id: number; sku: string }> | null;
      if (!items || items.length === 0) {
        hasMore = false;
      } else {
        for (const it of items) {
          if (it.sku) this.knownWebSkus.add(it.sku.trim().toUpperCase());
        }
        if (items.length < 100) hasMore = false;
        page++;
      }
    }
    this.lastKnownSkusFetchTime = Date.now();
  }

  private static async refreshUniversalBridgeSkus(ctx: ProgressiveCatalogContext, config: any): Promise<void> {
    const bridge = config.universalBridge || {};
    if (!bridge.storeUrl) return;
    const endpointUrl = ctx.resolveBridgeEndpoint(bridge.storeUrl);

    try {
      const pingRes = await fetch(`${endpointUrl}?action=ping`, {
        method: 'GET',
        headers: ctx.getBridgeHeaders(bridge.secretKey),
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);

      if (pingRes && pingRes.ok) {
        const pingJson = (await pingRes.json().catch(() => null)) as { articleCount?: number } | null;
        if (pingJson && typeof pingJson.articleCount === 'number' && pingJson.articleCount === 0) {
          this.lastKnownSkusFetchTime = Date.now();
          return;
        }
      }

      const articlesRes = await fetch(`${endpointUrl}?action=articles`, {
        method: 'GET',
        headers: ctx.getBridgeHeaders(bridge.secretKey),
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);

      if (articlesRes && articlesRes.ok) {
        const articlesJson = (await articlesRes.json().catch(() => null)) as
          | { articles?: Array<{ codart?: string; code?: string }> }
          | Array<{ codart?: string; code?: string }>
          | null;
        const list = Array.isArray(articlesJson) ? articlesJson : articlesJson?.articles || [];
        for (const a of list) {
          const sku = a.codart || a.code;
          if (sku) this.knownWebSkus.add(String(sku).trim().toUpperCase());
        }
        this.lastKnownSkusFetchTime = Date.now();
      }
    } catch (err) {
      this.logger.warn(`Aviso al refrescar SKUs de Universal Bridge: ${String(err)}`);
    }
  }
}
