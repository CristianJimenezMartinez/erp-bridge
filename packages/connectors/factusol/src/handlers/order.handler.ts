import { OrderMutationResult, ReadOrdersOptions, ConnectionError, ErrorCode } from '@erp-bridge/sdk';
import { CanonicalOrder, CanonicalOrderLine, CanonicalCustomer, Logger, OrderStatus } from '@erp-bridge/shared';
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
  sanitizeAndTruncate,
  sanitizeFloat,
  sanitizeInt,
} from '../queries';
import { FactusolOrderRaw, FactusolOrderLineRaw, FactusolOrderMapper } from '../mappers';
import { FactusolConnectionConfig, DEFAULT_FACTUSOL_ORDER_SERIES } from '../factusol.types';
import { FactusolCustomerHandler } from './customer.handler';

/** Códigos ESTPCL que se consideran "anulado" para la idempotencia de la reposición de stock (F6). */
const CANCELLED_STATUS_CODES = new Set<number>([3, 4]);

function isTimeoutError(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | null;
  return e?.name === 'AccessDatabaseTimeoutError' || /tiempo de espera agotado/i.test(e?.message || '');
}

function isCollisionError(err: unknown): boolean {
  const msg = (err as { message?: string } | null)?.message || String(err ?? '');
  return /duplic|primary key|clave principal|valores duplicados|index or primary key/i.test(msg);
}

export class FactusolOrderHandler {
  private readonly verifiedGuestCodes = new Set<number>();

  constructor(
    private readonly driver: AccessDriver,
    private readonly config: FactusolConnectionConfig,
    private readonly customerHandler: FactusolCustomerHandler,
    private readonly logger: Logger
  ) {}

  /** Serie efectiva (1 carácter): la del pedido, la configurada o la por defecto única. */
  private resolveSeries(orderSeries?: string): string {
    const raw = String(orderSeries || this.config.orderSeries || DEFAULT_FACTUSOL_ORDER_SERIES).trim();
    return raw.substring(0, 1) || DEFAULT_FACTUSOL_ORDER_SERIES;
  }

  private async findExistingOrder(reference: string): Promise<FactusolOrderRaw | null> {
    const existing = await this.driver.query<FactusolOrderRaw>(findOrderByReferenceQuery(reference));
    return existing.length > 0 ? existing[0]! : null;
  }

  private existingOrderResult(order: CanonicalOrder, existingOrder: FactusolOrderRaw, reference: string): OrderMutationResult {
    this.logger.info(`Pedido con referencia ${reference} ya existe en Factusol (CODPCL=${existingOrder.CODPCL})`);
    return {
      success: true,
      orderId: order.id,
      externalId: String(existingOrder.CODPCL),
      orderNumber: String(existingOrder.CODPCL),
      status: FactusolOrderMapper.mapStatusCodeToOrderStatus(existingOrder.ESTPCL),
    };
  }

  /** F8: avisa (sin bloquear) si el cliente genérico "contado web" no existe en F_CLI. */
  private async verifyGuestCustomer(code: number): Promise<void> {
    if (this.verifiedGuestCodes.has(code)) return;
    try {
      const rows = await this.driver.query<{ CODCLI: number }>(`SELECT CODCLI FROM F_CLI WHERE CODCLI = ${code}`);
      if (rows.length === 0) {
        this.logger.warn(
          `El cliente genérico CODCLI=${code} ("contado web") no existe en F_CLI de Factusol. ` +
            'Cree ese cliente o configure guestCustomerCode; los pedidos sin CIF quedarán asociados a un cliente inexistente.'
        );
      } else {
        this.verifiedGuestCodes.add(code);
      }
    } catch (err) {
      this.logger.warn(`No se pudo verificar el cliente genérico CODCLI=${code}: ${String(err)}`);
    }
  }

  /** F7: comprueba existencia de fila F_STO y DISSTO suficiente antes de descontar (solo avisa, no bloquea el pedido). */
  private async warnOnStockShortfall(lines: CanonicalOrderLine[], warehouse: string): Promise<void> {
    const skus = Array.from(new Set(lines.map((l) => sanitizeAndTruncate(l.sku, 13)).filter(Boolean)));
    if (skus.length === 0) return;
    try {
      const safeWarehouse = sanitizeAndTruncate(warehouse, 3);
      const rows = await this.driver.query<{ ARTSTO: string; DISSTO: number }>(
        `SELECT ARTSTO, DISSTO FROM F_STO WHERE ALMSTO = '${safeWarehouse}' AND ARTSTO IN (${skus.map((s) => `'${s}'`).join(', ')})`
      );
      const available = new Map<string, number>();
      for (const r of rows) available.set(String(r.ARTSTO ?? '').trim().toUpperCase(), Number(r.DISSTO) || 0);
      const needed = new Map<string, number>();
      for (const l of lines) {
        const k = String(l.sku ?? '').trim().toUpperCase();
        needed.set(k, (needed.get(k) || 0) + sanitizeFloat(l.quantity, 1));
      }
      for (const [sku, qty] of needed) {
        if (!sku) continue;
        if (!available.has(sku)) {
          this.logger.warn(`Stock: el artículo ${sku} no tiene fila en F_STO para el almacén '${warehouse}'; el descuento de stock no tendrá efecto.`);
        } else if ((available.get(sku) || 0) < qty) {
          this.logger.warn(`Stock: DISSTO insuficiente para ${sku} en almacén '${warehouse}' (disponible ${available.get(sku)}, pedido ${qty}); quedará negativo.`);
        }
      }
    } catch (err) {
      this.logger.warn(`No se pudo verificar el stock previo al descuento: ${String(err)}`);
    }
  }

