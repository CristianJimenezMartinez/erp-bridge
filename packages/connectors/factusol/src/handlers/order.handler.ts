import {
  OrderMutationResult,
  ReadOrdersOptions,
  ConnectionError,
  ErrorCode,
} from '@erp-bridge/sdk';
import {
  CanonicalOrder,
  CanonicalOrderLine,
  CanonicalCustomer,
  Logger,
  OrderStatus,
} from '@erp-bridge/shared';
import { AccessDriver } from '../access-driver';
import {
  findOrderByReferenceQuery,
  getNextOrderIdQuery,
  insertOrderHeaderQuery,
  insertOrderLineQuery,
  decrementStockQuery,
  calculateOrderVatBreakdown,
  readOrderLinesQuery,
  readOrdersQuery,
  updateOrderStatusQuery,
  normalizeTaxId,
} from '../queries';
import {
  FactusolOrderRaw,
  FactusolOrderLineRaw,
  FactusolOrderMapper,
} from '../mappers';
import { FactusolConnectionConfig } from '../factusol.connector';
import { FactusolCustomerHandler } from './customer.handler';

export class FactusolOrderHandler {
  constructor(
    private readonly driver: AccessDriver,
    private readonly config: FactusolConnectionConfig,
    private readonly customerHandler: FactusolCustomerHandler,
    private readonly logger: Logger
  ) {}

  public async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
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

      // 2. Cliente Contado Web o cliente registrado con CIF
      let customerCode = 0;
      const normalizedTaxId = normalizeTaxId(order.customer?.taxId);
      const hasCif = Boolean(normalizedTaxId && normalizedTaxId.trim().length > 0);

      if (order.customer?.customerNumber && !isNaN(Number(order.customer.customerNumber)) && Number(order.customer.customerNumber) > 1) {
        customerCode = Number(order.customer.customerNumber);
      } else if (!hasCif) {
        // Invitado o particular sin CIF para factura: asignar cliente genérico 1 ("CLIENTE CONTADO WEB")
        // Datos de envío y contacto se estampan directamente en la cabecera F_PCL
        customerCode = 1;
        this.logger.info(`Pedido ${reference} sin CIF: asignando cliente contado web (CODCLI=1)`);
      } else {
        // Cliente con CIF: buscar o crear en F_CLI
        const found = await this.customerHandler.findCustomer({
          taxId: normalizedTaxId,
          email: order.customer?.email,
        });

        if (found && found.customerNumber) {
          customerCode = Number(found.customerNumber);
        } else {
          const customerToCreate: CanonicalCustomer = {
            ...order.customer,
            taxId: normalizedTaxId,
          };
          const createdCust = await this.customerHandler.createCustomer(customerToCreate);
          if (createdCust.success && createdCust.externalId) {
            customerCode = Number(createdCust.externalId);
          } else {
            throw new Error(`No se pudo crear cliente para el pedido: ${createdCust.error || 'Error desconocido'}`);
          }
        }
      }

      // 3. Si la dirección de envío difiere de la fiscal y es cliente registrado (> 1), registrar en F_OBR
      if (customerCode > 1) {
        const fiscalAddr = order.billingAddress || order.customer?.address;
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

        if (isDifferentAddress && shipAddr && shipAddr.street) {
          await this.customerHandler.ensureDeliveryAddress(customerCode, shipAddr, order.customer?.fiscalName);
        }
      }

      // 4. Desglose multi-tramo de IVA y cent rounding para cuadre exacto con pasarela
      const vatBreakdown = calculateOrderVatBreakdown(order);

      // 5. Decremento atómico de stock en Access (F_STO)
      const warehouse = order.warehouse || this.config.defaultWarehouse || 'GEN';
      const stockSqls = (order.lines || []).map((line: CanonicalOrderLine) =>
        decrementStockQuery(line.sku, warehouse, line.quantity)
      );

      // 6. Transacción atómica: agrupar cabecera, líneas y decremento de stock
      // Bucle de reintento automático (hasta 5 intentos con backoff) ante colisión de correlativo en CODPCL
      const MAX_RETRIES = 5;
      let lastError: unknown = null;
      let orderCreated = false;
      let finalOrderCode = 0;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const maxRows = await this.driver.query<{ maxid: number }>(getNextOrderIdQuery(series));
          const nextOrderCode = (Number(maxRows[0]?.maxid) || 0) + 1;
          const headerSql = insertOrderHeaderQuery(order, nextOrderCode, customerCode, vatBreakdown, series);
          const lineSqls = order.lines.map((line: CanonicalOrderLine, idx: number) =>
            insertOrderLineQuery(line, nextOrderCode, series, line.position || (idx + 1))
          );

          await this.driver.executeTransaction([headerSql, ...lineSqls, ...stockSqls]);

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
}
