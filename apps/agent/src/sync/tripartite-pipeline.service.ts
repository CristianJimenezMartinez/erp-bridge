import {
  CanonicalOrder,
  CanonicalStock,
  CanonicalStockUpdate,
  Logger,
} from '@erp-bridge/shared';
import { OrderMutationResult } from '@erp-bridge/sdk';
import { StoreAndForwardQueue } from '@erp-bridge/core';
import { HoldedMapper, HoldedSalesOrder } from '@erp-bridge/connector-holded';

export interface IShopifyChannel {
  acknowledgeOrder(remoteOrderId: string): Promise<void>;
  pushStockBatch?(updates: CanonicalStockUpdate[]): Promise<any>;
  [key: string]: any;
}

export interface IFactusolAdapter {
  readStock(options?: { skus?: string[]; warehouse?: string }): Promise<CanonicalStock[]>;
  createOrder(order: CanonicalOrder): Promise<OrderMutationResult>;
  decrementStock?(articleId: string, quantity: number, warehouse?: string): Promise<any>;
  updateStock?(articleId: string, quantity: number, warehouse?: string): Promise<any>;
  [key: string]: any;
}

export interface IHoldedChannel {
  createSalesOrder?(order: HoldedSalesOrder): Promise<{ status: number; id: string; info?: string }>;
  createOrder?(order: CanonicalOrder): Promise<OrderMutationResult>;
  pushStockBatch?(updates: CanonicalStockUpdate[]): Promise<any>;
  updateStock?(id: string, stock: any): Promise<any>;
  [key: string]: any;
}

export interface ProcessShopifyOrderOptions {
  createHoldedDocument?: boolean;
  autoAcknowledge?: boolean;
}

export interface StockCheckResult {
  passed: boolean;
  insufficientStockItems?: Array<{
    sku: string;
    requested: number;
    available: number;
  }>;
}

export interface HoldedSyncResult {
  success: boolean;
  documentId?: string;
  queued?: boolean;
  queueEventId?: string;
  error?: string;
}

export interface ProcessShopifyOrderResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  stockCheck: StockCheckResult;
  factusolResult?: OrderMutationResult;
  holdedResult?: HoldedSyncResult;
  shopifyAcknowledged?: boolean;
  incidentRegistered?: boolean;
  error?: string;
}

export interface DirectSaleResult {
  success: boolean;
  articleId: string;
  quantitySold: number;
  newAvailableQuantity: number;
  shopifySync: { success: boolean; queued?: boolean; error?: string };
  holdedSync: { success: boolean; queued?: boolean; error?: string };
  error?: string;
}

export interface StockIncident {
  id: string;
  timestamp: Date;
  orderId: string;
  orderNumber: string;
  items: Array<{ sku: string; requested: number; available: number }>;
}

export interface TripartitePipelineOptions {
  queue?: StoreAndForwardQueue;
  queueStoragePath?: string;
  defaultWarehouse?: string;
}

export interface TripartitePipelineDependencies {
  shopify: IShopifyChannel | any;
  factusol: IFactusolAdapter | any;
  holded: IHoldedChannel | any;
  options?: TripartitePipelineOptions;
}

/**
 * Servicio de sincronización tripartita de alta resiliencia para Bentian ERP Bridge.
 * Orquesta el flujo: Shopify (Tienda Online) -> Factusol (Almacén Central) -> Holded (Contabilidad / Asesoría).
 * 
 * Principios y blindajes:
 * 1. Cumplimiento estricto del Modelo Fiscal Español (CanonicalTax: IVA 21%, 10%, 4%, 0% y R.E. 5.2%, 1.4%, 0.5%, 0%).
 * 2. Blindaje Anti-Overselling prioritario con comprobación de stock disponible (availableQuantity / DISSTO).
 * 3. Aislamiento Store-and-Forward: Tolerancia a caídas (503/429) de pasarelas remotas sin comprometer Factusol.
 */
export class TripartitePipelineService {
  private readonly logger = new Logger('TripartitePipelineService');
  private readonly shopify: IShopifyChannel;
  private readonly factusol: IFactusolAdapter;
  private readonly holded: IHoldedChannel;
  private readonly queue: StoreAndForwardQueue;
  private readonly defaultWarehouse: string;
  private incidents: StockIncident[] = [];

