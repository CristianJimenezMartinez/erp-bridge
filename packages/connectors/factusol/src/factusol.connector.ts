import fs from 'fs';
import {
  ConnectionConfig,
  Connector,
  ConnectorCapabilities,
  ConnectorMetadata,
  DEFAULT_CAPABILITIES,
  HealthCheckResult,
  ReadProductsOptions,
  ReadOrdersOptions,
  ReadStockOptions,
  ReadInvoicesOptions,
  OrderMutationResult,
  CustomerMutationResult,
  InvoiceMutationResult,
  ConnectionError,
  ErrorCode,
} from '@erp-bridge/sdk';
import {
  CanonicalCustomer,
  CanonicalInvoice,
  CanonicalOrder,
  CanonicalProduct,
  CanonicalStock,
  Logger,
  OrderStatus,
} from '@erp-bridge/shared';
import { AccessDriver } from './access-driver';
import { FACTUSOL_QUERIES } from './queries';
import { FactusolYearResolver } from './access/year-resolver';
import {
  FactusolProductHandler,
  FactusolCustomerHandler,
  FactusolOrderHandler,
  FactusolStockHandler,
  FactusolInvoiceHandler,
} from './handlers';

export interface FactusolConnectionConfig {
  databasePath: string;
  tariffCode?: string;
  activeOnly?: boolean;
  provider?: string;
  orderSeries?: string;
  invoiceSeries?: string;
  defaultWarehouse?: string;
  autoRollover?: boolean;
  recordPayments?: boolean;
}

export class FactusolConnector implements Connector {
  private readonly logger = new Logger('FactusolConnector');
  private driver: AccessDriver | null = null;
  private config: FactusolConnectionConfig | null = null;

  // Domain Handlers
  private productHandler: FactusolProductHandler | null = null;
  private customerHandler: FactusolCustomerHandler | null = null;
  private orderHandler: FactusolOrderHandler | null = null;
  private stockHandler: FactusolStockHandler | null = null;
  private invoiceHandler: FactusolInvoiceHandler | null = null;

  public getMetadata(): ConnectorMetadata {
    return {
      id: 'connector-factusol',
      name: 'Factusol ERP',
      slug: 'factusol',
      version: '1.0.0',
      author: 'Bentian / ERP Bridge',
      description: 'Conector local de Factusol mediante base de datos Access (.accdb/.mdb) y OLEDB',
      icon: 'database',
      docsUrl: 'https://docs.erpbridge.io/connectors/factusol',
    };
  }

  public getCapabilities(): ConnectorCapabilities {
    return {
      ...DEFAULT_CAPABILITIES,
      supportsReadProducts: true,
      supportsReadStock: true,
      supportsBatchOperations: true,
      supportsReadOrders: true,
      supportsWriteOrders: true,
      supportsWriteCustomers: true,
    };
  }

  public async connect(config: ConnectionConfig): Promise<void> {
    const rawConfig = (((config as unknown as { configuration?: FactusolConnectionConfig })?.configuration || config) as unknown) as FactusolConnectionConfig;
    const dbPath = rawConfig?.databasePath;

    if (!dbPath || typeof dbPath !== 'string') {
      throw new ConnectionError(
        ErrorCode.CONNECTION_FAILED,
        'La propiedad "databasePath" es obligatoria en la configuración de Factusol',
        { config: rawConfig }
      );
    }

    const autoRollover = rawConfig.autoRollover !== false;
    let activeDbPath = dbPath;

    if (autoRollover) {
      const resolution = FactusolYearResolver.resolveActiveDatabase(dbPath, true);
      if (resolution.switched) {
        this.logger.info(
          `Cambio automático de ejercicio fiscal detectado en Factusol: ejercicio ${resolution.previousYear} -> ${resolution.currentYear}`,
          {
            previousYear: resolution.previousYear,
            currentYear: resolution.currentYear,
            configuredPath: dbPath,
            activePath: resolution.activePath,
          }
        );
        activeDbPath = resolution.activePath;
      }
    }

    if (!fs.existsSync(activeDbPath)) {
      throw new ConnectionError(
        ErrorCode.CONNECTION_FAILED,
        `No se encuentra el archivo de base de datos Factusol: ${activeDbPath}`,
        { databasePath: activeDbPath }
      );
    }

    this.config = {
      databasePath: activeDbPath,
      tariffCode: rawConfig.tariffCode || '1',
      activeOnly: rawConfig.activeOnly !== false,
      provider: rawConfig.provider,
      orderSeries: rawConfig.orderSeries || ' ',
      invoiceSeries: rawConfig.invoiceSeries || '1',
      defaultWarehouse: rawConfig.defaultWarehouse || 'GEN',
      autoRollover,
    };

    this.driver = new AccessDriver({
      databasePath: activeDbPath,
      provider: rawConfig.provider,
    });

    // Initialize domain handlers
    this.customerHandler = new FactusolCustomerHandler(this.driver, this.logger);
    this.productHandler = new FactusolProductHandler(this.driver, this.config, this.logger);
    this.orderHandler = new FactusolOrderHandler(this.driver, this.config, this.customerHandler, this.logger);
    this.stockHandler = new FactusolStockHandler(this.driver, this.config, this.logger);
    this.invoiceHandler = new FactusolInvoiceHandler(this.driver, this.config, this.logger);

    this.logger.info('Factusol connector configured successfully', { databasePath: dbPath });
  }

