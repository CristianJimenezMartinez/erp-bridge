import { AccessDriver } from '@erp-bridge/connector-factusol';
import {
  calculateOrderVatBreakdown,
  decrementStockQuery,
  findOrderByReferenceQuery,
  getNextOrderIdQuery,
  insertOrderHeaderQuery,
  insertOrderLineQuery,
  normalizeTaxId,
  sanitizeSql,
} from '@erp-bridge/connector-factusol';
import {
  ShopifyClient,
  ShopifyConnector,
  ShopifyOrderMapper,
  ShopifyConnectorConfig,
  ShopifyOrderNode,
  CanonicalStockUpdate,
  ShopifyOrdersQueryData,
} from '@erp-bridge/connector-shopify';
import {
  CanonicalOrder,
  CanonicalOrderLine,
  Logger,
} from '@erp-bridge/shared';
import { OrderSyncHelper } from './order-sync.helper';

export interface ShopifySyncStockResult {
  success: boolean;
  itemsUpdated: number;
  durationMs: number;
}

export interface ShopifyImportOrdersResult {
  success: boolean;
  ordersImported: number;
  importedOrders: Array<{
    shopifyOrderId: string;
    orderNumber: string;
    factusolOrderNumber: number;
    totalAmount: number;
  }>;
}

export interface ShopifyImportOrdersOptions {
  plausibilityAdapter?: any;
  orderNotifier?: any;
  salesLedgerManager?: any;
  eventBus?: any;
  connector?: ShopifyConnector;
  client?: ShopifyClient;
  series?: string;
  warehouse?: string;
  rawOrders?: any[];
}

/**
 * ShopifySyncHelper: Motor desacoplado para sincronización directa
 * bidireccional entre Factusol ERP y tiendas Shopify GraphQL/REST.
 */
export class ShopifySyncHelper {
  private static readonly logger = new Logger('ShopifySyncHelper');
  private static readonly stockCache = new Map<string, number>();

  /**
   * Limpia la caché local en memoria de existencias (útil para pruebas y reinicios).
   */
  public static clearStockCache(): void {
    ShopifySyncHelper.stockCache.clear();
  }

  /**
   * Retorna el número de referencias cacheadas actualmente.
   */
  public static getStockCacheSize(): number {
    return ShopifySyncHelper.stockCache.size;
  }