  constructor(
    shopifyOrDeps: IShopifyChannel | TripartitePipelineDependencies | any,
    factusol?: IFactusolAdapter | any,
    holded?: IHoldedChannel | any,
    options?: TripartitePipelineOptions
  ) {
    if (
      shopifyOrDeps &&
      typeof shopifyOrDeps === 'object' &&
      'shopify' in shopifyOrDeps &&
      'factusol' in shopifyOrDeps
    ) {
      this.shopify = shopifyOrDeps.shopify;
      this.factusol = shopifyOrDeps.factusol;
      this.holded = shopifyOrDeps.holded;
      const opts = shopifyOrDeps.options || {};
      this.defaultWarehouse = opts.defaultWarehouse || 'GEN';
      this.queue = opts.queue || new StoreAndForwardQueue({ storagePath: opts.queueStoragePath });
    } else {
      this.shopify = shopifyOrDeps;
      this.factusol = factusol;
      this.holded = holded;
      this.defaultWarehouse = options?.defaultWarehouse || 'GEN';
      this.queue = options?.queue || new StoreAndForwardQueue({ storagePath: options?.queueStoragePath });
    }
  }

  public getQueue(): StoreAndForwardQueue {
    return this.queue;
  }

  public getIncidents(): StockIncident[] {
    return [...this.incidents];
  }

  public clearIncidents(): void {
    this.incidents = [];
  }

  /**
   * Procesa un pedido entrante de Shopify a través del pipeline tripartito:
   * 1. Verifica stock disponible Factusol DISSTO (prevención de sobreventas).
   * 2. Inyecta/reserva el pedido en Factusol (almacén central).
   * 3. Mapea a orden de venta de Holded con CanonicalTax (IVA + R.E.) y envía a Holded API.
   *    Si Holded falla (503/429/red), aísla el fallo y persiste el evento en Store-and-Forward sin alterar Factusol.
   * 4. Marca el pedido como procesado en Shopify (acknowledgeOrder).
   */
  public async processShopifyOrder(
    order: CanonicalOrder,
    options?: ProcessShopifyOrderOptions
  ): Promise<ProcessShopifyOrderResult> {
    const warehouse = order.warehouse || this.defaultWarehouse;
    const requestedSkus = (order.lines || []).map((l) => l.sku);

    // 1. Blindaje Anti-Overselling: Comprobar stock disponible (availableQuantity / DISSTO)
    const stockList = await this.factusol.readStock({ skus: requestedSkus, warehouse });
    const stockMap = new Map<string, CanonicalStock>();
    for (const stock of stockList) {
      stockMap.set(stock.sku.trim().toUpperCase(), stock);
    }

    const insufficientItems: Array<{ sku: string; requested: number; available: number }> = [];

    for (const line of order.lines || []) {
      const stock = stockMap.get(line.sku.trim().toUpperCase());
      // REGLA OBLIGATORIA: availableQuantity (DISSTO en Factusol)
      const available = stock?.availableQuantity !== undefined
        ? stock.availableQuantity
        : (stock?.quantity ?? 0);

      if (available < line.quantity) {
        insufficientItems.push({
          sku: line.sku,
          requested: line.quantity,
          available,
        });
      }
    }

    if (insufficientItems.length > 0) {
      const alertMsg = `ALERTA ANTI-OVERSELLING: Stock disponible insuficiente en Factusol para pedido ${order.orderNumber}.`;
      this.logger.warn(alertMsg, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        insufficientItems,
      });

      const incident: StockIncident = {
        id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date(),
        orderId: order.id,
        orderNumber: order.orderNumber,
        items: insufficientItems,
      };
      this.incidents.push(incident);

      await this.queue.store('STOCK_INCIDENT', {
        incident,
        order,
      });

      return {
        success: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        stockCheck: {
          passed: false,
          insufficientStockItems: insufficientItems,
        },
        incidentRegistered: true,
        error: alertMsg,
      };
    }

    // 2. Inyectar o reservar pedido en Factusol
    this.logger.info(`Inyectando pedido ${order.orderNumber} en Factusol...`);
    const factusolResult = await this.factusol.createOrder(order);

