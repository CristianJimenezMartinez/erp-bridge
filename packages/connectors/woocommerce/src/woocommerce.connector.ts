import {
  BatchSyncResult,
  BatchStockUpdateResult,
  ConnectionConfig,
  Connector,
  ConnectorCapabilities,
  ConnectorMetadata,
  DEFAULT_CAPABILITIES,
  HealthCheckResult,
  ProductMutationResult,
  OrderMutationResult,
  StockMutationResult,
  ReadProductsOptions,
  ReadOrdersOptions,
  ConnectionError,
  ErrorCode,
} from '@erp-bridge/sdk';
import {
  CanonicalOrder,
  CanonicalProduct,
  CanonicalStock,
  Logger,
  OrderStatus,
} from '@erp-bridge/shared';
import { WooCommerceClient } from './client';
import {
  WooCommerceProductHandler,
  WooCommerceOrderHandler,
  WooCommerceStockHandler,
  WooCommerceVariationHandler,
  groupProductsByParent,
  toWooCommerceVariationPayload,
  ParentProductGroup,
} from './handlers';

export interface WooCommerceConnectionConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  version?: 'wc/v3';
}

export class WooCommerceConnector implements Connector {
  private readonly logger = new Logger('WooCommerceConnector');
  private client: WooCommerceClient | null = null;
  private config: WooCommerceConnectionConfig | null = null;

  // Domain Handlers
  private productHandler: WooCommerceProductHandler | null = null;
  private orderHandler: WooCommerceOrderHandler | null = null;
  private stockHandler: WooCommerceStockHandler | null = null;
  private variationHandler: WooCommerceVariationHandler | null = null;

  public getMetadata(): ConnectorMetadata {
    return {
      id: 'connector-woocommerce',
      name: 'WooCommerce',
      slug: 'woocommerce',
      version: '1.0.0',
      author: 'Bentian / ERP Bridge',
      description: 'Conector para tiendas online WooCommerce mediante API REST oficial',
      icon: 'shopping-cart',
      docsUrl: 'https://docs.erpbridge.io/connectors/woocommerce',
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
      supportsWebhooks: true,
      supportsReadOrders: true,
      supportsWriteOrders: true,
      supportsVariations: true,
    };
  }

  public async connect(config: ConnectionConfig): Promise<void> {
    const rawConfig = {
      ...config.configuration,
      ...config.credentials,
    } as unknown as WooCommerceConnectionConfig;

    const url = rawConfig?.url;
    const consumerKey = rawConfig?.consumerKey;
    const consumerSecret = rawConfig?.consumerSecret;

    if (!url || typeof url !== 'string') {
      throw new ConnectionError(
        ErrorCode.CONNECTION_FAILED,
        'La URL de la tienda WooCommerce es obligatoria ("url")'
      );
    }
    if (!consumerKey || typeof consumerKey !== 'string') {
      throw new ConnectionError(
        ErrorCode.CONNECTION_AUTH_FAILED,
        'La clave "consumerKey" de WooCommerce es obligatoria'
      );
    }
    if (!consumerSecret || typeof consumerSecret !== 'string') {
      throw new ConnectionError(
        ErrorCode.CONNECTION_AUTH_FAILED,
        'El secreto "consumerSecret" de WooCommerce es obligatorio'
      );
    }

    this.config = {
      url,
      consumerKey,
      consumerSecret,
      version: rawConfig.version || 'wc/v3',
    };

    this.client = new WooCommerceClient({
      url,
      consumerKey,
      consumerSecret,
      version: this.config.version,
    });

    // Initialize domain handlers
    this.productHandler = new WooCommerceProductHandler(this.client, this.logger);
    this.orderHandler = new WooCommerceOrderHandler(this.client, this.logger);
    this.stockHandler = new WooCommerceStockHandler(this.client, this.logger);
    this.variationHandler = new WooCommerceVariationHandler(this.client, this.logger);

    this.logger.info('WooCommerce connector configured successfully', { url });
  }

  public async disconnect(): Promise<void> {
    this.client = null;
    this.config = null;
    this.productHandler = null;
    this.orderHandler = null;
    this.stockHandler = null;
    this.variationHandler = null;
    this.logger.info('WooCommerce connector disconnected');
  }

