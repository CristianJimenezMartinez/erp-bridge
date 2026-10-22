import fs from 'fs';
import path from 'path';
import {
  ConnectionConfig,
  Connector,
  ConnectorCapabilities,
  ConnectorMetadata,
  DEFAULT_CAPABILITIES,
  HealthCheckResult,
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
} from '@erp-bridge/shared';
import {
  getArticlesQuery,
  updateStockQuery,
  decrementStockQuery,
  findCustomerByCifQuery,
  findCustomerByEmailQuery,
  insertCustomerQuery,
  findOrderByReferenceQuery,
  getNextOrderIdQuery,
  insertOrderHeaderQuery,
  insertOrderLineQuery,
  readOrdersQuery,
  readOrderLinesQuery,
} from './queries';
import {
  mapSimplyGestArticleToCanonical,
  SimplyGestArticleRaw,
  mapSimplyGestCustomerToCanonical,
  SimplyGestCustomerRaw,
  mapSimplyGestOrderToCanonical,
  SimplyGestOrderRaw,
  SimplyGestOrderLineRaw,
} from './mappers';
import { SimplyGestMultiDriver } from './simplygest-multi.driver';

export interface SimplyGestConnectionConfig {
  databasePath: string;
  apiUrl?: string;
  apiKey?: string;
  provider?: string;
  cscriptPath?: string;
}

export class SimplyGestConnector implements Connector {
  private readonly logger = new Logger('SimplyGestConnector');
  private driver: SimplyGestMultiDriver | null = null;
  private config: SimplyGestConnectionConfig | null = null;

  public getMetadata(): ConnectorMetadata {
    return {
      id: 'connector-simplygest',
      name: 'SimplyGest',
      slug: 'simplygest',
      version: '1.0.0',
      author: 'Bentian / ERP Bridge',
      description: 'Conector para SimplyGest Desktop mediante acceso nativo a base de datos Datos.mdb',
      icon: 'database',
      docsUrl: 'https://docs.erpbridge.io/connectors/simplygest',
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
      supportsBatchOperations: true,
      supportsWebhooks: false,
    };
  }

  public async connect(config: ConnectionConfig): Promise<void> {
    const rawConfig = {
      ...config.configuration,
      ...config.credentials,
    } as unknown as SimplyGestConnectionConfig;

    const databasePath = rawConfig?.databasePath;

    if (!databasePath || typeof databasePath !== 'string') {
      throw new ConnectionError(
        ErrorCode.CONNECTION_FAILED,
        'La ruta a la base de datos de SimplyGest (Datos.mdb) es obligatoria ("databasePath")'
      );
    }

    const isHttpApi = /^(https?|sgapi):\/\//i.test(databasePath.trim());
    const resolvedPath = isHttpApi ? databasePath.trim() : path.resolve(databasePath);
    if (!isHttpApi && !fs.existsSync(resolvedPath)) {
      throw new ConnectionError(
        ErrorCode.CONNECTION_FAILED,
        `El archivo o carpeta de SimplyGest no existe en la ruta: ${resolvedPath}`,
        { databasePath: resolvedPath }
      );
    }

    this.config = {
      databasePath: resolvedPath,
      apiUrl: rawConfig.apiUrl,
      apiKey: rawConfig.apiKey,
      provider: rawConfig.provider || 'Microsoft.ACE.OLEDB.12.0',
      cscriptPath: rawConfig.cscriptPath,
    };

    this.driver = new SimplyGestMultiDriver(this.config);
    this.logger.info('Conector SimplyGest conectado exitosamente', {
      databasePath: resolvedPath,
      mode: this.driver.mode,
    });
  }

  public async disconnect(): Promise<void> {
    this.driver = null;
    this.config = null;
    this.logger.info('Conector SimplyGest desconectado.');
  }

  public async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    if (!this.driver || !this.config) {
      return {
        status: 'DOWN',
        latencyMs: 0,
        message: 'SimplyGest no está conectado. Llame a connect() primero.',
      };
    }

