import fs from 'fs';
import { Logger, CanonicalOrder } from '@erp-bridge/shared';
import { AccessDriver, FactusolConnector } from '@erp-bridge/connector-factusol';
import { ConfigManager } from '../../config/config.manager';
import { EventBus } from '../../diagnostics/event-bus';
import { FactusolService } from '../../factusol/factusol.service';
import { FactusolPathResolver } from '../../factusol/factusol.resolver';
import { IErpConnector } from '../erp-connector.interface';
import {
  SupportedErpProviderId,
  ErpTestResult,
  ErpArticlePreviewItem,
  ErpOrderResult,
  ErpCatalogArticle,
  ErpMetadata,
} from '../erp.types';

export class FactusolAdapter implements IErpConnector {
  public readonly providerId: SupportedErpProviderId = 'factusol';
  public readonly displayName = 'Factusol ERP';
  private readonly logger = new Logger('FactusolAdapter');

  constructor(
    private readonly configManager: ConfigManager,
    private readonly factusolService: FactusolService,
    eventBus?: EventBus
  ) {
    void eventBus;
  }

  public async connect(customDbPath?: string): Promise<boolean> {
    return this.factusolService.connect(customDbPath);
  }

  public async disconnect(): Promise<void> {
    return this.factusolService.disconnect();
  }

  public async testConnection(dbPath: string): Promise<ErpTestResult> {
    const res = await this.factusolService.testConnection(dbPath);
    return {
      success: res.success,
      message: res.message,
      articleCount: res.articleCount,
      fileSizeBytes: res.fileSizeBytes,
      resolvedPath: res.resolvedPath,
    };
  }

  public async reconnect(dbPath: string): Promise<ErpTestResult> {
    const res = await this.factusolService.reconnect(dbPath);
    return {
      success: res.success,
      message: res.message,
      articleCount: res.articleCount,
      fileSizeBytes: res.fileSizeBytes,
      resolvedPath: res.resolvedPath,
    };
  }

  public getDatabasePath(): string {
    const cfg = this.configManager.get();
    let dbPath = FactusolPathResolver.cleanPath(
      cfg.softwareErp?.providers?.factusol?.databasePath ||
      cfg.factusol?.databasePath ||
      cfg.factusolDbPath ||
      ''
    );
    if (dbPath && !fs.existsSync(dbPath)) {
      const uncFallback = FactusolPathResolver.resolveMappedDriveToUnc(dbPath);
      if (uncFallback && fs.existsSync(uncFallback)) {
        dbPath = uncFallback;
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
    return this.factusolService.getArticleCount(customDbPath);
  }

  public async getPreviewArticles(limit = 25): Promise<ErpArticlePreviewItem[]> {
    const res = await this.factusolService.getPreviewArticles(undefined, limit);
    return res.articles.map((a) => ({
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
    return this.factusolService.getMetadata();
  }

  public async getStockMap(warehouseCode?: string): Promise<Map<string, number>> {
    const dbPath = this.getDatabasePath();
    if (!dbPath || !fs.existsSync(dbPath)) {
      return new Map();
    }

    const cfg = this.configManager.get();
    const warehouse = (
      warehouseCode ||
      cfg.softwareErp?.providers?.factusol?.warehouseCode ||
      cfg.factusol?.warehouseCode ||
      'GEN'
    ).replace(/'/g, "''").trim();

    try {
      const driver = new AccessDriver({ databasePath: dbPath });
      let stockRows = await driver.query<{ ARTSTO: any; totalStock: any }>(
        `SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO WHERE ALMSTO = '${warehouse}' OR ALMSTO = 'GEN' GROUP BY ARTSTO`
      ).catch((err) => {
        this.logger.warn(`Error al consultar stock en Factusol: ${String(err)}`);
        return null;
      });

      // Fallback inteligente agrupando todos los almacenes
      if ((!stockRows || stockRows.length === 0) && warehouse) {
        const fallbackRows = await driver.query<{ ARTSTO: any; totalStock: any }>(
          `SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO GROUP BY ARTSTO`
        ).catch(() => null);
        if (fallbackRows && fallbackRows.length > 0) {
          stockRows = fallbackRows;
        }
      }

      const map = new Map<string, number>();
      if (stockRows) {
        for (const row of stockRows) {
          const sku = String(row.ARTSTO || '').trim().toUpperCase();
          if (sku) {
            map.set(sku, Math.max(0, Math.round(Number(row.totalStock) || 0)));
          }
        }
      }
      return map;
    } catch (err) {
      this.logger.warn(`Fallo al obtener mapa de stock de Factusol: ${String(err)}`);
      return new Map();
    }
  }

  public async createOrder(order: CanonicalOrder, series?: string, warehouse?: string): Promise<ErpOrderResult> {
    const cfg = this.configManager.get();
    const dbPath = this.getDatabasePath();
    const orderSeries = series ||
      cfg.softwareErp?.providers?.factusol?.orderSeries ||
      cfg.factusol?.orderSeries ||
      '1';
    const orderWarehouse = warehouse ||
      cfg.softwareErp?.providers?.factusol?.warehouseCode ||
      cfg.factusol?.warehouseCode ||
      'GEN';

    let connector = this.factusolService.getConnector();
    if (!connector) {
      connector = new FactusolConnector();
      await connector.connect({
        configuration: {
          databasePath: dbPath,
          orderSeries,
          invoiceSeries: cfg.factusol?.invoiceSeries || '1',
          defaultWarehouse: orderWarehouse,
          tariffCode: cfg.factusol?.tariffCode || '1',
          saleTariffCode: cfg.factusol?.saleTariffCode,
        },
      });
    }

    try {
      const res = await connector.createOrder(order);
      return {
        success: res.success,
        orderNumber: res.externalId || res.orderNumber,
        externalId: res.externalId,
        error: res.error,
      };
    } catch (err) {
      this.logger.error(`Excepción al insertar pedido en Factusol: ${String(err)}`);
      return {
        success: false,
        error: `Excepción OLEDB Factusol: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  public async getArticlesForCatalog(limit?: number, onlyActive?: boolean): Promise<ErpCatalogArticle[]> {
    const dbPath = this.getDatabasePath();
    if (!dbPath || !fs.existsSync(dbPath)) return [];

    let connector = this.factusolService.getConnector();
    if (!connector) {
      connector = new FactusolConnector();
      await connector.connect({ configuration: { databasePath: dbPath } });
    }

    const products = await connector.readProducts({
      limit,
      activeOnly: onlyActive ?? true,
    });

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
  }
}