  public async healthCheck(): Promise<HealthCheckResult> {
    if (!this.client || !this.config) {
      return {
        status: 'DOWN',
        message: 'El conector de WooCommerce no está inicializado ni conectado',
      };
    }

    const start = Date.now();
    try {
      // Test connectivity by requesting 1 product
      await this.client.get('products', { per_page: 1 });
      const latencyMs = Date.now() - start;

      return {
        status: 'HEALTHY',
        latencyMs,
        message: 'Conexión HTTPS REST con WooCommerce verificada correctamente',
        details: {
          storeUrl: this.config.url,
          apiVersion: this.config.version,
        },
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'DOWN',
        latencyMs,
        message: `Fallo al verificar salud de WooCommerce: ${message}`,
        details: {
          storeUrl: this.config?.url,
        },
      };
    }
  }

  // --- Product Operations ---
  public async readProducts(options?: ReadProductsOptions): Promise<CanonicalProduct[]> {
    this.ensureConnected();
    return this.productHandler!.readProducts(options);
  }

  public async createProduct(product: CanonicalProduct): Promise<ProductMutationResult> {
    this.ensureConnected();
    return this.productHandler!.createProduct(product);
  }

  public async updateProduct(
    product: CanonicalProduct,
    targetIdentifier?: string,
    options?: { skipImages?: boolean }
  ): Promise<ProductMutationResult> {
    this.ensureConnected();
    return this.productHandler!.updateProduct(product, targetIdentifier, options);
  }

  public async batchUpsertProducts(
    products: CanonicalProduct[],
    existingMappings?: Map<string, string>,
    options?: { skipImagesOnUpdate?: boolean }
  ): Promise<BatchSyncResult> {
    this.ensureConnected();
    return this.productHandler!.batchUpsertProducts(products, existingMappings, options);
  }

  // --- Order Operations ---
  public async readOrders(options?: ReadOrdersOptions): Promise<CanonicalOrder[]> {
    this.ensureConnected();
    return this.orderHandler!.readOrders(options);
  }

  public async updateOrderStatus(
    orderId: string,
    status: OrderStatus | string,
    details?: Record<string, unknown>
  ): Promise<OrderMutationResult> {
    this.ensureConnected();
    return this.orderHandler!.updateOrderStatus(orderId, status, details);
  }

  public async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
    this.ensureConnected();
    return this.orderHandler!.createOrder(order);
  }

  // --- Stock Operations ---
  public async updateStock(
    sku: string,
    quantity: number,
    targetIdentifier?: string
  ): Promise<StockMutationResult> {
    this.ensureConnected();
    return this.stockHandler!.updateStock(sku, quantity, targetIdentifier);
  }

  public async batchUpdateStock(
    stockUpdates: CanonicalStock[],
    existingMappings?: Map<string, string>
  ): Promise<BatchStockUpdateResult> {
    this.ensureConnected();
    return this.stockHandler!.batchUpdateStock(stockUpdates, existingMappings);
  }

  // --- Variation Operations ---
  public groupProductsByParent(
    products: CanonicalProduct[]
  ): Map<string, ParentProductGroup> {
    return this.variationHandler
      ? this.variationHandler.groupProductsByParent(products)
      : groupProductsByParent(products);
  }

  public toWooCommerceVariationPayload(canonical: CanonicalProduct): Record<string, unknown> {
    return this.variationHandler
      ? this.variationHandler.toWooCommerceVariationPayload(canonical)
      : toWooCommerceVariationPayload(canonical);
  }

  public async syncVariationStock(
    productId: number,
    variationId: number,
    stockQuantity: number
  ): Promise<boolean> {
    this.ensureConnected();
    return this.variationHandler!.syncVariationStock(productId, variationId, stockQuantity);
  }

  public async createVariation(
    productId: number,
    canonical: CanonicalProduct
  ): Promise<Record<string, unknown>> {
    this.ensureConnected();
    return this.variationHandler!.createVariation(productId, canonical);
  }

  public async readVariations(
    productId: number
  ): Promise<Array<Record<string, unknown>>> {
    this.ensureConnected();
    return this.variationHandler!.readVariations(productId);
  }

  public getVariationHandler(): WooCommerceVariationHandler | null {
    return this.variationHandler;
  }

  private ensureConnected(): void {
    if (!this.client) {
      throw new ConnectionError(
        ErrorCode.CONNECTION_NOT_FOUND,
        'WooCommerce no está conectado. Llame a connect() primero.'
      );
    }
  }
}