  public async disconnect(): Promise<void> {
    this.driver = null;
    this.config = null;
    this.productHandler = null;
    this.customerHandler = null;
    this.orderHandler = null;
    this.stockHandler = null;
    this.invoiceHandler = null;
    this.logger.info('Factusol connector disconnected');
  }

  public async healthCheck(): Promise<HealthCheckResult> {
    if (!this.driver || !this.config) {
      return {
        status: 'DOWN',
        message: 'El conector de Factusol no está inicializado ni conectado',
      };
    }

    const start = Date.now();
    try {
      this.driver.verifyFileExists();
      const rows = await this.driver.query<{ CODART: string }>(FACTUSOL_QUERIES.healthCheck());
      const latencyMs = Date.now() - start;

      const fileStats = fs.statSync(this.config.databasePath);

      return {
        status: 'HEALTHY',
        latencyMs,
        message: `Conexión OLEDB establecida con Factusol. Acceso correcto a ${rows.length > 0 ? 'F_ART' : 'tablas'}.`,
        details: {
          databasePath: this.config.databasePath,
          fileSizeBytes: fileStats.size,
          lastModified: fileStats.mtime,
        },
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'DOWN',
        latencyMs,
        message: `Error al comprobar la salud de Factusol: ${message}`,
        details: {
          databasePath: this.config?.databasePath,
        },
      };
    }
  }

  // --- Product Operations ---
  public async readProducts(options?: ReadProductsOptions): Promise<CanonicalProduct[]> {
    this.ensureConnected();
    return this.productHandler!.readProducts(options);
  }

  // --- Customer Operations ---
  public async findCustomer(criteria: { taxId?: string; email?: string }): Promise<CanonicalCustomer | null> {
    this.ensureConnected();
    return this.customerHandler!.findCustomer(criteria);
  }

  public async createCustomer(customer: CanonicalCustomer): Promise<CustomerMutationResult> {
    this.ensureConnected();
    return this.customerHandler!.createCustomer(customer);
  }

  // --- Order Operations ---
  public async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
    this.ensureConnected();
    return this.orderHandler!.createOrder(order);
  }

  public async readOrders(options?: ReadOrdersOptions): Promise<CanonicalOrder[]> {
    this.ensureConnected();
    return this.orderHandler!.readOrders(options);
  }

  public async updateOrderStatus(
    orderId: string,
    status: OrderStatus | string
  ): Promise<OrderMutationResult> {
    this.ensureConnected();
    return this.orderHandler!.updateOrderStatus(orderId, status);
  }

  // --- Stock Operations ---
  public async readStock(options?: ReadStockOptions): Promise<CanonicalStock[]> {
    this.ensureConnected();
    return this.stockHandler!.readStock(options);
  }

  // --- Invoice Operations ---
  public async readInvoices(options?: ReadInvoicesOptions): Promise<CanonicalInvoice[]> {
    this.ensureConnected();
    return this.invoiceHandler!.readInvoices(options);
  }

  public async createInvoice(invoice: CanonicalInvoice): Promise<InvoiceMutationResult> {
    this.ensureConnected();
    return this.invoiceHandler!.createInvoice(invoice);
  }

  public async updateInvoiceStatus(
    invoiceId: string,
    status: string
  ): Promise<InvoiceMutationResult> {
    this.ensureConnected();
    return this.invoiceHandler!.updateInvoiceStatus(invoiceId, status);
  }

  /**
   * Obtiene la lista de ejercicios fiscales disponibles en el directorio de la empresa.
   */
  public getFiscalYears(): { year: number; path: string }[] {
    this.ensureConnected();
    return FactusolYearResolver.getAvailableYears(this.config!.databasePath);
  }

  private ensureConnected(): void {
    if (!this.driver || !this.config) {
      throw new ConnectionError(
        ErrorCode.CONNECTION_NOT_FOUND,
        'Factusol no está conectado. Llame a connect() primero.'
      );
    }
  }
}
