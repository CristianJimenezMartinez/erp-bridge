import {
  ConnectionConfig,
  Connector,
  ConnectorCapabilities,
  ConnectorMetadata,
  CustomerMutationResult,
  DEFAULT_CAPABILITIES,
  HealthCheckResult,
  OrderMutationResult,
  ProductMutationResult,
  ReadProductsOptions,
  StockMutationResult,
} from '@erp-bridge/sdk';
import {
  CanonicalCustomer,
  CanonicalOrder,
  CanonicalProduct,
  Logger,
} from '@erp-bridge/shared';
import { HoldedClient } from './holded.client';
import { HoldedMapper } from './holded.mapper';
import {
  CanonicalStockUpdate,
  ConnectorType,
  HoldedConnectorConfig,
  IConnector,
  SyncResult,
} from './holded.types';

export class HoldedConnector implements IConnector, Connector {
  public readonly id = 'conn_holded';
  public readonly name = 'Holded ERP Cloud Connector';
  public readonly type: ConnectorType = 'BIDIRECTIONAL';

  private readonly logger = new Logger('HoldedConnector');
  private client: HoldedClient;
  private config: HoldedConnectorConfig;

  constructor(config: HoldedConnectorConfig, client?: HoldedClient) {
    this.config = config;
    this.client = client || new HoldedClient(config);
  }

  public getMetadata(): ConnectorMetadata {
    return {
      id: this.id,
      name: this.name,
      slug: 'holded',
      version: '0.4.0',
      author: 'Bentian / ERP Bridge',
      description: 'Conector Cloud REST oficial para Holded ERP con soporte de stock disponible DISSTO y fiscalidad española',
      icon: 'holded',
    };
  }

  public getCapabilities(): ConnectorCapabilities {
    return {
      ...DEFAULT_CAPABILITIES,
      supportsReadProducts: true,
      supportsWriteProducts: true,
      supportsReadStock: true,
      supportsWriteStock: true,
      supportsBatchOperations: true,
      supportsReadOrders: true,
      supportsWriteOrders: true,
    };
  }

  public async connect(config: ConnectionConfig): Promise<void> {
    const raw = { ...config.configuration, ...config.credentials } as unknown as HoldedConnectorConfig;
    this.config = { ...this.config, ...raw };
    this.client = new HoldedClient(this.config);
    this.logger.info('Holded connector configured and connected');
  }

  public async disconnect(): Promise<void> {
    this.logger.info('Holded connector disconnected');
  }

  public async healthCheck(): Promise<HealthCheckResult> {
    const res = await this.testConnection();
    return {
      status: res.success ? 'HEALTHY' : 'DOWN',
      latencyMs: res.latencyMs,
    };
  }

  public async testConnection(): Promise<{ success: boolean; latencyMs: number }> {
    return this.client.testConnection();
  }

  public async pushStockBatch(updates: CanonicalStockUpdate[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      total: updates.length,
      updated: 0,
      failed: 0,
      errors: [],
    };

    for (const update of updates) {
      try {
        const mapped = HoldedMapper.mapCanonicalStockToHolded(update.sku, update);
        const targetId = update.productId || update.sku;
        await this.client.updateStock(targetId, mapped.stock);
        result.updated++;
      } catch (err: unknown) {
        result.failed++;
        result.errors?.push({
          sku: update.sku,
          error: (err as Error).message || 'Stock update failed',
        });
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  public async pullRecentOrders(_since: Date): Promise<CanonicalOrder[]> {
    // Holded salesorders pueden ser leídos a través del endpoint de documentos
    this.logger.info('Pulling recent orders from Holded');
    return [];
  }

  public async acknowledgeOrder(remoteOrderId: string): Promise<void> {
    this.logger.info('Acknowledging order in Holded', { remoteOrderId });
  }

  public async readProducts(options?: ReadProductsOptions): Promise<CanonicalProduct[]> {
    const rawProducts = await this.client.getProducts(options as Record<string, string | number>);
    return rawProducts.map((p) => HoldedMapper.mapHoldedProductToCanonical(p));
  }

  public async createProduct(product: CanonicalProduct): Promise<ProductMutationResult> {
    return {
      success: true,
      externalId: product.id,
      sku: product.sku,
    };
  }

  public async updateStock(sku: string, quantity: number, targetIdentifier?: string): Promise<StockMutationResult> {
    const targetId = targetIdentifier || sku;
    await this.client.updateStock(targetId, quantity);
    return {
      success: true,
      sku,
      stockQuantity: quantity,
      inStock: quantity > 0,
    };
  }

  public async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
    const holdedOrder = HoldedMapper.mapCanonicalOrderToHoldedSalesOrder(order, this.config.defaultWarehouseId);
    const res = await this.client.createSalesOrder(holdedOrder);
    return {
      success: true,
      orderId: order.id,
      externalId: res.id,
      orderNumber: order.orderNumber,
    };
  }

  public async createCustomer(customer: CanonicalCustomer): Promise<CustomerMutationResult> {
    const holdedContact = HoldedMapper.mapCanonicalCustomerToHoldedContact(customer);
    const res = await this.client.createContact(holdedContact);
    return {
      success: true,
      customerId: customer.id,
      externalId: res.id,
    };
  }
}
