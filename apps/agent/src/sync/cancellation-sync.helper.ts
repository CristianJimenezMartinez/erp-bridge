import { AccessDriver } from '@erp-bridge/connector-factusol';
import { Logger } from '@erp-bridge/shared';
import { EventBus } from '../diagnostics/event-bus';
import { OrderSyncHelper } from './order-sync.helper';

export interface CancellationSyncResult {
  ordersCancelled: number;
  itemsRestocked: number;
  errors: string[];
}

export interface UniversalBridgeCancellationOptions {
  endpointUrl: string;
  headers: Record<string, string>;
  driver: AccessDriver;
  orderSeries?: string;
  defaultWarehouse?: string;
  eventBus?: EventBus;
}

export interface WooCommerceCancellationOptions {
  storeUrl: string;
  authHeader: string;
  driver: AccessDriver;
  orderSeries?: string;
  defaultWarehouse?: string;
  eventBus?: EventBus;
}

/**
 * Servicio desacoplado de sincronización inversa para pedidos cancelados o reembolsados.
 *
 * Misión de blindaje de stock:
 * Cuando un cliente cancela o devuelve un pedido en la tienda web (Universal Bridge MariaDB/PHP
 * o WooCommerce REST API), este helper localiza el pedido correspondiente en Factusol (F_PCL),
 * actualiza su estado a cancelado/anulado (ESTPCL = 3) y repone automáticamente las existencias
 * vendidas en el inventario disponible de Factusol (F_STO / DISSTO).
 */
export class CancellationSyncHelper {
  private static readonly logger = new Logger('CancellationSyncHelper');

