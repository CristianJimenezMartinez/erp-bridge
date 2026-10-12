import { CanonicalOrder } from '@erp-bridge/shared';
import {
  SupportedErpProviderId,
  ErpTestResult,
  ErpArticlePreviewItem,
  ErpOrderResult,
  ErpCatalogArticle,
  ErpMetadata,
} from './erp.types';

export interface IErpConnector {
  readonly providerId: SupportedErpProviderId;
  readonly displayName: string;

  // Ciclo de vida y conectividad
  connect(customDbPath?: string): Promise<boolean>;
  disconnect(): Promise<void>;
  testConnection(dbPath: string): Promise<ErpTestResult>;
  reconnect?(dbPath: string): Promise<ErpTestResult>;

  // Información y estado de base de datos
  getDatabasePath(): string;
  isConfigured(): boolean;
  isDatabaseAccessible(): boolean;
  getArticleCount(customDbPath?: string): Promise<number | undefined>;
  getPreviewArticles(limit?: number): Promise<ErpArticlePreviewItem[]>;
  getMetadata?(): Promise<ErpMetadata>;

  // Sincronización de existencias
  getStockMap(warehouseCode?: string): Promise<Map<string, number>>;

  // Inyección de pedidos de venta
  createOrder(order: CanonicalOrder, series?: string, warehouse?: string): Promise<ErpOrderResult>;

  // Consulta de catálogo (para subida a canales web)
  getArticlesForCatalog?(limit?: number, onlyActive?: boolean): Promise<ErpCatalogArticle[]>;
}