    try {
      this.driver.verifyFileExists();
      const rows = await this.driver.query<{ test: number }>('SELECT 1 AS test');
      const latencyMs = Date.now() - start;

      if (!rows || rows.length === 0) {
        return {
          status: 'DEGRADED',
          latencyMs,
          message: 'La consulta de prueba a SimplyGest no devolvió resultados',
        };
      }

      const isHttpApi = /^(https?|sgapi):\/\//i.test(this.config.databasePath);
      const fileStats = !isHttpApi && fs.existsSync(this.config.databasePath)
        ? fs.statSync(this.config.databasePath)
        : null;
      return {
        status: 'HEALTHY',
        latencyMs,
        message: `Conexión a SimplyGest (${this.driver.mode}) operativa`,
        details: {
          databasePath: this.config.databasePath,
          mode: this.driver.mode,
          fileSizeBytes: fileStats?.size ?? 0,
          lastModified: fileStats?.mtime ? fileStats.mtime.toISOString() : new Date().toISOString(),
        },
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'DOWN',
        latencyMs,
        message: `Error al comprobar la salud de SimplyGest: ${message}`,
        details: { databasePath: this.config?.databasePath },
      };
    }
  }

  public async testConnection(): Promise<HealthCheckResult> {
    return this.healthCheck();
  }

  // --- Product Operations ---

  public async readProducts(options?: ReadProductsOptions): Promise<CanonicalProduct[]> {
    if (!this.driver || !this.config) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'SimplyGest no está conectado.');
    }

    const limit = options?.limit;
    this.logger.info('Leyendo productos de SimplyGest (ARTICULOS)...', { limit });

    const safeLimit = limit && !isNaN(Number(limit)) ? Math.max(1, Math.min(50000, Math.floor(Number(limit)))) : undefined;
    const topClause = safeLimit ? `TOP ${safeLimit}` : '';
    const sqlAllColumns = `
      SELECT ${topClause} *
      FROM ARTICULOS
      WHERE CODIGO IS NOT NULL AND CODIGO <> ''
      ORDER BY CODIGO ASC
    `.trim();

    let rawArticles: SimplyGestArticleRaw[];
    try {
      rawArticles = await this.driver.query<SimplyGestArticleRaw>(sqlAllColumns);
    } catch {
      const sql = getArticlesQuery(limit);
      rawArticles = await this.driver.query<SimplyGestArticleRaw>(sql);
    }

    const canonicalProducts = rawArticles.map((raw) => mapSimplyGestArticleToCanonical(raw));
    this.logger.info(`Lectura de productos de SimplyGest completada: ${canonicalProducts.length} productos procesados.`);
    return canonicalProducts;
  }

  // --- Stock Operations ---

  public async readStock(options?: ReadStockOptions): Promise<CanonicalStock[]> {
    if (!this.driver || !this.config) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'SimplyGest no está conectado.');
    }

    const skus = options?.skus;
    let rawArticles: SimplyGestArticleRaw[];
    if (skus && Array.isArray(skus) && skus.length > 0) {
      const validSkus = skus
        .map((s) => String(s || '').replace(/[\x00-\x1f]/g, '').trim())
        .filter((s) => s.length > 0 && s.length <= 100);
      if (validSkus.length > 0) {
        const escaped = validSkus.map((s) => `'${s.replace(/'/g, "''")}'`).join(',');
        const sql = `SELECT CODIGO, STOCK FROM ARTICULOS WHERE CODIGO IN (${escaped})`;
        rawArticles = await this.driver.query<SimplyGestArticleRaw>(sql);
      } else {
        rawArticles = [];
      }
    } else {
      const sql = 'SELECT CODIGO, STOCK FROM ARTICULOS WHERE CODIGO IS NOT NULL';
      rawArticles = await this.driver.query<SimplyGestArticleRaw>(sql);
    }

    return rawArticles.map((raw) => {
      const sku = String(raw.CODIGO ?? '').trim();
      const qty = Number(raw.STOCK) || 0;
      return {
        sku,
        quantity: qty,
        warehouse: options?.warehouse || 'GEN',
        lastUpdated: new Date(),
      };
    });
  }

  public async updateStock(sku: string, quantity: number): Promise<StockMutationResult> {
    if (!this.driver) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'SimplyGest no está conectado.');
    }

    try {
      const sql = updateStockQuery(sku, quantity);
      await this.driver.execute(sql);
      this.logger.info(`Stock actualizado en SimplyGest para artículo ${sku}: ${quantity}`);

      return {
        success: true,
        sku,
        stockQuantity: quantity,
        inStock: quantity > 0,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al actualizar stock de artículo ${sku} en SimplyGest`, error);
      return {
        success: false,
        sku,
        stockQuantity: quantity,
        inStock: quantity > 0,
        error: msg,
      };
    }
  }

  // --- Customer Operations ---

  public async findCustomer(criteria: { taxId?: string; email?: string }): Promise<CanonicalCustomer | null> {
    if (!this.driver) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'SimplyGest no está conectado.');
    }

    if (criteria.taxId && criteria.taxId.trim()) {
      const rows = await this.driver.query<SimplyGestCustomerRaw>(findCustomerByCifQuery(criteria.taxId.trim()));
      if (rows.length > 0) {
        return mapSimplyGestCustomerToCanonical(rows[0]!);
      }
    }

    if (criteria.email && criteria.email.trim()) {
      const rows = await this.driver.query<SimplyGestCustomerRaw>(findCustomerByEmailQuery(criteria.email.trim()));
      if (rows.length > 0) {
        return mapSimplyGestCustomerToCanonical(rows[0]!);
      }
    }

    return null;
  }

  public async createCustomer(customer: CanonicalCustomer): Promise<CustomerMutationResult> {
    if (!this.driver) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'SimplyGest no está conectado.');
    }

    try {
      const maxRows = await this.driver.query<{ maxid: string }>('SELECT MAX(CODIGO) AS maxid FROM CLIENTES');
      const currentMax = Number(maxRows[0]?.maxid) || 1000;
      const nextCode = String(currentMax + 1);

      const sql = insertCustomerQuery(customer, nextCode);
      await this.driver.execute(sql);
      this.logger.info(`Cliente creado en SimplyGest (CODIGO=${nextCode}): ${customer.fiscalName}`);

      return {
        success: true,
        customerId: customer.id,
        externalId: nextCode,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error al crear cliente en SimplyGest', error);
      return {
        success: false,
        customerId: customer.id,
        externalId: '',
        error: msg,
      };
    }
  }

  // --- Order Operations ---

  public async readOrders(options?: ReadOrdersOptions): Promise<CanonicalOrder[]> {
    if (!this.driver) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'SimplyGest no está conectado.');
    }

    const limit = options?.limit || 50;
    const orderHeaders = await this.driver.query<SimplyGestOrderRaw>(readOrdersQuery(limit));
    const canonicalOrders: CanonicalOrder[] = [];

    for (const header of orderHeaders) {
      const orderNumber = String(header.NUMERO);
      const lines = await this.driver.query<SimplyGestOrderLineRaw>(readOrderLinesQuery(orderNumber)).catch(() => [] as SimplyGestOrderLineRaw[]);
      canonicalOrders.push(mapSimplyGestOrderToCanonical(header, lines));
    }

    return canonicalOrders;
  }

  public async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
    if (!this.driver || !this.config) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'SimplyGest no está conectado.');
    }

    const reference = order.reference || `WC-${order.orderNumber || order.id}`;

    try {
      if (reference) {
        const existing = await this.driver.query<SimplyGestOrderRaw>(findOrderByReferenceQuery(reference));
        if (existing.length > 0) {
          const existingOrder = existing[0]!;
          this.logger.info(`Pedido con referencia ${reference} ya existe en SimplyGest (NUMERO=${existingOrder.NUMERO})`);
          return {
            success: true,
            orderId: order.id,
            externalId: String(existingOrder.NUMERO),
            orderNumber: String(existingOrder.NUMERO),
            status: 'pending',
          };
        }
      }

      // Customer resolution
      let customerCode = '1';
      if (order.customer.customerNumber) {
        customerCode = order.customer.customerNumber;
      } else {
        const found = await this.findCustomer({
          taxId: order.customer.taxId,
          email: order.customer.email,
        });

        if (found && found.customerNumber) {
          customerCode = found.customerNumber;
        } else {
          const created = await this.createCustomer(order.customer);
          if (created.success && created.externalId) {
            customerCode = created.externalId;
          }
        }
      }

      // Generate order number
      const maxRows = await this.driver.query<{ maxid: string }>(getNextOrderIdQuery());
      const nextOrderNumber = String((Number(maxRows[0]?.maxid) || 100) + 1);

      // Multi-statement atomic transaction: header + all lines + stock deduction
      const headerSql = insertOrderHeaderQuery(order, nextOrderNumber, customerCode);
      const lineSqls = order.lines.map((line: any, idx: number) =>
        insertOrderLineQuery(line, nextOrderNumber, idx + 1)
      );
      const stockSqls = order.lines
        .filter((line: any) => line && line.sku && Number(line.quantity) > 0)
        .map((line: any) => decrementStockQuery(String(line.sku), Number(line.quantity)));

      await this.driver.executeTransaction([headerSql, ...lineSqls, ...stockSqls]);
      this.logger.info(`Pedido creado exitosamente en SimplyGest (NUMERO=${nextOrderNumber}) para ref ${reference}`);

      return {
        success: true,
        orderId: order.id,
        externalId: nextOrderNumber,
        orderNumber: nextOrderNumber,
        status: 'pending',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al insertar pedido en SimplyGest (ref: ${reference})`, error);
      return {
        success: false,
        orderId: order.id,
        externalId: '',
        error: msg,
      };
    }
  }
}
