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
  CanonicalOrderLine,
  CanonicalProduct,
  CanonicalStock,
  Logger,
  OrderStatus,
} from '@erp-bridge/shared';
import { AccessDriver } from './access-driver';
import {
  FACTUSOL_QUERIES,
  FactusolRawArticle,
  FactusolRawFamily,
  FactusolRawPrice,
  FactusolRawStock,
  findCustomerByEmailQuery,
  findCustomerByNifQuery,
  findDeliveryAddressQuery,
  getNextDeliveryAddressIdQuery,
  insertDeliveryAddressQuery,
  normalizeTaxId,
  findOrderByReferenceQuery,
  getNextCustomerIdQuery,
  getNextOrderIdQuery,
  insertCustomerQuery,
  insertOrderHeaderQuery,
  insertOrderLineQuery,
  readOrderLinesQuery,
  readOrdersQuery,
  readStockBySkusQuery,
  readStockQuery,
  updateOrderStatusQuery,
  SELECT_INVOICES_HEADER_QUERY,
  SELECT_INVOICE_LINES_QUERY,
} from './queries';
import {
  buildFamilyMap,
  buildPriceMap,
  buildStockMap,
  mapFactusolArticleToCanonical,
  FactusolCustomerRaw,
  FactusolOrderLineRaw,
  FactusolOrderRaw,
  FactusolStockRaw,
  FactusolOrderMapper,
  FactusolStockMapper,
  FactusolInvoiceMapper,
} from './mappers';

export interface FactusolConnectionConfig {
  databasePath: string;
  tariffCode?: string;
  activeOnly?: boolean;
  provider?: string;
  orderSeries?: string;
  invoiceSeries?: string;
  defaultWarehouse?: string;
}

export class FactusolConnector implements Connector {
  private readonly logger = new Logger('FactusolConnector');
  private driver: AccessDriver | null = null;
  private config: FactusolConnectionConfig | null = null;

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
    const rawConfig = config.configuration as unknown as FactusolConnectionConfig;
    const dbPath = rawConfig?.databasePath;

    if (!dbPath || typeof dbPath !== 'string') {
      throw new ConnectionError(
        ErrorCode.CONNECTION_FAILED,
        'La propiedad "databasePath" es obligatoria en la configuración de Factusol',
        { config: config.configuration }
      );
    }

    if (!fs.existsSync(dbPath)) {
      throw new ConnectionError(
        ErrorCode.CONNECTION_FAILED,
        `No se encuentra el archivo de base de datos Factusol: ${dbPath}`,
        { databasePath: dbPath }
      );
    }

    this.config = {
      databasePath: dbPath,
      tariffCode: rawConfig.tariffCode || '1',
      activeOnly: rawConfig.activeOnly !== false,
      provider: rawConfig.provider,
      orderSeries: rawConfig.orderSeries || ' ',
      invoiceSeries: rawConfig.invoiceSeries || '1',
      defaultWarehouse: rawConfig.defaultWarehouse || 'GEN',
    };

    this.driver = new AccessDriver({
      databasePath: dbPath,
      provider: rawConfig.provider,
    });

