import fs from 'fs';
import { Logger, CanonicalOrder } from '@erp-bridge/shared';
import { SimplyGestConnector } from '@erp-bridge/connector-simplygest';
import { ConfigManager } from '../../config/config.manager';
import { EventBus } from '../../diagnostics/event-bus';
import { SimplyGestService } from '../../simplygest/simplygest.service';
import { SimplyGestDetector } from '../../simplygest/simplygest.detector';
import { IErpConnector } from '../erp-connector.interface';
import {
  SupportedErpProviderId,
  ErpTestResult,
  ErpArticlePreviewItem,
  ErpOrderResult,
  ErpCatalogArticle,
  ErpMetadata,
} from '../erp.types';

export class SimplyGestAdapter implements IErpConnector {
  public readonly providerId: SupportedErpProviderId = 'simplygest';
  public readonly displayName = 'SimplyGest Desktop';
  private readonly logger = new Logger('SimplyGestAdapter');

  constructor(
    private readonly configManager: ConfigManager,
    private readonly simplygestService: SimplyGestService,
    private readonly eventBus?: EventBus
  ) {}

  public async connect(customDbPath?: string): Promise<boolean> {
    return this.simplygestService.connect(customDbPath);
  }

  public async disconnect(): Promise<void> {
    return this.simplygestService.disconnect();
  }

  public async testConnection(dbPath: string): Promise<ErpTestResult> {
    const res = await this.simplygestService.testConnection(dbPath);
    return {
      success: res.success,
      message: res.message,
      articleCount: res.articleCount,
      fileSizeBytes: res.fileSizeBytes,
      resolvedPath: res.resolvedPath,
    };
  }

  public async reconnect(dbPath: string): Promise<ErpTestResult> {
    const testResult = await this.testConnection(dbPath);
    if (!testResult.success) {
      this.eventBus?.addEvent('error', `Error conectando SimplyGest: ${testResult.message}`);
      return testResult;
    }

    await this.disconnect();
    const finalDbPath = testResult.resolvedPath || SimplyGestDetector.cleanPath(dbPath);
    const cfg = this.configManager.get();
    cfg.simplygestDbPath = finalDbPath;
    if (!cfg.simplygest) cfg.simplygest = {};
    cfg.simplygest.databasePath = finalDbPath;

    if (!cfg.softwareErp) {
      cfg.softwareErp = { activeProvider: 'simplygest', provisioned: true, providers: {} };
    }
    if (!cfg.softwareErp.providers) cfg.softwareErp.providers = {};
    if (!cfg.softwareErp.providers.simplygest) cfg.softwareErp.providers.simplygest = {};
    cfg.softwareErp.providers.simplygest.databasePath = finalDbPath;

    this.configManager.saveConfigToDisk();
    await this.connect(finalDbPath);

    this.eventBus?.addEvent('success', `✓ Base de datos SimplyGest reconectada: ${finalDbPath}`);
    return testResult;
  }

  public getDatabasePath(): string {
    const cfg = this.configManager.get();
    let dbPath = SimplyGestDetector.cleanPath(
      cfg.softwareErp?.providers?.simplygest?.databasePath ||
      cfg.simplygest?.databasePath ||
      cfg.simplygestDbPath ||
      ''
    );
    if (dbPath && !fs.existsSync(dbPath)) {
      const resolved = SimplyGestDetector.resolve(dbPath);
      if (resolved.success && resolved.resolvedPath) {
        dbPath = resolved.resolvedPath;
      }
    }
    return dbPath;
  }

  public isConfigured(): boolean {
    return Boolean(this.getDatabasePath());
  }

  public isDatabaseAccessible(): boolean {
    const p = this.getDatabasePath();
    return Boolean(p && fs.existsSync(p));
  }

  public async getArticleCount(customDbPath?: string): Promise<number | undefined> {
    return this.simplygestService.getArticleCount(customDbPath);
  }

  public async getPreviewArticles(limit = 25): Promise<ErpArticlePreviewItem[]> {
    const articles = await this.simplygestService.getPreviewArticles(undefined, limit);
    return articles.map((a) => ({
      code: a.code,
      description: a.description,
      family: a.family,
      stock: a.stock,
      salePrice: a.salePrice,
      costPrice: a.costPrice,
      ean: a.ean,
    }));
  }