    if (!factusolResult.success) {
      const err = `Fallo al registrar pedido ${order.orderNumber} en Factusol: ${factusolResult.error || 'Error desconocido'}`;
      this.logger.error(err);
      return {
        success: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        stockCheck: { passed: true },
        factusolResult,
        error: err,
      };
    }

    this.logger.info(`✓ Pedido ${order.orderNumber} reservado en Factusol con código ${factusolResult.orderNumber || factusolResult.externalId}`);

    // 3. Crear documento en Holded si createHoldedDocument es true
    let holdedResult: HoldedSyncResult | undefined;
    const shouldCreateHoldedDoc = options?.createHoldedDocument ?? true;

    if (shouldCreateHoldedDoc) {
      // Aplicación estricta de CanonicalTax (IVA 21%, 10%, 4%, 0% y R.E. 5.2%, 1.4%, 0.5%, 0%)
      const holdedOrder = HoldedMapper.mapCanonicalOrderToHoldedSalesOrder(order, warehouse);

      try {
        let resp: { status?: number; id?: string };
        if (typeof this.holded.createSalesOrder === 'function') {
          resp = await this.holded.createSalesOrder(holdedOrder);
        } else if (typeof this.holded.createOrder === 'function') {
          const mRes = await this.holded.createOrder(order);
          resp = { status: mRes.success ? 1 : 0, id: mRes.externalId || mRes.orderId };
        } else {
          throw new Error('El cliente de Holded no implementa createSalesOrder ni createOrder');
        }

        holdedResult = {
          success: true,
          documentId: resp.id || 'holded_doc_created',
        };
        this.logger.info(`✓ Orden de venta Holded creada con éxito para pedido ${order.orderNumber}`, { documentId: resp.id });
      } catch (err: unknown) {
        // AISLAMIENTO STORE-AND-FORWARD:
        // Si Holded sufre caída (503/429/red), la operación de Factusol NUNCA se corrompe.
        // Se encola en StoreAndForwardQueue para conciliación posterior.
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`⚠️ Error en Holded API al procesar pedido ${order.orderNumber} (${errMsg}). Aislamiento activado: encolando en Store-and-Forward.`);

        const queuedEvent = await this.queue.store(
          'HOLDED_ORDER_PUSH',
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            holdedOrder,
            error: errMsg,
            failedAt: new Date().toISOString(),
          },
          { priority: 1, maxAttempts: 5 }
        );