  public async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
    // F5: serie y almacén efectivos (los del pedido mandan; si no, la configuración; si no, los valores únicos por defecto)
    const series = this.resolveSeries(order.series);
    const warehouse = sanitizeAndTruncate(order.warehouse || this.config.defaultWarehouse || 'GEN', 3) || 'GEN';
    const effectiveOrder: CanonicalOrder = { ...order, series, warehouse };
    const reference = effectiveOrder.reference || effectiveOrder.orderNumber;

    try {
      // 1. Verificar idempotencia con findOrderByReferenceQuery
      if (reference) {
        const existingOrder = await this.findExistingOrder(reference);
        if (existingOrder) return this.existingOrderResult(order, existingOrder, reference);
      }

      // 2. Cliente Contado Web o cliente registrado con CIF
      // Desacoplamiento total de ID CMS vs CODCLI de Factusol
      const guestCode = sanitizeInt(this.config.guestCustomerCode, 1, 1);
      let customerCode = guestCode;
      const normalizedTaxId = normalizeTaxId(effectiveOrder.customer?.taxId);
      const hasCif = Boolean(normalizedTaxId && normalizedTaxId.trim().length > 0);

      if (!hasCif) {
        // Invitado o particular sin CIF para factura: asignar cliente genérico ("CLIENTE CONTADO WEB")
        // Datos de envío y contacto se estampan directamente en la cabecera F_PCL
        customerCode = guestCode;
        await this.verifyGuestCustomer(guestCode);
        this.logger.info(`Pedido ${reference} sin CIF: asignando cliente contado web (CODCLI=${guestCode})`);
      } else {
        // Cliente con CIF: buscar por CIF en F_CLI
        const found = await this.customerHandler.findCustomer({
          taxId: normalizedTaxId,
        });

        if (found && found.customerNumber) {
          customerCode = Number(found.customerNumber);
        } else {
          // Si no existe, genera nuevo cliente con getNextCustomerIdQuery()
          const customerToCreate: CanonicalCustomer = {
            ...effectiveOrder.customer,
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

      // 3. Si la dirección de envío difiere de la fiscal y es cliente registrado, registrar en F_OBR
      if (customerCode !== guestCode) {
        const fiscalAddr = effectiveOrder.billingAddress || effectiveOrder.customer?.address;
        const shipAddr = effectiveOrder.shippingAddress;
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
          await this.customerHandler.ensureDeliveryAddress(customerCode, shipAddr, effectiveOrder.customer?.fiscalName);
        }
      }

      // 4. Desglose multi-tramo de IVA y cent rounding para cuadre exacto con pasarela
      const vatBreakdown = calculateOrderVatBreakdown(effectiveOrder);

      // 5. Decremento atómico de stock en Access (F_STO) en el almacén efectivo del pedido
      const lines = effectiveOrder.lines || [];
      await this.warnOnStockShortfall(lines, warehouse);
      const stockSqls = lines.map((line: CanonicalOrderLine) =>
        decrementStockQuery(line.sku, warehouse, line.quantity)
      );

      // 6. Transacción atómica: agrupar cabecera, líneas y decremento de stock
      // F4: reintento SOLO ante colisión de correlativo. Antes de cada reintento se vuelve a comprobar la idempotencia
      // por REFPCL; tras un timeout (la transacción pudo confirmarse antes del SIGKILL) NO se reintenta a ciegas.
      const MAX_RETRIES = 5;
      let lastError: unknown = null;
      let orderCreated = false;
      let finalOrderCode = 0;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 1 && reference) {
            const already = await this.findExistingOrder(reference);
            if (already) return this.existingOrderResult(order, already, reference);
          }

          const maxRows = await this.driver.query<{ maxid: number }>(getNextOrderIdQuery(series));
          const nextOrderCode = (Number(maxRows[0]?.maxid) || 0) + 1;
          const headerSql = insertOrderHeaderQuery(effectiveOrder, nextOrderCode, customerCode, vatBreakdown, series);
          const lineSqls = lines.map((line: CanonicalOrderLine, idx: number) =>
            insertOrderLineQuery(line, nextOrderCode, series, line.position || (idx + 1))
          );

          await this.driver.executeTransaction([headerSql, ...lineSqls, ...stockSqls]);

          finalOrderCode = nextOrderCode;
          orderCreated = true;
          this.logger.info(`Pedido creado exitosamente en Factusol (CODPCL=${nextOrderCode}, Serie='${series}') para ref ${reference} (intento ${attempt})`);
          break;
        } catch (err: unknown) {
          lastError = err;
          this.logger.warn(`Fallo en intento ${attempt}/${MAX_RETRIES} al insertar pedido ${reference} en Factusol: ${err instanceof Error ? err.message : String(err)}`);
          const timedOut = isTimeoutError(err);
          const canRetrySafely = !timedOut && (Boolean(reference) || isCollisionError(err));
          if (!canRetrySafely) break;
          if (attempt < MAX_RETRIES) {
            const backoffMs = 100 * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }

      if (!orderCreated) {
        // La transacción pudo haberse confirmado pese al error (p. ej. timeout): comprobación final por REFPCL.
        if (reference) {
          try {
            const committed = await this.findExistingOrder(reference);
            if (committed) return this.existingOrderResult(order, committed, reference);
          } catch (checkErr) {
            this.logger.warn(`No se pudo verificar el pedido ${reference} tras el fallo: ${String(checkErr)}`);
          }
        }
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

    let series = this.resolveSeries();
    const statusCode = FactusolOrderMapper.mapOrderStatusToStatusCode(status);

    // Reposición atómica de stock si el nuevo estado es cancelled o refunded
    if (status === 'cancelled' || status === 'refunded') {
      // 1. Cabecera del pedido (almacén y estado actual). F6: localizar la serie real si la configurada no coincide.
      type HeaderRow = { ALMPCL: string; ESTPCL: number; TIPPCL?: string };
      let headerRows = await this.driver.query<HeaderRow>(
        `SELECT ALMPCL, ESTPCL, TIPPCL FROM F_PCL WHERE CODPCL = ${orderCode} AND TIPPCL = '${sanitizeAndTruncate(series, 1)}'`
      );
      if (headerRows.length === 0) {
        const anySeries = await this.driver.query<HeaderRow>(
          `SELECT ALMPCL, ESTPCL, TIPPCL FROM F_PCL WHERE CODPCL = ${orderCode}`
        );
        if (anySeries.length === 1) {
          headerRows = anySeries;
          series = String(anySeries[0]!.TIPPCL ?? '').trim().substring(0, 1) || series;
        } else if (anySeries.length > 1) {
          throw new ConnectionError(
            ErrorCode.VALIDATION_ERROR,
            `El pedido Factusol ${orderCode} existe en varias series y no coincide con la serie configurada '${series}': no se repone stock a ciegas.`
          );
        }
      }
      const header = headerRows[0];
      if (!header) {
        throw new ConnectionError(ErrorCode.VALIDATION_ERROR, `Pedido Factusol ${orderCode} no encontrado: no se repone stock.`);
      }

      // F6: idempotencia. Si el pedido ya está anulado, NO se vuelve a reponer stock.
      const currentEst = Number(header.ESTPCL);
      if (CANCELLED_STATUS_CODES.has(currentEst)) {
        this.logger.info(`Pedido Factusol CODPCL=${orderCode} ya estaba anulado (ESTPCL=${currentEst}); se omite la reposición de stock.`);
        return { success: true, orderId, externalId: String(orderCode), status };
      }

      const updateStatusSql = updateOrderStatusQuery(orderCode, series, statusCode);
      const warehouse = (header.ALMPCL && header.ALMPCL.trim()) || this.config.defaultWarehouse || 'GEN';
      const safeWarehouse = sanitizeAndTruncate(warehouse, 3);

      // 2. Líneas del pedido (F_LPC): un fallo de lectura se propaga (no se anula el pedido sin reponer stock)
      const lines = await this.driver.query<FactusolOrderLineRaw>(readOrderLinesQuery(orderCode, series));

      // 3. Sentencias atómicas de reposición de stock
      const stockRestoreSqls: string[] = [];
      for (const line of lines) {
        const qty = sanitizeFloat(line.CANLPC || 0);
        const sku = sanitizeAndTruncate(line.ARTLPC, 13);
        if (qty > 0 && sku) {
          stockRestoreSqls.push(
            `UPDATE F_STO SET DISSTO = DISSTO + ${qty} WHERE ARTSTO = '${sku}' AND ALMSTO = '${safeWarehouse}'`
          );
        }
      }

      if (stockRestoreSqls.length > 0) {
        await this.driver.executeTransaction([updateStatusSql, ...stockRestoreSqls]);
        this.logger.info(`Stock repuesto atómicamente para pedido cancelado/reembolsado (CODPCL=${orderCode}): ${stockRestoreSqls.length} líneas devueltas al almacén ${safeWarehouse}`);
      } else {
        await this.driver.execute(updateStatusSql);
      }
    } else {
      await this.driver.execute(updateOrderStatusQuery(orderCode, series, statusCode));
    }

    this.logger.info(`Estado de pedido actualizado en Factusol: CODPCL=${orderCode}, ESTPCL=${statusCode} (${status})`);

    return {
      success: true,
      orderId,
      externalId: String(orderCode),
      status,
    };
  }
}