  public async getMetadata(): Promise<ErpMetadata> {
    return {
      tariffs: [
        { code: '1', name: '1: Tarifa 1 (PVP / General)' },
        { code: '2', name: '2: Tarifa 2 (Web / Comercio)' },
        { code: '3', name: '3: Tarifa 3 (Mayorista)' },
        { code: '4', name: '4: Tarifa 4 (Especial)' },
        { code: '5', name: '5: Tarifa 5 (Distribuidor)' },
      ],
      warehouses: [
        { code: '1', name: '1: Almacén Principal' },
        { code: '2', name: '2: Almacén Secundario' },
        { code: 'GEN', name: 'GEN: Consolidado (Todos los almacenes)' },
      ],
      series: ['1', '2', 'A', 'B', 'W'],
    };
  }

  public async getStockMap(warehouseCode?: string): Promise<Map<string, number>> {
    const dbPath = this.getDatabasePath();
    if (!dbPath || !fs.existsSync(dbPath)) {
      return new Map();
    }

    let localConnector = this.simplygestService.getConnector();
    let shouldDisconnect = false;
    if (!localConnector) {
      localConnector = new SimplyGestConnector();
      await localConnector.connect({ configuration: { databasePath: dbPath } });
      shouldDisconnect = true;
    }

    try {
      const stockList = await localConnector.readStock({ warehouse: warehouseCode });
      const map = new Map<string, number>();
      for (const item of stockList) {
        const sku = (item.sku || '').trim().toUpperCase();
        if (sku) {
          map.set(sku, Math.max(0, Math.round(Number(item.quantity) || 0)));
        }
      }
      return map;
    } catch (err) {
      this.logger.warn(`Fallo al obtener mapa de existencias de SimplyGest: ${String(err)}`);
      return new Map();
    } finally {
      if (shouldDisconnect && localConnector) {
        await localConnector.disconnect().catch(() => {});
      }
    }
  }

  public async createOrder(order: CanonicalOrder, series?: string, warehouse?: string): Promise<ErpOrderResult> {
    const dbPath = this.getDatabasePath();
    if (!dbPath || !fs.existsSync(dbPath)) {
      return { success: false, error: 'Base de datos de SimplyGest no configurada o inaccesible.' };
    }

    let localConnector = this.simplygestService.getConnector();
    let shouldDisconnect = false;
    if (!localConnector) {
      localConnector = new SimplyGestConnector();
      await localConnector.connect({ configuration: { databasePath: dbPath } });
      shouldDisconnect = true;
    }

    try {
      // Inyectar serie o almacén si procede
      if (series && order) {
        order.series = series;
      }
      if (warehouse && order) {
        order.warehouse = warehouse;
      }

      const res = await localConnector.createOrder(order);
      return {
        success: res.success,
        orderNumber: res.externalId || res.orderNumber,
        externalId: res.externalId,
        error: res.error,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('Error al insertar pedido en SimplyGest:', err);
      return { success: false, error: msg };
    } finally {
      if (shouldDisconnect && localConnector) {
        await localConnector.disconnect().catch(() => {});
      }
    }
  }

  public async getArticlesForCatalog(limit?: number): Promise<ErpCatalogArticle[]> {
    const dbPath = this.getDatabasePath();
    if (!dbPath || !fs.existsSync(dbPath)) return [];

    let localConnector = this.simplygestService.getConnector();
    let shouldDisconnect = false;
    if (!localConnector) {
      localConnector = new SimplyGestConnector();
      await localConnector.connect({ configuration: { databasePath: dbPath } });
      shouldDisconnect = true;
    }

    try {
      const products = await localConnector.readProducts({ limit });
      return products.map((p) => ({
        code: p.sku,
        name: p.name,
        family: p.categories?.[0]?.name,
        stock: p.stockQuantity ?? 0,
        price: p.regularPrice ?? 0,
        costPrice: p.costPrice,
        barcode: p.barcode,
        description: p.description,
        raw: p,
      }));
    } finally {
      if (shouldDisconnect && localConnector) {
        await localConnector.disconnect().catch(() => {});
      }
    }
  }
}