    this.logger.info('Factusol connector configured successfully', { databasePath: dbPath });
  }

  public async disconnect(): Promise<void> {
    this.driver = null;
    this.config = null;
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

  public async readProducts(options?: ReadProductsOptions): Promise<CanonicalProduct[]> {
    if (!this.driver || !this.config) {
      throw new ConnectionError(
        ErrorCode.CONNECTION_NOT_FOUND,
        'Factusol no está conectado. Llame a connect() primero.'
      );
    }

    const activeOnly = options?.activeOnly ?? this.config.activeOnly ?? true;
    const limit = options?.limit;

    this.logger.info('Leyendo productos de Factusol...', { activeOnly, limit });

    // 1. Fetch raw articles
    const articleQuery = activeOnly
      ? FACTUSOL_QUERIES.getArticles(true, limit)
      : FACTUSOL_QUERIES.getAllArticles(limit);

    const rawArticles = await this.driver.query<FactusolRawArticle>(articleQuery);

    // 2. Fetch stock, prices, and families sequentially for enrichment
    const stocks = await this.driver.query<FactusolRawStock>(FACTUSOL_QUERIES.getStock()).catch(() => [] as FactusolRawStock[]);
    const prices = await this.driver.query<FactusolRawPrice>(FACTUSOL_QUERIES.getPrices(this.config.tariffCode || '1')).catch(() => [] as FactusolRawPrice[]);
    const families = await this.driver.query<FactusolRawFamily>(FACTUSOL_QUERIES.getFamilies()).catch(() => [] as FactusolRawFamily[]);

    const stockMap = buildStockMap(stocks);
    const priceMap = buildPriceMap(prices);
    const familyMap = buildFamilyMap(families);

    // 3. Map to CanonicalProduct
    const canonicalProducts: CanonicalProduct[] = rawArticles.map((raw) =>
      mapFactusolArticleToCanonical(raw, { stockMap, priceMap, familyMap })
    );

    this.logger.info(`Lectura de productos de Factusol completada: ${canonicalProducts.length} productos procesados.`);
    return canonicalProducts;
  }

  // --- Customer Operations ---

  public async findCustomer(criteria: { taxId?: string; email?: string }): Promise<CanonicalCustomer | null> {
    if (!this.driver) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'Factusol no está conectado.');
    }

    if (criteria.taxId && criteria.taxId.trim()) {
      const rows = await this.driver.query<FactusolCustomerRaw>(findCustomerByNifQuery(criteria.taxId.trim()));
      if (rows.length > 0) {
        return FactusolOrderMapper.toCanonicalCustomer(rows[0]!);
      }
    }

    if (criteria.email && criteria.email.trim()) {
      const rows = await this.driver.query<FactusolCustomerRaw>(findCustomerByEmailQuery(criteria.email.trim()));
      if (rows.length > 0) {
        return FactusolOrderMapper.toCanonicalCustomer(rows[0]!);
      }
    }

    return null;
  }

  public async createCustomer(customer: CanonicalCustomer): Promise<CustomerMutationResult> {
    if (!this.driver) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'Factusol no está conectado.');
    }

    try {
      const maxRows = await this.driver.query<{ maxid: number }>(getNextCustomerIdQuery());
      const nextId = (Number(maxRows[0]?.maxid) || 0) + 1;

      const sql = insertCustomerQuery(customer, nextId);
      await this.driver.execute(sql);

      this.logger.info(`Cliente creado en Factusol (CODCLI=${nextId}): ${customer.fiscalName}`);

      return {
        success: true,
        customerId: customer.id,
        externalId: String(nextId),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error al crear cliente en Factusol', error);
      return {
        success: false,
        customerId: customer.id,
        externalId: '',
        error: msg,
      };
    }
  }

  // --- Order Operations ---

  public async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
    if (!this.driver || !this.config) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'Factusol no está conectado.');
    }

    const series = order.series || this.config.orderSeries || ' ';
    const reference = order.reference || order.orderNumber;

    try {
      // 1. Verificar idempotencia con findOrderByReferenceQuery
      if (reference) {
        const existing = await this.driver.query<FactusolOrderRaw>(findOrderByReferenceQuery(reference));
        if (existing.length > 0) {
          const existingOrder = existing[0]!;
          this.logger.info(`Pedido con referencia ${reference} ya existe en Factusol (CODPCL=${existingOrder.CODPCL})`);
          return {
            success: true,
            orderId: order.id,
            externalId: String(existingOrder.CODPCL),
            orderNumber: String(existingOrder.CODPCL),
            status: FactusolOrderMapper.mapStatusCodeToOrderStatus(existingOrder.ESTPCL),
          };
        }
      }

      // 2. Deduplicar cliente buscando por NIF normalizado o email. Si no existe, crear con createCustomer()
      let customerCode = 0;
      if (order.customer.customerNumber && !isNaN(Number(order.customer.customerNumber))) {
        customerCode = Number(order.customer.customerNumber);
      } else {
        const normalizedTaxId = normalizeTaxId(order.customer.taxId);
        const found = await this.findCustomer({
          taxId: normalizedTaxId || order.customer.taxId,
          email: order.customer.email,
        });

        if (found && found.customerNumber) {
          customerCode = Number(found.customerNumber);
        } else {
          const customerToCreate: CanonicalCustomer = {
            ...order.customer,
            taxId: normalizedTaxId || order.customer.taxId,
          };
          const createdCust = await this.createCustomer(customerToCreate);
          if (createdCust.success && createdCust.externalId) {
            customerCode = Number(createdCust.externalId);
          } else {
            throw new Error(`No se pudo crear cliente para el pedido: ${createdCust.error || 'Error desconocido'}`);
          }
        }
      }

      // 3. Si la dirección de envío difiere de la fiscal, buscar o crear la dirección alternativa en F_DCL
      const fiscalAddr = order.billingAddress || order.customer.address;
      const shipAddr = order.shippingAddress;
      const isDifferentAddress = Boolean(
        shipAddr &&
        fiscalAddr &&
        (
          (shipAddr.street && fiscalAddr.street && shipAddr.street.trim().toLowerCase() !== fiscalAddr.street.trim().toLowerCase()) ||
          (shipAddr.postalCode && fiscalAddr.postalCode && shipAddr.postalCode.trim().toLowerCase() !== fiscalAddr.postalCode.trim().toLowerCase()) ||
          (shipAddr.city && fiscalAddr.city && shipAddr.city.trim().toLowerCase() !== fiscalAddr.city.trim().toLowerCase())
        )
      );

      if (isDifferentAddress && shipAddr && shipAddr.street && customerCode > 0) {
        const street = shipAddr.street.trim();
        const postalCode = (shipAddr.postalCode || '').trim();
        try {
          const existingAddr = await this.driver.query<Record<string, unknown>>(
            findDeliveryAddressQuery(customerCode, street, postalCode)
          );

          if (!existingAddr || existingAddr.length === 0) {
            const maxDirRows = await this.driver.query<{ maxid: number }>(
              getNextDeliveryAddressIdQuery(customerCode)
            );
            const nextDirCode = (Number(maxDirRows[0]?.maxid) || 0) + 1;
            const recipientName = [shipAddr.firstName, shipAddr.lastName].filter(Boolean).join(' ') ||
              order.customer.fiscalName ||
              'Destinatario';

            const insertDirSql = insertDeliveryAddressQuery(
              customerCode,
              nextDirCode,
              shipAddr,
              recipientName
            );
            await this.driver.execute(insertDirSql);
            this.logger.info(`Dirección de entrega alternativa creada en F_DCL (CODDCL=${nextDirCode}) para cliente ${customerCode}`);
          }
        } catch (addrErr) {
          this.logger.warn(`Aviso al gestionar dirección alternativa F_DCL: ${addrErr instanceof Error ? addrErr.message : String(addrErr)}`);
        }
      }

      // 4. Transacción atómica: agrupar cabecera y líneas en un único executeTransaction([headerSql, ...lineSqls])
      // 5. Bucle de reintento automático (hasta 5 intentos con backoff) ante colisión de correlativo en CODPCL
      const MAX_RETRIES = 5;
      let lastError: unknown = null;
      let orderCreated = false;
      let finalOrderCode = 0;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const maxRows = await this.driver.query<{ maxid: number }>(getNextOrderIdQuery(series));
          const nextOrderCode = (Number(maxRows[0]?.maxid) || 0) + 1;
          const headerSql = insertOrderHeaderQuery(order, nextOrderCode, customerCode);
          const lineSqls = order.lines.map((line: CanonicalOrderLine) => insertOrderLineQuery(line, nextOrderCode, series));

          await this.driver.executeTransaction([headerSql, ...lineSqls]);

          finalOrderCode = nextOrderCode;
          orderCreated = true;
          this.logger.info(`Pedido creado exitosamente en Factusol (CODPCL=${nextOrderCode}, Serie='${series}') para ref ${reference} (intento ${attempt})`);
          break;
        } catch (err: unknown) {
          lastError = err;
          this.logger.warn(`Colisión o fallo en intento ${attempt}/${MAX_RETRIES} al insertar pedido ${reference} en Factusol: ${err instanceof Error ? err.message : String(err)}`);
          if (attempt < MAX_RETRIES) {
            const backoffMs = 100 * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }

      if (!orderCreated) {
        throw lastError || new Error(`No se pudo crear el pedido tras ${MAX_RETRIES} intentos`);
      }

      return {
        success: true,
        orderId: order.id,
        externalId: String(finalOrderCode),
        orderNumber: String(finalOrderCode),
        status: 'pending',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al insertar pedido en Factusol para ref ${reference}`, error);
      return {
        success: false,
        orderId: order.id,
        externalId: '',
        error: msg,
      };
    }
  }

  public async readOrders(options?: ReadOrdersOptions): Promise<CanonicalOrder[]> {
    if (!this.driver) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'Factusol no está conectado.');
    }

    const limit = options?.limit || 50;
    const rawHeaders = await this.driver.query<FactusolOrderRaw>(readOrdersQuery(limit));
    const canonicalOrders: CanonicalOrder[] = [];

    for (const header of rawHeaders) {
      const series = String(header.TIPPCL ?? '').trim();
      const lines = await this.driver.query<FactusolOrderLineRaw>(readOrderLinesQuery(header.CODPCL, series)).catch(() => []);
      canonicalOrders.push(FactusolOrderMapper.toCanonicalOrder(header, lines));
    }

    return canonicalOrders;
  }

  public async updateOrderStatus(
    orderId: string,
    status: OrderStatus | string
  ): Promise<OrderMutationResult> {
    if (!this.driver || !this.config) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'Factusol no está conectado.');
    }

    const orderCode = parseInt(orderId, 10);
    if (isNaN(orderCode)) {
      throw new ConnectionError(ErrorCode.VALIDATION_ERROR, `ID de pedido Factusol inválido: ${orderId}`);
    }

    const series = this.config.orderSeries || ' ';
    const statusCode = FactusolOrderMapper.mapOrderStatusToStatusCode(status);

    await this.driver.execute(updateOrderStatusQuery(orderCode, series, statusCode));
    this.logger.info(`Estado de pedido actualizado en Factusol: CODPCL=${orderCode}, ESTPCL=${statusCode} (${status})`);

    return {
      success: true,
      orderId,
      externalId: String(orderCode),
      status,
    };
  }

  // --- Stock Operations ---

  public async readStock(options?: ReadStockOptions): Promise<CanonicalStock[]> {
    if (!this.driver) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'Factusol no está conectado.');
    }

    const warehouse = options?.warehouse || this.config?.defaultWarehouse;
    const query = options?.skus && options.skus.length > 0
      ? readStockBySkusQuery(options.skus, warehouse)
      : readStockQuery({ ...options, warehouse });

    this.logger.info('Leyendo stock desde Factusol (F_STO)...', { warehouse, skusCount: options?.skus?.length });

    const rawStocks = await this.driver.query<FactusolStockRaw>(query);
    return rawStocks.map((raw) => FactusolStockMapper.toCanonicalStock(raw));
  }

  // --- Invoice Operations ---

  public async readInvoices(options?: ReadInvoicesOptions): Promise<CanonicalInvoice[]> {
    if (!this.driver) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'Factusol no está conectado.');
    }

    const query = SELECT_INVOICES_HEADER_QUERY;
    const headers = await this.driver.query<Record<string, unknown>>(query);
    const limit = options?.limit || 50;
    const slice = headers.slice(0, limit);

    const invoices: CanonicalInvoice[] = [];
    for (const h of slice) {
      const tipfac = String(h['TIPFAC'] || h['tipfac'] || '1').trim();
      const codfac = Number(h['CODFAC'] || h['codfac'] || 0);

      const linesQuery = SELECT_INVOICE_LINES_QUERY
        .replace('?', `'${tipfac}'`)
        .replace('?', String(codfac));

      const lines = await this.driver.query<Record<string, unknown>>(linesQuery).catch(() => []);
      invoices.push(FactusolInvoiceMapper.toCanonical(h, lines));
    }

    return invoices;
  }

  public async createInvoice(invoice: CanonicalInvoice): Promise<InvoiceMutationResult> {
    if (!this.driver || !this.config) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'Factusol no está conectado.');
    }

    const series = (invoice.series || this.config.invoiceSeries || '1').substring(0, 1);
    const ref = invoice.orderReference || invoice.invoiceNumber;

    try {
      // 1. Idempotency check: does this invoice ref already exist in F_FAC?
      if (ref) {
        const lookupRef = ref.substring(0, 20).replace(/'/g, "''");
        const checkSql = `SELECT CODFAC, TIPFAC, REFFAC, TOTFAC FROM F_FAC WHERE REFFAC = '${lookupRef}' AND TIPFAC = '${series}'`;
        const existing = await this.driver.query<{ CODFAC: number; TIPFAC: string }>(checkSql);
        if (existing && existing.length > 0) {
          const found = existing[0]!;
          this.logger.info(`Factura con referencia ${ref} ya existe en Factusol (CODFAC=${found.CODFAC})`);
          return {
            success: true,
            invoiceId: invoice.id,
            externalId: String(found.CODFAC),
            invoiceNumber: String(found.CODFAC),
            series: found.TIPFAC,
            status: 'issued',
          };
        }
      }

      // 2. Calculate next available invoice ID in F_FAC and F_LFA for this series
      const maxHeaderRows = await this.driver.query<{ maxid: number }>(`SELECT MAX(CODFAC) AS maxid FROM F_FAC WHERE TIPFAC = '${series}'`);
      const maxLineRows = await this.driver.query<{ maxid: number }>(`SELECT MAX(CODLFA) AS maxid FROM F_LFA WHERE TIPLFA = '${series}'`);
      const maxHeader = Number(maxHeaderRows[0]?.maxid) || 0;
      const maxLine = Number(maxLineRows[0]?.maxid) || 0;
      const nextInvoiceId = Math.max(maxHeader, maxLine) + 1;

      // 3. Map to Factusol header & lines
      const header = FactusolInvoiceMapper.toFactusolHeader(invoice, nextInvoiceId, this.config.defaultWarehouse);
      const lines = FactusolInvoiceMapper.toFactusolLines(invoice, nextInvoiceId);

      // 4. Insert Header
      const headerSql = `
        INSERT INTO F_FAC (
          TIPFAC, CODFAC, REFFAC, FECFAC, ESTFAC, ALMFAC, AGEFAC, CLIFAC,
          CNOFAC, CDOFAC, CPOFAC, CCPFAC, CPRFAC, TELFAC, CEMFAC, CPAFAC,
          PIVA1FAC, PIVA2FAC, PIVA3FAC, IPOR1FAC, IIVA1FAC, NET1FAC, TOTFAC
        ) VALUES (
          '${header.tipfac}',
          ${header.codfac},
          '${header.reffac.replace(/'/g, "''")}',
          ${header.fecfac},
          ${header.estfac},
          '${header.almfac}',
          ${header.agefac ? header.agefac : 0},
          ${header.clifac},
          '${header.cnofac.replace(/'/g, "''")}',
          ${header.cdofac ? `'${header.cdofac.replace(/'/g, "''")}'` : "''"},
          ${header.cpofac ? `'${header.cpofac.replace(/'/g, "''")}'` : "''"},
          ${header.ccpfac ? `'${header.ccpfac.replace(/'/g, "''")}'` : "''"},
          ${header.cprfac ? `'${header.cprfac.replace(/'/g, "''")}'` : "''"},
          ${header.telfac ? `'${header.telfac.replace(/'/g, "''")}'` : "''"},
          ${header.cemfac ? `'${header.cemfac.replace(/'/g, "''")}'` : "''"},
          ${header.cpafac ? `'${header.cpafac.replace(/'/g, "''")}'` : "''"},
          ${header.piva1fac},
          ${header.piva2fac},
          ${header.piva3fac},
          ${header.ipor1fac},
          ${header.iiva1fac},
          ${header.net1fac},
          ${header.totfac}
        )
      `;
      await this.driver.execute(headerSql);

      // 5. Insert Lines
      for (const line of lines) {
        const lineSql = `
          INSERT INTO F_LFA (
            TIPLFA, CODLFA, POSLFA, ARTLFA, DESLFA, CANLFA, PRELFA, TOTLFA
          ) VALUES (
            '${line.tiplfa}',
            ${line.codlfa},
            ${line.poslfa},
            '${line.artlfa.replace(/'/g, "''")}',
            '${line.deslfa.replace(/'/g, "''")}',
            ${line.canlfa},
            ${line.prelfa},
            ${line.totlfa}
          )
        `;
        await this.driver.execute(lineSql);
      }

      this.logger.info(`Factura creada exitosamente en Factusol (CODFAC=${nextInvoiceId}, Serie='${series}') para ref ${ref}`);

      return {
        success: true,
        invoiceId: invoice.id,
        externalId: String(nextInvoiceId),
        invoiceNumber: String(nextInvoiceId),
        series,
        status: 'issued',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al insertar factura en Factusol para ref ${ref}`, error);
      return {
        success: false,
        invoiceId: invoice.id,
        externalId: '',
        error: msg,
      };
    }
  }

  public async updateInvoiceStatus(
    invoiceId: string,
    status: string
  ): Promise<InvoiceMutationResult> {
    if (!this.driver || !this.config) {
      throw new ConnectionError(ErrorCode.CONNECTION_NOT_FOUND, 'Factusol no está conectado.');
    }

    const invoiceNum = parseInt(invoiceId, 10);
    if (isNaN(invoiceNum)) {
      throw new ConnectionError(ErrorCode.VALIDATION_ERROR, `ID de factura Factusol inválido: ${invoiceId}`);
    }

    const series = this.config.invoiceSeries || '1';
    const statusCode = FactusolInvoiceMapper.mapCanonicalStatusToFactusol(status as any);

    const updateSql = `UPDATE F_FAC SET ESTFAC = ${statusCode} WHERE TIPFAC = '${series}' AND CODFAC = ${invoiceNum}`;

    await this.driver.execute(updateSql);
    this.logger.info(`Estado de factura actualizado en Factusol: CODFAC=${invoiceNum}, ESTFAC=${statusCode} (${status})`);

    return {
      success: true,
      invoiceId,
      externalId: String(invoiceNum),
      series,
      status,
    };
  }
}