        holdedResult = {
          success: false,
          queued: true,
          queueEventId: queuedEvent.id,
          error: errMsg,
        };
      }
    }

    // 4. Marcar pedido en Shopify si autoAcknowledge es true
    let shopifyAcknowledged = false;
    const shouldAutoAck = options?.autoAcknowledge ?? false;

    if (shouldAutoAck) {
      const remoteOrderId = order.id || order.orderNumber;
      try {
        if (typeof this.shopify.acknowledgeOrder === 'function') {
          await this.shopify.acknowledgeOrder(remoteOrderId);
        } else if (typeof (this.shopify as any).request === 'function') {
          const cleanId = String(remoteOrderId).replace(/\D/g, '');
          const gid = remoteOrderId.startsWith('gid://') ? remoteOrderId : `gid://shopify/Order/${cleanId || remoteOrderId}`;
          const mutation = `
            mutation tagsAdd($id: ID!, $tags: [String!]!) {
              tagsAdd(id: $id, tags: $tags) {
                node { id }
                userErrors { field message }
              }
            }
          `;
          await (this.shopify as any).request(mutation, { id: gid, tags: ['erp-synced', 'acknowledged'] }, 10);
        }
        shopifyAcknowledged = true;
        this.logger.info(`✓ Pedido ${order.orderNumber} acknowledged en Shopify`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`⚠️ Error al realizar acknowledge en Shopify (${errMsg}). Encolando en Store-and-Forward.`);
        await this.queue.store('SHOPIFY_ORDER_ACK', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          error: errMsg,
        });
      }
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      stockCheck: { passed: true },
      factusolResult,
      holdedResult,
      shopifyAcknowledged,
    };
  }

  /**
   * Procesa una venta directa de mostrador en Factusol y propaga el stock disponible
   * actualizado (DISSTO) de forma concurrente tanto a Shopify como a Holded.
   */
  public async processDirectSale(
    articleId: string,
    quantity: number
  ): Promise<DirectSaleResult> {
    const warehouse = this.defaultWarehouse;
    this.logger.info(`Procesando venta directa en Factusol para artículo ${articleId} (Cantidad: ${quantity})...`);

    // 1. Actualizar stock en Factusol
    if (typeof this.factusol.decrementStock === 'function') {
      await this.factusol.decrementStock(articleId, quantity, warehouse);
    } else if (typeof this.factusol.updateStock === 'function') {
      await this.factusol.updateStock(articleId, -quantity, warehouse);
    }

    // 2. Obtener stock disponible actualizado (DISSTO) de Factusol
    const stockRows = await this.factusol.readStock({ skus: [articleId], warehouse });
    const currentStock = stockRows.find(
      (s: CanonicalStock) => s.sku.trim().toUpperCase() === articleId.trim().toUpperCase()
    );

    // BLINDAJE ANTI-OVERSELLING: availableQuantity (DISSTO)
    const availableQuantity = currentStock?.availableQuantity !== undefined
      ? currentStock.availableQuantity
      : (currentStock?.quantity ?? 0);

    this.logger.info(`Stock disponible actualizado Factusol DISSTO para ${articleId}: ${availableQuantity}`);

    // 3. Propagación concurrente a Shopify y Holded (pushStockBatch)
    const stockUpdatePayload: CanonicalStockUpdate = {
      sku: articleId,
      availableStock: availableQuantity,
      quantity: availableQuantity,
      availableQuantity, // DISSTO obligatorio
      warehouse,
      lastUpdated: new Date(),
    } as unknown as CanonicalStockUpdate;

    const shopifyPromise = (async () => {
      if (typeof this.shopify.pushStockBatch === 'function') {
        return await this.shopify.pushStockBatch([stockUpdatePayload]);
      }
      return { success: true, updated: 1 };
    })();

    const holdedPromise = (async () => {
      if (typeof this.holded.pushStockBatch === 'function') {
        return await this.holded.pushStockBatch([stockUpdatePayload]);
      } else if (typeof this.holded.updateStock === 'function') {
        await this.holded.updateStock(articleId, availableQuantity);
        return { success: true, updated: 1 };
      }
      return { success: true, updated: 1 };
    })();

    const [shopifySettled, holdedSettled] = await Promise.allSettled([
      shopifyPromise,
      holdedPromise,
    ]);

    let shopifySync: { success: boolean; queued?: boolean; error?: string } = { success: true };
    if (shopifySettled.status === 'fulfilled') {
      const res = shopifySettled.value;
      shopifySync = { success: res?.success !== false };
    } else {
      const err = shopifySettled.reason instanceof Error ? shopifySettled.reason.message : String(shopifySettled.reason);
      this.logger.warn(`⚠️ Fallo al propagar stock a Shopify (${err}). Encolando en Store-and-Forward.`);
      await this.queue.store('STOCK_SYNC', {
        target: 'shopify',
        articleId,
        availableQuantity,
        error: err,
      });
      shopifySync = { success: false, queued: true, error: err };
    }

    let holdedSync: { success: boolean; queued?: boolean; error?: string } = { success: true };
    if (holdedSettled.status === 'fulfilled') {
      const res = holdedSettled.value;
      holdedSync = { success: res?.success !== false };
    } else {
      const err = holdedSettled.reason instanceof Error ? holdedSettled.reason.message : String(holdedSettled.reason);
      this.logger.warn(`⚠️ Fallo al propagar stock a Holded (${err}). Encolando en Store-and-Forward.`);
      await this.queue.store('STOCK_SYNC', {
        target: 'holded',
        articleId,
        availableQuantity,
        error: err,
      });
      holdedSync = { success: false, queued: true, error: err };
    }

    return {
      success: true,
      articleId,
      quantitySold: quantity,
      newAvailableQuantity: availableQuantity,
      shopifySync,
      holdedSync,
    };
  }
}