  /**
   * Sanitiza cadenas de texto para inserción segura en consultas SQL Access.
   */
  private static sanitizeSql(val: unknown): string {
    if (val === null || val === undefined) return '';
    return String(val).trim().replace(/'/g, "''");
  }

  /**
   * Repone atómicamente el stock en Factusol (F_STO) y actualiza el estado del pedido (F_PCL) a cancelado (ESTPCL = 3).
   *
   * @param driver Conductor AccessDriver OLEDB
   * @param orderNumber Número de pedido en Factusol (CODPCL)
   * @param series Serie de facturación Factusol (TIPPCL)
   * @param defaultWarehouse Almacén por defecto si el pedido no especifica uno
   * @param fallbackLines Líneas alternativas provenientes de la tienda si F_LPC no contiene registros
   */
  public static async restoreFactusolOrderStock(
    driver: AccessDriver,
    orderNumber: number,
    series = '1',
    defaultWarehouse = 'GEN',
    fallbackLines: any[] = []
  ): Promise<{ alreadyCancelled: boolean; linesRestocked: number }> {
    const code = Math.floor(Number(orderNumber));
    if (isNaN(code) || code <= 0) {
      throw new Error(`Número de pedido Factusol inválido: ${orderNumber}`);
    }

    const safeSeries = CancellationSyncHelper.sanitizeSql(series || '1').substring(0, 1) || '1';
    const safeDefaultWarehouse = CancellationSyncHelper.sanitizeSql(defaultWarehouse || 'GEN').substring(0, 3) || 'GEN';

    // 1. Consultar cabecera del pedido (F_PCL) para verificar estado actual y almacén asignado
    const headerRows = await driver
      .query<{ ALMPCL: string; ESTPCL: number; TIPPCL?: string }>(
        `SELECT ALMPCL, ESTPCL FROM F_PCL WHERE CODPCL = ${code} AND TIPPCL = '${safeSeries}'`
      )
      .catch((err) => {
        CancellationSyncHelper.logger.warn(`Error al consultar F_PCL para pedido #${code}: ${String(err)}`);
        return [];
      });

    let matchedSeries = safeSeries;
    let header = headerRows[0];

    if (!header) {
      // Intentar buscar el pedido en cualquier serie si difiere de la serie por defecto
      const anySeriesRows = await driver
        .query<{ ALMPCL: string; ESTPCL: number; TIPPCL: string }>(
          `SELECT ALMPCL, ESTPCL, TIPPCL FROM F_PCL WHERE CODPCL = ${code}`
        )
        .catch(() => []);
      if (anySeriesRows && anySeriesRows.length > 0) {
        header = anySeriesRows[0];
        matchedSeries = String(anySeriesRows[0]?.TIPPCL || safeSeries).trim().substring(0, 1) || safeSeries;
      }
    }

    // Guardarraíl anti-inflación: si el pedido no existe en F_PCL, no reponer inventario a ciegas
    if (!header) {
      CancellationSyncHelper.logger.warn(
        `[Anti-Inflation Guardrail] Pedido #${code} no existe en F_PCL. Se omite reposición de stock para evitar creación de existencias fantasma.`
      );
      return { alreadyCancelled: true, linesRestocked: 0 };
    }

    const currentEst = header.ESTPCL !== undefined ? Number(header.ESTPCL) : null;
    const warehouse = (header.ALMPCL && header.ALMPCL.trim()) || safeDefaultWarehouse;
    const safeWarehouse = CancellationSyncHelper.sanitizeSql(warehouse).substring(0, 3) || 'GEN';

    // Guardarraíl anti-doble reposición: si el pedido ya está en estado anulado (ESTPCL = 3), no reponer dos veces
    if (currentEst === 3) {
      CancellationSyncHelper.logger.info(
        `Pedido Factusol #${code} (Serie ${matchedSeries}) ya se encontraba en estado anulado (ESTPCL = 3). Se omite reposición redundante de stock.`
      );
      return { alreadyCancelled: true, linesRestocked: 0 };
    }

    // 2. Consultar líneas del pedido en Factusol (F_LPC)
    const dbLines = await driver
      .query<{ ARTLPC: string; CANLPC: number }>(
        `SELECT ARTLPC, CANLPC FROM F_LPC WHERE CODLPC = ${code} AND TIPLPC = '${matchedSeries}'`
      )
      .catch(() => []);

    const linesToRestore: Array<{ sku: string; quantity: number }> = [];

    if (dbLines && dbLines.length > 0) {
      for (const line of dbLines) {
        const rawSku = String(line.ARTLPC || '').trim();
        const qty = Number(line.CANLPC || 0);
        if (rawSku && qty > 0) {
          linesToRestore.push({ sku: rawSku, quantity: qty });
        }
      }
    } else if (Array.isArray(fallbackLines) && fallbackLines.length > 0) {
      // Si por alguna razón F_LPC no tiene líneas, usar líneas enviadas por la tienda web
      for (const fl of fallbackLines) {
        const rawSku = String(fl.ARTLPC || fl.artlpc || fl.sku || fl.code || '').trim();
        const qty = Number(fl.CANLPC ?? fl.canlpc ?? fl.quantity ?? fl.qty ?? 0);
        if (rawSku && qty > 0) {
          linesToRestore.push({ sku: rawSku, quantity: qty });
        }
      }
    }

    // 3. Construir sentencias atómicas de actualización
    const sqlStatements: string[] = [];

    // Marcar pedido en F_PCL como anulado/cancelado (ESTPCL = 3)
    sqlStatements.push(
      `UPDATE F_PCL SET ESTPCL = 3 WHERE CODPCL = ${code} AND TIPPCL = '${matchedSeries}'`
    );

    // Reponer stock disponible (DISSTO) de cada artículo en F_STO
    for (const item of linesToRestore) {
      const safeSku = CancellationSyncHelper.sanitizeSql(item.sku).substring(0, 13);
      const qty = Number(item.quantity);
      sqlStatements.push(
        `UPDATE F_STO SET DISSTO = DISSTO + ${qty} WHERE ARTSTO = '${safeSku}' AND ALMSTO = '${safeWarehouse}'`
      );
    }

    // 4. Ejecución atómica en transacción
    await driver.executeTransaction(sqlStatements);

    CancellationSyncHelper.logger.info(
      `✓ Pedido Factusol #${code} (Serie ${safeSeries}) cancelado: ${linesToRestore.length} artículos repuestos en almacén ${safeWarehouse}.`
    );

    return { alreadyCancelled: false, linesRestocked: linesToRestore.length };
  }

  /**
   * Rutina de sincronización inversa de cancelaciones para Universal Bridge (MariaDB / PHP).
   */
  public static async syncUniversalBridgeCancellations(
    options: UniversalBridgeCancellationOptions
  ): Promise<CancellationSyncResult> {
    const { endpointUrl, headers, driver, orderSeries = '1', defaultWarehouse = 'GEN', eventBus } = options;
    const result: CancellationSyncResult = {
      ordersCancelled: 0,
      itemsRestocked: 0,
      errors: [],
    };

    try {
      const pullUrl = `${endpointUrl}?action=pull_cancelled_orders&limit=100`;
      const res = await fetch(pullUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(15000),
      }).catch((err) => {
        CancellationSyncHelper.logger.warn(`Error de red al consultar pedidos cancelados en Universal Bridge: ${String(err)}`);
        return null;
      });

      if (!res || !res.ok) {
        return result;
      }

      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        orders?: any[];
      } | null;

      const cancelledOrders = json?.orders || [];
      if (!Array.isArray(cancelledOrders) || cancelledOrders.length === 0) {
        return result;
      }

      const confirmations: Array<{
        id: number;
        orderId: number;
        webOrderId: number;
        factusolOrderNumber: number;
      }> = [];

      for (const po of cancelledOrders) {
        const numId = Number(po.id);
        const factOrderNum = Number(po.factusol_order_number || po.factusolOrderNumber);

        if (!factOrderNum || isNaN(factOrderNum)) {
          // El pedido no llegó a crearse en Factusol; confirmar para sacarlo de la cola
          confirmations.push({
            id: numId,
            orderId: numId,
            webOrderId: numId,
            factusolOrderNumber: 0,
          });
          continue;
        }

        const series = po.factusol_series || po.factusolSeries || orderSeries || '1';
        const lines = Array.isArray(po.lines) ? po.lines : [];

        try {
          const restoreRes = await CancellationSyncHelper.restoreFactusolOrderStock(
            driver,
            factOrderNum,
            series,
            defaultWarehouse,
            lines
          );

          result.ordersCancelled++;
          result.itemsRestocked += restoreRes.linesRestocked;

          confirmations.push({
            id: numId,
            orderId: numId,
            webOrderId: numId,
            factusolOrderNumber: factOrderNum,
          });

          const msg = `✓ Pedido web cancelado #${po.order_number || numId}: stock repuesto en Factusol (Pedido Factusol #${factOrderNum}, Serie ${series}).`;
          CancellationSyncHelper.logger.info(msg);
          if (eventBus) {
            eventBus.addEvent('success', msg);
          }
        } catch (restoreErr) {
          const errText = `Fallo al reponer stock del pedido cancelado #${numId} (Factusol #${factOrderNum}): ${String(restoreErr)}`;
          CancellationSyncHelper.logger.error(errText);
          result.errors.push(errText);
          if (eventBus) {
            eventBus.addEvent('error', `❌ ${errText}`);
          }
        }
      }

      // Enviar confirmación (ack_cancelled_orders) al endpoint para marcar factusol_unstocked = 1
      if (confirmations.length > 0) {
        const ackRes = await fetch(`${endpointUrl}?action=ack_cancelled_orders`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ confirmations }),
          signal: AbortSignal.timeout(15000),
        }).catch((err) => {
          CancellationSyncHelper.logger.warn(`Error al enviar ack_cancelled_orders a Universal Bridge: ${String(err)}`);
          return null;
        });

        if (ackRes && ackRes.ok) {
          CancellationSyncHelper.logger.info(
            `Confirmada reposición de ${confirmations.length} pedidos cancelados en Universal Bridge.`
          );
        }
      }
    } catch (err) {
      const msg = `Incidencia general en sincronización inversa de cancelaciones (Universal Bridge): ${String(err)}`;
      CancellationSyncHelper.logger.warn(msg);
      result.errors.push(msg);
    }

    return result;
  }

  /**
   * Rutina de sincronización inversa de cancelaciones y devoluciones para WooCommerce REST API.
   */
  public static async syncWooCommerceCancellations(
    options: WooCommerceCancellationOptions
  ): Promise<CancellationSyncResult> {
    const { storeUrl, authHeader, driver, orderSeries = '1', defaultWarehouse = 'GEN', eventBus } = options;
    const cleanUrl = storeUrl.trim().replace(/\/+$/, '');
    const result: CancellationSyncResult = {
      ordersCancelled: 0,
      itemsRestocked: 0,
      errors: [],
    };

    const targetStatuses = ['cancelled', 'refunded'];

    for (const status of targetStatuses) {
      let page = 1;
      let hasMore = true;
      const MAX_PAGES = 5;

      while (hasMore && page <= MAX_PAGES) {
        const url = `${cleanUrl}/wp-json/wc/v3/orders?status=${status}&per_page=50&page=${page}&orderby=date&order=desc`;
        const res = await fetch(url, {
          headers: { Authorization: authHeader },
          signal: AbortSignal.timeout(15000),
        }).catch((err) => {
          CancellationSyncHelper.logger.warn(`Error al consultar pedidos ${status} en WooCommerce (página ${page}): ${String(err)}`);
          return null;
        });

        if (!res || !res.ok) {
          break;
        }

        const wcOrders = (await res.json().catch(() => [])) as any[];
        if (!Array.isArray(wcOrders) || wcOrders.length === 0) {
          hasMore = false;
          break;
        }

        for (const wcOrder of wcOrders) {
          const check = OrderSyncHelper.isWcOrderCancelledNeedingRestock(wcOrder);
          if (!check.needsRestock || !check.factusolOrderNumber) {
            continue;
          }

          const factOrderNum = check.factusolOrderNumber;
          try {
            const restoreRes = await CancellationSyncHelper.restoreFactusolOrderStock(
              driver,
              factOrderNum,
              orderSeries,
              defaultWarehouse,
              wcOrder.line_items || []
            );

            // Marcar en WooCommerce con metadato '_bentian_factusol_cancelled: "1"'
            await fetch(`${cleanUrl}/wp-json/wc/v3/orders/${wcOrder.id}`, {
              method: 'PUT',
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                meta_data: [{ key: '_bentian_factusol_cancelled', value: '1' }],
              }),
              signal: AbortSignal.timeout(15000),
            }).catch((err) => {
              CancellationSyncHelper.logger.warn(`Aviso al marcar pedido #${wcOrder.id} como cancelado en WooCommerce: ${String(err)}`);
            });

            result.ordersCancelled++;
            result.itemsRestocked += restoreRes.linesRestocked;

            const msg = `✓ Pedido WooCommerce #${wcOrder.id} (${status}): stock repuesto en Factusol (Pedido Factusol #${factOrderNum}, Serie ${orderSeries}).`;
            CancellationSyncHelper.logger.info(msg);
            if (eventBus) {
              eventBus.addEvent('success', msg);
            }
          } catch (wcErr) {
            const errText = `Fallo al procesar pedido WooCommerce #${wcOrder.id} cancelado/reembolsado: ${String(wcErr)}`;
            CancellationSyncHelper.logger.error(errText);
            result.errors.push(errText);
            if (eventBus) {
              eventBus.addEvent('error', `❌ ${errText}`);
            }
          }
        }

        if (wcOrders.length < 50) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    return result;
  }
}
