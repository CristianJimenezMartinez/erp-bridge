import fs from 'fs';
import { Logger, CanonicalOrder } from '@erp-bridge/shared';
import { ConfigManager } from '../../config/config.manager';
import { EventBus } from '../../diagnostics/event-bus';
import { FactusolService, FactusolOfflineError } from '../../factusol/factusol.service';
import { FactusolPathResolver } from '../../factusol/factusol.resolver';
import { IErpConnector } from '../erp-connector.interface';
import { DEMO_ARTICLES_BY_ERP } from '../sql-server-profiles';
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

  public isEvaluationMode(customDbPath?: string): boolean {
    const cfg = this.configManager.get();
    if (cfg.softwareErp?.providers?.factusol?.evaluationMode) return true;
    const spec = (customDbPath || cfg.softwareErp?.providers?.factusol?.databasePath || cfg.factusol?.databasePath || cfg.factusolDbPath || '').trim().toUpperCase();
    return spec === 'DEMO' || spec.startsWith('DEMO://');
  }

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
    if (this.isEvaluationMode(dbPath)) {
      return {
        success: true,
        evaluationMode: true,
        articleCount: DEMO_ARTICLES_BY_ERP.factusol.length,
        resolvedPath: 'DEMO://FACTUSOL/0012026.accdb',
        message: `Modo Evaluación activo para Factusol (${DEMO_ARTICLES_BY_ERP.factusol.length} artículos demo listos sin Factusol instalado).`,
      };
    }
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
    if (this.isEvaluationMode()) return true;
    // F1: accesible = el ejercicio activo resuelto existe (la ruta configurada nunca se modifica: anti-wiping)
    const p = this.getDatabasePath();
    return Boolean(p && this.factusolService.resolveActiveDbPath().exists);
  }

  public async getArticleCount(customDbPath?: string): Promise<number | undefined> {
    if (this.isEvaluationMode(customDbPath)) return DEMO_ARTICLES_BY_ERP.factusol.length;
    return this.factusolService.getArticleCount(customDbPath);
  }

  public async getPreviewArticles(limit = 25): Promise<ErpArticlePreviewItem[]> {
    if (this.isEvaluationMode()) {
      return DEMO_ARTICLES_BY_ERP.factusol.slice(0, limit).map((a) => ({
        code: a.code, description: a.name, family: a.family, stock: a.stock,
        salePrice: a.price, costPrice: a.costPrice, ean: a.barcode,
      }));
    }
    const res = await this.factusolService.getPreviewArticles(undefined, limit);
    if (res.offline || res.error) {
      this.logger.warn(`Vista previa de Factusol sin datos (${res.offline ? 'offline' : 'error'}): ${res.error || ''}`);
    }
    return res.articles.map((a) => ({
      code: a.code, description: a.description, family: a.family, stock: a.stock,
      salePrice: a.salePrice, costPrice: a.costPrice, ean: a.ean,
    }));
  }

  public async getMetadata(): Promise<ErpMetadata> {
    return this.factusolService.getMetadata();
  }

  public async getStockMap(warehouseCode?: string): Promise<Map<string, number>> {
    if (this.isEvaluationMode()) {
      const demoMap = new Map<string, number>();
      for (const a of DEMO_ARTICLES_BY_ERP.factusol) demoMap.set(a.code.toUpperCase(), a.stock);
      return demoMap;
    }
    // F1/F2/F3/F9: ejercicio activo + política única de stock (suma DISSTO de todos los almacenes salvo almacén
    // configurado distinto de GEN). Offline o error de lectura => lanza error (nunca un mapa vacío = "stock 0").
    return this.factusolService.getStockMap(warehouseCode);
  }

  public async createOrder(order: CanonicalOrder, series?: string, warehouse?: string): Promise<ErpOrderResult> {
    if (this.isEvaluationMode()) {
      const demoNum = Math.floor(Date.now() / 1000) % 100000;
      return { success: true, orderNumber: demoNum, externalId: `${series || '1'}-${demoNum}` };
    }
    // F5: configuración unificada (softwareErp.providers.factusol.* tiene prioridad) y serie por defecto única.
    const settings = this.factusolService.getSettings();
    const orderSeries = series || order.series || settings.orderSeries;
    const orderWarehouse = warehouse || order.warehouse || settings.warehouseCode;

    // F1: conector siempre sobre el ejercicio activo; si no hay base de datos accesible, error explícito (offline).
    const connector = await this.factusolService.ensureConnector();
    if (!connector) {
      return { success: false, error: 'Base de datos Factusol no accesible (Desconectado/Offline): el pedido no se ha insertado.' };
    }

    try {
      // F5: serie y almacén efectivos viajan en el pedido (el conector los respeta aunque ya exista conexión).
      const res = await connector.createOrder({ ...order, series: orderSeries, warehouse: orderWarehouse });
      return {
        success: res.success,
        orderNumber: res.externalId || res.orderNumber,
        externalId: res.externalId,
        error: res.error,
      };
    } catch (err) {
      this.logger.error(`Excepción al insertar pedido en Factusol: ${String(err)}`);
      return { success: false, error: `Excepción OLEDB Factusol: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
  public async getArticlesForCatalog(limit?: number, onlyActive?: boolean): Promise<ErpCatalogArticle[]> {
    if (this.isEvaluationMode()) return [...DEMO_ARTICLES_BY_ERP.factusol];
    // F1/F9: ejercicio activo; offline => error explícito (no un catálogo vacío que despublique la tienda).
    const connector = await this.factusolService.ensureConnector();
    if (!connector) {
      throw new FactusolOfflineError('Base de datos Factusol no accesible (Desconectado/Offline): catálogo no leído.');
    }

    const products = await connector.readProducts({ limit, activeOnly: onlyActive ?? true });
    return products.map((p) => ({
      code: p.sku, name: p.name, family: p.categories?.[0]?.name, stock: p.stockQuantity ?? 0,
      price: p.regularPrice ?? 0, costPrice: p.costPrice, barcode: p.barcode, description: p.description, raw: p,
    }));
  }
}