  /**
   * Sincroniza existencias disponibles (DISSTO) de Factusol hacia Shopify.
   * Aplica dirty-checking en RAM para enviar exclusivamente deltas reales.
   */
  public static async syncStockToShopify(
    driver: AccessDriver,
    config: any,
    warehouseCode: string,
    options?: { connector?: ShopifyConnector; client?: ShopifyClient }
  ): Promise<ShopifySyncStockResult> {
    const start = performance.now();
    const warehouse = (warehouseCode || config.factusol?.warehouseCode || 'GEN').replace(/'/g, "''").trim();

    // 1. Consulta de existencias en Factusol F_STO
    let stockRows = await driver
      .query<{ ARTSTO: any; totalStock: any }>(
        `SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO WHERE ALMSTO = '${warehouse}' OR ALMSTO = 'GEN' GROUP BY ARTSTO`
      )
      .catch((err) => {
        ShopifySyncHelper.logger.warn('Error al consultar stock en Factusol', { error: (err as any)?.message || String(err) });
        return null;
      });

    // Fallback inteligente: si con el almacén configurado devolvió 0 registros, intentar agrupar por todos los almacenes de F_STO
    if ((!stockRows || stockRows.length === 0) && warehouse) {
      const fallbackRows = await driver
        .query<{ ARTSTO: any; totalStock: any }>(
          `SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO GROUP BY ARTSTO`
        )
        .catch(() => null);
      if (fallbackRows && fallbackRows.length > 0) {
        stockRows = fallbackRows;
      }
    }

    if (!stockRows || stockRows.length === 0) {
      ShopifySyncHelper.logger.warn('La consulta de stock en Factusol devolvió 0 registros o falló. Se omite el envío a Shopify.');
      return {
        success: false,
        itemsUpdated: 0,
        durationMs: Math.round(performance.now() - start),
      };
    }

    // 2. Compara deltas de stock contra memoria RAM local / hash
    const changedUpdates: CanonicalStockUpdate[] = [];
    for (const row of stockRows) {
      const sku = String(row.ARTSTO || '').trim().toUpperCase();
      if (!sku) continue;

      const qty = Math.max(0, Math.round(Number(row.totalStock) || 0));
      const cached = ShopifySyncHelper.stockCache.get(sku);
      if (cached === undefined || cached !== qty) {
        changedUpdates.push({
          sku,
          quantity: qty,
          availableQuantity: qty,
        });
      }
    }

    if (changedUpdates.length === 0) {
      ShopifySyncHelper.logger.debug('Dirty-check Shopify: existencias al día en Factusol (0 variaciones).');
      return {
        success: true,
        itemsUpdated: 0,
        durationMs: Math.round(performance.now() - start),
      };
    }

    // 3. Envío de actualizaciones a Shopify vía GraphQL Admin API
    const shopifyConfig: ShopifyConnectorConfig = {
      shopSubdomain: config.shopify?.shopSubdomain || '',
      accessToken: config.shopify?.accessToken || '',
      locationId: config.shopify?.locationId,
      apiVersion: config.shopify?.apiVersion || '2026-01',
      endpointUrl: config.shopify?.endpointUrl,
    };

    if (!options?.connector && (!shopifyConfig.shopSubdomain || !shopifyConfig.accessToken)) {
      ShopifySyncHelper.logger.warn('Credenciales de Shopify incompletas (shopSubdomain o accessToken ausentes).');
      return {
        success: false,
        itemsUpdated: 0,
        durationMs: Math.round(performance.now() - start),
      };
    }

    const connector = options?.connector || new ShopifyConnector(shopifyConfig, options?.client);
    const syncRes = await connector.pushStockBatch(changedUpdates);

    if (syncRes.updated > 0) {
      for (const update of changedUpdates) {
        ShopifySyncHelper.stockCache.set(update.sku, update.quantity);
      }
    }

    const durationMs = Math.round(performance.now() - start);
    return {
      success: syncRes.success,
      itemsUpdated: syncRes.updated,
      durationMs,
    };
  }

  /**
   * Importa pedidos no procesados de Shopify a Factusol F_PCL y F_LPC
   * mediante transacción atómica respetando TIPPCL, clientes e impuestos de España.
   */
  public static async importShopifyOrders(
    driver: AccessDriver,
    config: any,
    options?: ShopifyImportOrdersOptions
  ): Promise<ShopifyImportOrdersResult> {
    const importedOrders: Array<{
      shopifyOrderId: string;
      orderNumber: string;
      factusolOrderNumber: number;
      totalAmount: number;
    }> = [];

    const series = options?.series || config.factusol?.orderSeries || '1';
    const warehouse = options?.warehouse || config.factusol?.warehouseCode || 'GEN';

    const shopifyConfig: ShopifyConnectorConfig = {
      shopSubdomain: config.shopify?.shopSubdomain || '',
      accessToken: config.shopify?.accessToken || '',
      locationId: config.shopify?.locationId,
      apiVersion: config.shopify?.apiVersion || '2026-01',
      endpointUrl: config.shopify?.endpointUrl,
    };

    let client: ShopifyClient | undefined = options?.client;
    if (!client && (shopifyConfig.shopSubdomain || shopifyConfig.endpointUrl)) {
      client = new ShopifyClient(shopifyConfig);
    }

    // 1. Consulta pedidos no procesados de Shopify
    let rawOrderNodes: ShopifyOrderNode[] = [];
    if (options?.rawOrders && Array.isArray(options.rawOrders)) {
      rawOrderNodes = options.rawOrders;
    } else if (client) {
      const queryStr = 'financial_status:paid -tag:erp-synced';
      const graphqlQuery = `
        query getPaidUnsyncedOrders($query: String!) {
          orders(first: 50, query: $query, sortKey: CREATED_AT) {
            edges {
              node {
                id name createdAt updatedAt displayFinancialStatus displayFulfillmentStatus
                totalPriceSet { shopMoney { amount currencyCode } }
                totalTaxSet { shopMoney { amount currencyCode } }
                totalShippingPriceSet { shopMoney { amount currencyCode } }
                totalDiscountsSet { shopMoney { amount currencyCode } }
                subtotalPriceSet { shopMoney { amount currencyCode } }
                taxLines { title rate ratePercentage priceSet { shopMoney { amount currencyCode } } }
                note tags
                customer {
                  id firstName lastName displayName email phone tags
                  metafields(first: 10) { edges { node { namespace key value } } }
                }
                shippingAddress { firstName lastName company address1 address2 city province zip countryCodeV2 phone }
                billingAddress { firstName lastName company address1 address2 city province zip countryCodeV2 phone }
                lineItems(first: 100) {
                  edges {
                    node {
                      id title sku quantity
                      originalUnitPriceSet { shopMoney { amount currencyCode } }
                      discountedUnitPriceSet { shopMoney { amount currencyCode } }
                      totalDiscountSet { shopMoney { amount currencyCode } }
                      originalTotalSet { shopMoney { amount currencyCode } }
                      discountedTotalSet { shopMoney { amount currencyCode } }
                      taxLines { title rate ratePercentage priceSet { shopMoney { amount currencyCode } } }
                    }
                  }
                }
                customAttributes { key value }
              }
            }
          }
        }
      `;

      try {
        const res = await client.request<ShopifyOrdersQueryData>(graphqlQuery, { query: queryStr }, 20);
        const edges = res.data?.orders?.edges || [];
        rawOrderNodes = edges.map((e) => e.node);
      } catch (err) {
        ShopifySyncHelper.logger.warn('Error consultando pedidos no sincronizados en Shopify', { error: (err as any)?.message || String(err) });
        return { success: false, ordersImported: 0, importedOrders: [] };
      }
    }

    // Filtrar estrictamente: paid, sin erp-synced, y sin fulfilled
    const eligibleOrders = rawOrderNodes.filter((order) => {
      const finStatus = (order.displayFinancialStatus || '').toLowerCase();
      if (finStatus !== 'paid') return false;

      const fulStatus = order.displayFulfillmentStatus;
      if (fulStatus !== null && fulStatus !== undefined && String(fulStatus).toLowerCase() !== 'unfulfilled') {
        return false;
      }

      const tags = Array.isArray(order.tags)
        ? order.tags
        : String(order.tags || '').split(',').map((t) => t.trim());
      if (tags.some((t) => t.toLowerCase() === 'erp-synced')) {
        return false;
      }

      return true;
    });

    for (const orderNode of eligibleOrders) {
      try {
        // 2. Mapeo a pedido canónico e impuestos de España (IVA 21%, 10%, 4%, RE)
        const canonicalOrder = ShopifyOrderMapper.toCanonicalOrder(orderNode);
        canonicalOrder.series = series;
        canonicalOrder.warehouse = warehouse;

        // Sanitización para driver ADODB / Factusol
        if (canonicalOrder.customer) {
          canonicalOrder.customer.fiscalName = OrderSyncHelper.sanitizeFactusolText(canonicalOrder.customer.fiscalName);
          if (canonicalOrder.customer.address) {
            canonicalOrder.customer.address.street = OrderSyncHelper.sanitizeFactusolText(canonicalOrder.customer.address.street);
            canonicalOrder.customer.address.city = OrderSyncHelper.sanitizeFactusolText(canonicalOrder.customer.address.city);
            canonicalOrder.customer.address.state = OrderSyncHelper.sanitizeFactusolText(canonicalOrder.customer.address.state);
          }
        }
        if (canonicalOrder.shippingAddress) {
          canonicalOrder.shippingAddress.street = OrderSyncHelper.sanitizeFactusolText(canonicalOrder.shippingAddress.street);
          canonicalOrder.shippingAddress.city = OrderSyncHelper.sanitizeFactusolText(canonicalOrder.shippingAddress.city);
          canonicalOrder.shippingAddress.state = OrderSyncHelper.sanitizeFactusolText(canonicalOrder.shippingAddress.state);
        }
        for (const line of canonicalOrder.lines || []) {
          line.name = OrderSyncHelper.sanitizeFactusolText(line.name);
          line.sku = OrderSyncHelper.sanitizeFactusolText(line.sku).toUpperCase();
        }

        // Validación de plausibilidad de seguridad
        let safeOrder: CanonicalOrder = canonicalOrder;
        if (options?.plausibilityAdapter) {
          const check = options.plausibilityAdapter.validateAndSanitize(canonicalOrder);
          if (!check.valid || !check.sanitizedOrder) {
            ShopifySyncHelper.logger.warn(`Pedido Shopify #${orderNode.name} rechazado por plausibilidad: ${check.error}`);
            continue;
          }
          safeOrder = check.sanitizedOrder;
        }

        // Idempotencia: comprobar si ya fue registrado previamente en Factusol F_PCL
        const ref = safeOrder.reference || safeOrder.orderNumber;
        const existing = await driver.query<any>(findOrderByReferenceQuery(ref)).catch(() => []);
        if (existing && existing.length > 0) {
          ShopifySyncHelper.logger.info(`Pedido ${ref} ya existente en Factusol (CODPCL=${existing[0].CODPCL})`);
          continue;
        }

        // Resolución de cliente en F_CLI
        let customerCode = 1;
        const normalizedTaxId = normalizeTaxId(safeOrder.customer?.taxId);
        if (normalizedTaxId) {
          const found = await driver
            .query<any>(`SELECT CODCLI FROM F_CLI WHERE NIFCLI = '${sanitizeSql(normalizedTaxId)}'`)
            .catch(() => []);
          if (found && found.length > 0 && found[0].CODCLI) {
            customerCode = Number(found[0].CODCLI);
          }
        }

        // Desglose multi-tramo de IVA y Recargo de Equivalencia
        const vatBreakdown = calculateOrderVatBreakdown(safeOrder);

        // Decremento de stock F_STO
        const stockSqls = (safeOrder.lines || []).map((l: CanonicalOrderLine) =>
          decrementStockQuery(l.sku, warehouse, l.quantity)
        );

        // 3. Inserción en Factusol F_PCL y F_LPC mediante transacción atómica con correlativo
        const MAX_RETRIES = 5;
        let createdOrderNumber = 0;
        let orderCreated = false;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const maxRows = await driver.query<{ maxid: number }>(getNextOrderIdQuery(series));
            const nextOrderCode = (Number(maxRows[0]?.maxid) || 0) + 1;
            const headerSql = insertOrderHeaderQuery(safeOrder, nextOrderCode, customerCode, vatBreakdown, series);
            const lineSqls = safeOrder.lines.map((l: CanonicalOrderLine, idx: number) =>
              insertOrderLineQuery(l, nextOrderCode, series, l.position || (idx + 1))
            );

            await driver.executeTransaction([headerSql, ...lineSqls, ...stockSqls]);
            createdOrderNumber = nextOrderCode;
            orderCreated = true;
            break;
          } catch (err) {
            ShopifySyncHelper.logger.warn(`Intento ${attempt}/${MAX_RETRIES} de inserción en Factusol falló`, { error: (err as any)?.message || String(err) });
            if (attempt < MAX_RETRIES) {
              await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
            }
          }
        }

        if (!orderCreated) {
          ShopifySyncHelper.logger.error(`No se pudo insertar el pedido ${ref} en Factusol tras reintentos.`);
          continue;
        }

        // 4. Marca el pedido en Shopify con tag 'erp-synced' y 'factusol-pedido-XXXX'
        if (client) {
          await ShopifySyncHelper.tagShopifyOrder(client, orderNode.id, [
            'erp-synced',
            `factusol-pedido-${createdOrderNumber}`,
          ]).catch((tagErr) => {
            ShopifySyncHelper.logger.warn(`Aviso al etiquetar pedido ${orderNode.id} en Shopify`, { error: (tagErr as any)?.message || String(tagErr) });
          });
        }

        // Notificaciones y eventos
        if (options?.orderNotifier?.notifyNewOrder) {
          options.orderNotifier
            .notifyNewOrder({
              order: safeOrder,
              channel: 'shopify',
              factusolOrderNumber: String(createdOrderNumber),
              series,
              config,
            })
            .catch(() => null);
        }

        if (options?.salesLedgerManager?.recordOrder) {
          try {
            options.salesLedgerManager.recordOrder({
              channel: 'shopify',
              webOrderId: orderNode.id,
              orderNumber: safeOrder.orderNumber,
              date: (safeOrder.date instanceof Date ? safeOrder.date.toISOString() : safeOrder.date) || new Date().toISOString(),
              factusolSeries: series,
              factusolOrderNumber: String(createdOrderNumber),
              customerName: safeOrder.customer?.fiscalName || 'Cliente Shopify',
              customerEmail: safeOrder.customer?.email,
              customerPhone: safeOrder.customer?.phone,
              totalAmount: safeOrder.totalAmount,
              currency: safeOrder.currency || 'EUR',
              status: 'synced',
              lines: (safeOrder.lines || []).map((l) => ({
                sku: l.sku,
                name: l.name,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                total: l.total,
              })),
            });
          } catch {}
        }

        if (options?.eventBus?.addEvent) {
          options.eventBus.addEvent(
            'success',
            `✓ Pedido Shopify #${safeOrder.orderNumber} procesado en Factusol (Serie ${series}, Pedido #${createdOrderNumber})`
          );
        }

        importedOrders.push({
          shopifyOrderId: orderNode.id,
          orderNumber: safeOrder.orderNumber,
          factusolOrderNumber: createdOrderNumber,
          totalAmount: safeOrder.totalAmount,
        });
      } catch (err) {
        ShopifySyncHelper.logger.error(`Error procesando pedido #${orderNode.name || orderNode.id}`, { error: (err as any)?.message || String(err) });
      }
    }

    return {
      success: true,
      ordersImported: importedOrders.length,
      importedOrders,
    };
  }

  /**
   * Añade etiquetas (tags) a un pedido de Shopify mediante GraphQL Admin API.
   */
  public static async tagShopifyOrder(
    client: ShopifyClient,
    orderId: string,
    tagsToAdd: string[]
  ): Promise<void> {
    const cleanId = orderId.replace(/\D/g, '');
    const gid = orderId.startsWith('gid://') ? orderId : `gid://shopify/Order/${cleanId}`;
    const mutation = `
      mutation tagsAdd($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          node { id }
          userErrors { field message }
        }
      }
    `;

    const res = await client.request<{ tagsAdd?: { userErrors?: Array<{ message: string }> } }>(
      mutation,
      { id: gid, tags: tagsToAdd },
      10
    );

    const errors = res.data?.tagsAdd?.userErrors || [];
    if (errors.length > 0) {
      ShopifySyncHelper.logger.warn('UserErrors devueltos al etiquetar pedido en Shopify', {
        gid,
        errors: errors.map((e) => e.message),
      });
    }
  }
}
