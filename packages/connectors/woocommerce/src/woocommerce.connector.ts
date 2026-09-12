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
  mapCanonicalToWooCommerce,
  mapWooCommerceToCanonical,
  WooCommerceOrderMapper,
  WooCommerceOrderRaw,
  WooCommerceProductPayload,
  WooCommerceStockMapper,
} from './mappers';

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

    this.logger.info('WooCommerce connector configured successfully', { url });
  }

  public async disconnect(): Promise<void> {
    this.client = null;
    this.config = null;
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

  public async readProducts(options?: ReadProductsOptions): Promise<CanonicalProduct[]> {
    if (!this.client) {
      throw new ConnectionError(
        ErrorCode.CONNECTION_NOT_FOUND,
        'WooCommerce no está conectado. Llame a connect() primero.'
      );
    }

    const params: Record<string, unknown> = {
      per_page: options?.limit || 50,
      page: options?.offset ? Math.floor(options.offset / (options.limit || 50)) + 1 : 1,
    };

    if (options?.modifiedSince) {
      params['after'] = options.modifiedSince.toISOString();
    }

    const response = await this.client.get<Array<Record<string, unknown>>>('products', params);
    return response.map((item) => mapWooCommerceToCanonical(item));
  }

  public async createProduct(product: CanonicalProduct): Promise<ProductMutationResult> {
    if (!this.client) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'WooCommerce no está conectado');
    }

    try {
      const payload = mapCanonicalToWooCommerce(product);
      const response = await this.client.post<{ id: number; sku: string }>('products', payload);
      return {
        success: true,
        externalId: String(response.id),
        sku: product.sku,
        rawResponse: response,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        externalId: '',
        sku: product.sku,
        error: msg,
      };
    }
  }

  public async updateProduct(
    product: CanonicalProduct,
    targetIdentifier?: string,
    options?: { skipImages?: boolean }
  ): Promise<ProductMutationResult> {
    if (!this.client) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'WooCommerce no está conectado');
    }

    if (!targetIdentifier) {
      throw new ConnectionError(
        ErrorCode.VALIDATION_ERROR,
        `Se requiere el ID externo de WooCommerce para actualizar el producto SKU: ${product.sku}`
      );
    }

    try {
      const numericId = parseInt(targetIdentifier, 10);
      const skipImages = options?.skipImages ?? true;
      const payload = mapCanonicalToWooCommerce(product, numericId, { skipImages });
      const response = await this.client.put<{ id: number; sku: string }>(`products/${numericId}`, payload);
      return {
        success: true,
        externalId: String(response.id),
        sku: product.sku,
        rawResponse: response,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        externalId: targetIdentifier,
        sku: product.sku,
        error: msg,
      };
    }
  }

  public async batchUpsertProducts(
    products: CanonicalProduct[],
    existingMappings?: Map<string, string>,
    options?: { skipImagesOnUpdate?: boolean }
  ): Promise<BatchSyncResult> {
    if (!this.client) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'WooCommerce no está conectado');
    }

    const creates: WooCommerceProductPayload[] = [];
    const updates: WooCommerceProductPayload[] = [];
    const itemResults: Array<{ sku: string; success: boolean; externalId?: string; error?: string }> = [];
    const skipImagesOnUpdate = options?.skipImagesOnUpdate ?? true;

    for (const product of products) {
      const targetIdStr = existingMappings?.get(product.sku);
      if (targetIdStr) {
        const targetId = parseInt(targetIdStr, 10);
        updates.push(mapCanonicalToWooCommerce(product, targetId, { skipImages: skipImagesOnUpdate }));
      } else {
        creates.push(mapCanonicalToWooCommerce(product));
      }
    }

    const CHUNK_SIZE = 25;
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < creates.length; i += CHUNK_SIZE) {
      const chunk = creates.slice(i, i + CHUNK_SIZE);
      const chunkStart = Date.now();
      try {
        const response = await this.client.post<{
          create?: Array<{ id: number; sku: string; error?: { message: string } }>;
        }>('products/batch', { create: chunk });

        if (response.create) {
          for (const item of response.create) {
            if (item.error) {
              failed++;
              itemResults.push({ sku: item.sku, success: false, error: item.error.message });
            } else {
              succeeded++;
              itemResults.push({ sku: item.sku, success: true, externalId: String(item.id) });
            }
          }
        }
      } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : String(error);
        for (const item of chunk) {
          failed++;
          itemResults.push({ sku: item.sku, success: false, error: errMessage });
        }
      }

      const elapsed = Date.now() - chunkStart;
      if (elapsed > 1500 && i + CHUNK_SIZE < creates.length) {
        this.logger.warn(`Latencia alta detectada en WooCommerce (${elapsed}ms > 1500ms). Aplicando throttling adaptativo de 750ms...`);
        await new Promise((resolve) => setTimeout(resolve, 750));
      }
    }

    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const chunkStart = Date.now();
      try {
        const response = await this.client.post<{
          update?: Array<{ id: number; sku: string; error?: { message: string } }>;
        }>('products/batch', { update: chunk });

        if (response.update) {
          for (const item of response.update) {
            if (item.error) {
              failed++;
              itemResults.push({ sku: item.sku, success: false, error: item.error.message });
            } else {
              succeeded++;
              itemResults.push({ sku: item.sku, success: true, externalId: String(item.id) });
            }
          }
        }
      } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : String(error);
        for (const item of chunk) {
          failed++;
          itemResults.push({ sku: item.sku, success: false, error: errMessage });
        }
      }

      const elapsed = Date.now() - chunkStart;
      if (elapsed > 1500 && i + CHUNK_SIZE < updates.length) {
        this.logger.warn(`Latencia alta detectada en WooCommerce (${elapsed}ms > 1500ms). Aplicando throttling adaptativo de 750ms...`);
        await new Promise((resolve) => setTimeout(resolve, 750));
      }
    }

    return {
      total: products.length,
      succeeded,
      failed,
      items: itemResults,
    };
  }

  // --- Order Operations ---

  public async readOrders(options?: ReadOrdersOptions): Promise<CanonicalOrder[]> {
    if (!this.client) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'WooCommerce no está conectado');
    }

    const params: Record<string, unknown> = {
      per_page: options?.limit || 50,
      page: options?.offset ? Math.floor(options.offset / (options.limit || 50)) + 1 : 1,
      status: options?.status || 'processing,pending,on-hold',
      order: 'asc',
      orderby: 'date',
    };

    if (options?.createdSince) {
      params['after'] = options.createdSince.toISOString();
    }

    this.logger.info('Consultando pedidos de WooCommerce (REST API Polling)...', params);

    const rawOrders = await this.client.get<WooCommerceOrderRaw[]>('orders', params);
    return rawOrders.map((raw) => WooCommerceOrderMapper.toCanonicalOrder(raw));
  }

  public async updateOrderStatus(
    orderId: string,
    status: OrderStatus | string,
    details?: Record<string, unknown>
  ): Promise<OrderMutationResult> {
    if (!this.client) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'WooCommerce no está conectado');
    }

    const numericId = parseInt(orderId, 10);
    const wcStatus = WooCommerceOrderMapper.mapCanonicalToWcStatus(status);

    try {
      const payload: Record<string, unknown> = { status: wcStatus, ...details };
      const response = await this.client.put<WooCommerceOrderRaw>(`orders/${numericId}`, payload);

      this.logger.info(`Estado de pedido actualizado en WooCommerce: Order #${numericId} -> ${wcStatus}`);

      return {
        success: true,
        orderId,
        externalId: String(response.id),
        status,
        rawResponse: response,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al actualizar estado de pedido ${orderId} en WooCommerce`, error);
      return {
        success: false,
        orderId,
        externalId: orderId,
        error: msg,
      };
    }
  }

  public async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
    if (!this.client) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'WooCommerce no está conectado');
    }

    try {
      const payload = {
        payment_method: order.paymentMethod,
        payment_method_title: order.paymentMethodTitle,
        set_paid: false,
        billing: {
          first_name: order.billingAddress?.firstName || order.customer.fiscalName,
          last_name: order.billingAddress?.lastName || '',
          address_1: order.billingAddress?.street || '',
          city: order.billingAddress?.city || '',
          state: order.billingAddress?.state || '',
          postcode: order.billingAddress?.postalCode || '',
          country: order.billingAddress?.country || 'ES',
          email: order.billingAddress?.email || order.customer.email || '',
          phone: order.billingAddress?.phone || order.customer.phone || '',
        },
        line_items: order.lines.map((ln: any) => ({
          name: ln.name,
          sku: ln.sku,
          quantity: ln.quantity,
          price: ln.unitPrice,
          total: String(ln.total),
        })),
      };

      const response = await this.client.post<WooCommerceOrderRaw>('orders', payload);

      return {
        success: true,
        orderId: order.id,
        externalId: String(response.id),
        orderNumber: String(response.number || response.id),
        status: WooCommerceOrderMapper.mapStatus(response.status),
        rawResponse: response,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        orderId: order.id,
        externalId: '',
        error: msg,
      };
    }
  }

  // --- Stock Operations ---

  public async updateStock(
    sku: string,
    quantity: number,
    targetIdentifier?: string
  ): Promise<StockMutationResult> {
    if (!this.client) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'WooCommerce no está conectado');
    }

    if (!targetIdentifier) {
      throw new ConnectionError(
        ErrorCode.VALIDATION_ERROR,
        `Se requiere el ID externo de WooCommerce para actualizar el stock SKU: ${sku}`
      );
    }

    try {
      const numericId = parseInt(targetIdentifier, 10);
      const payload = {
        manage_stock: true,
        stock_quantity: quantity,
        in_stock: quantity > 0,
      };

      const response = await this.client.put<{ id: number; stock_quantity: number }>(
        `products/${numericId}`,
        payload
      );

      this.logger.info(`Stock actualizado en WooCommerce: SKU ${sku} (ID ${numericId}) -> ${quantity} unidades`);

      return {
        success: true,
        sku,
        externalId: String(response.id),
        stockQuantity: quantity,
        inStock: quantity > 0,
        rawResponse: response,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al actualizar stock para SKU ${sku}`, error);
      return {
        success: false,
        sku,
        externalId: targetIdentifier,
        stockQuantity: quantity,
        inStock: quantity > 0,
        error: msg,
      };
    }
  }

  public async batchUpdateStock(
    stockUpdates: CanonicalStock[],
    existingMappings?: Map<string, string>
  ): Promise<BatchStockUpdateResult> {
    if (!this.client) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'WooCommerce no está conectado');
    }

    const updates: Array<ReturnType<typeof WooCommerceStockMapper.mapToPayload>> = [];
    const itemResults: Array<{ sku: string; success: boolean; externalId?: string; error?: string }> = [];

    for (const stock of stockUpdates) {
      const targetIdStr = existingMappings?.get(stock.sku);
      if (targetIdStr) {
        const targetId = parseInt(targetIdStr, 10);
        updates.push(WooCommerceStockMapper.mapToPayload(stock, targetId));
      } else {
        itemResults.push({
          sku: stock.sku,
          success: false,
          error: `No existe correlación (mapping) para el artículo SKU: ${stock.sku}`,
        });
      }
    }

    const CHUNK_SIZE = 25;
    let succeeded = 0;
    let failed = itemResults.length;

    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const chunkStart = Date.now();
      try {
        const response = await this.client.post<{
          update?: Array<{ id: number; sku: string; error?: { message: string } }>;
        }>('products/batch', { update: chunk });

        if (response.update) {
          for (const item of response.update) {
            if (item.error) {
              failed++;
              itemResults.push({ sku: item.sku || String(item.id), success: false, error: item.error.message });
            } else {
              succeeded++;
              itemResults.push({ sku: item.sku || String(item.id), success: true, externalId: String(item.id) });
            }
          }
        }
      } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : String(error);
        for (const item of chunk) {
          failed++;
          itemResults.push({ sku: item.sku || String(item.id), success: false, error: errMessage });
        }
      }

      const elapsed = Date.now() - chunkStart;
      if (elapsed > 1500 && i + CHUNK_SIZE < updates.length) {
        this.logger.warn(`Latencia alta detectada en WooCommerce Stock (${elapsed}ms > 1500ms). Aplicando throttling adaptativo de 750ms...`);
        await new Promise((resolve) => setTimeout(resolve, 750));
      }
    }

    return {
      total: stockUpdates.length,
      succeeded,
      failed,
      items: itemResults,
    };
  }
}
