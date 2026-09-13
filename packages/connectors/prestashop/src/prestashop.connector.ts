import {
  BatchStockUpdateResult,
  BatchSyncResult,
  ConnectionConfig,
  Connector,
  ConnectorCapabilities,
  ConnectorMetadata,
  DEFAULT_CAPABILITIES,
  HealthCheckResult,
  ProductMutationResult,
  OrderMutationResult,
  StockMutationResult,
  CustomerMutationResult,
  ReadProductsOptions,
  ReadOrdersOptions,
  ReadStockOptions,
  ConnectionError,
  ErrorCode,
} from '@erp-bridge/sdk';
import {
  CanonicalCustomer,
  CanonicalOrder,
  CanonicalProduct,
  CanonicalStock,
  Logger,
  OrderStatus,
} from '@erp-bridge/shared';
import { PrestaShopClient } from './client';
import { PrestaShopConfig } from './types';
import {
  PrestaShopCustomerHandler,
  PrestaShopOrderHandler,
  PrestaShopProductHandler,
  PrestaShopStockHandler,
} from './handlers';

export class PrestaShopConnector implements Connector {
  private readonly logger = new Logger('PrestaShopConnector');
  private client: PrestaShopClient | null = null;
  private productHandler: PrestaShopProductHandler | null = null;
  private orderHandler: PrestaShopOrderHandler | null = null;
  private stockHandler: PrestaShopStockHandler | null = null;
  private customerHandler: PrestaShopCustomerHandler | null = null;

  public getMetadata(): ConnectorMetadata {
    return {
      id: 'connector-prestashop',
      name: 'PrestaShop',
      slug: 'prestashop',
      version: '0.1.0',
      author: 'Bentian / ERP Bridge',
      description: 'Conector para tiendas online PrestaShop mediante Web Service oficial XML/JSON',
      icon: 'shopping-bag',
      docsUrl: 'https://docs.erpbridge.io/connectors/prestashop',
    };
  }

  public getCapabilities(): ConnectorCapabilities {
    return {
      ...DEFAULT_CAPABILITIES,
      supportsReadProducts: true,
      supportsWriteProducts: true,
      supportsReadStock: true,
      supportsWriteStock: true,
      supportsReadOrders: true,
      supportsWriteOrders: true,
      supportsReadCustomers: true,
      supportsWriteCustomers: true,
      supportsBatchOperations: true,
    };
  }

  public async connect(config: ConnectionConfig): Promise<void> {
    const raw = { ...config.configuration, ...config.credentials } as unknown as PrestaShopConfig;
    if (!raw?.url || typeof raw.url !== 'string') {
      throw new ConnectionError(ErrorCode.CONNECTION_FAILED, 'La URL de PrestaShop es requerida ("url")');
    }
    if (!raw?.apiKey || typeof raw.apiKey !== 'string') {
      throw new ConnectionError(ErrorCode.CONNECTION_AUTH_FAILED, 'La clave API Key de PrestaShop es requerida ("apiKey")');
    }

    this.client = new PrestaShopClient(raw);
    this.productHandler = new PrestaShopProductHandler(this.client, this.logger, raw.defaultLangId || 1);
    this.orderHandler = new PrestaShopOrderHandler(this.client, this.logger);
    this.stockHandler = new PrestaShopStockHandler(this.client, this.logger);
    this.customerHandler = new PrestaShopCustomerHandler(this.client, this.logger, raw.reGroupIds || []);
    this.logger.info('PrestaShop connector conectado exitosamente', { url: raw.url });
  }

  public async disconnect(): Promise<void> {
    this.client = null;
    this.productHandler = null;
    this.orderHandler = null;
    this.stockHandler = null;
    this.customerHandler = null;
  }

  public async healthCheck(): Promise<HealthCheckResult> {
    if (!this.client) return { status: 'DOWN', message: 'Conector de PrestaShop no conectado' };
    const start = Date.now();
    try {
      await this.client.get('products', { limit: 1 });
      return { status: 'HEALTHY', latencyMs: Date.now() - start, message: 'Conexion PrestaShop Web Service verificada' };
    } catch (err: unknown) {
      return { status: 'DOWN', latencyMs: Date.now() - start, message: `Fallo de salud PrestaShop: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  public async readProducts(o?: ReadProductsOptions): Promise<CanonicalProduct[]> { this.ensureConnected(); return this.productHandler!.readProducts(o); }
  public async createProduct(p: CanonicalProduct): Promise<ProductMutationResult> { this.ensureConnected(); return this.productHandler!.createProduct(p); }
  public async updateProduct(p: CanonicalProduct, id?: string): Promise<ProductMutationResult> { this.ensureConnected(); return this.productHandler!.updateProduct(p, id); }
  public async batchUpsertProducts(p: CanonicalProduct[], m?: Map<string, string>): Promise<BatchSyncResult> { this.ensureConnected(); return this.productHandler!.batchUpsertProducts(p, m); }

  public async readOrders(o?: ReadOrdersOptions): Promise<CanonicalOrder[]> { this.ensureConnected(); return this.orderHandler!.readOrders(o); }
  public async createOrder(o: CanonicalOrder): Promise<OrderMutationResult> { this.ensureConnected(); return this.orderHandler!.createOrder(o); }
  public async updateOrderStatus(id: string, s: OrderStatus | string, d?: Record<string, unknown>): Promise<OrderMutationResult> { this.ensureConnected(); return this.orderHandler!.updateOrderStatus(id, s, d); }

  public async findCustomer(c: { taxId?: string; email?: string }): Promise<CanonicalCustomer | null> { this.ensureConnected(); return this.customerHandler!.findCustomer(c); }
  public async createCustomer(c: CanonicalCustomer): Promise<CustomerMutationResult> { this.ensureConnected(); return this.customerHandler!.createCustomer(c); }

  public async readStock(o?: ReadStockOptions): Promise<CanonicalStock[]> { this.ensureConnected(); return this.stockHandler!.readStock(o); }
  public async updateStock(sku: string, q: number, id?: string): Promise<StockMutationResult> { this.ensureConnected(); return this.stockHandler!.updateStock(sku, q, id); }
  public async batchUpdateStock(s: CanonicalStock[], m?: Map<string, string>): Promise<BatchStockUpdateResult> { this.ensureConnected(); return this.stockHandler!.batchUpdateStock(s, m); }

  private ensureConnected(): void {
    if (!this.client) throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'PrestaShop no conectado');
  }
}
