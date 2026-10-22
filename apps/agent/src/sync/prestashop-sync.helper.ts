import { AccessDriver } from '@erp-bridge/connector-factusol';
import { Logger } from '@erp-bridge/shared';
import { OrderSyncHelper } from './order-sync.helper';
import { AgentDiskLogger } from '../diagnostics/disk-logger';
import { IErpConnector } from '../erp';

const logger = new Logger('PrestashopSyncHelper');

function normalizeAndValidatePrestashopUrl(rawUrl: string): string | null {
  try {
    let urlStr = (rawUrl || '').trim().replace(/\/+$/, '');
    if (!urlStr) return null;
    if (!/^https?:\/\//i.test(urlStr)) urlStr = `https://${urlStr}`;
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const h = parsed.hostname.toLowerCase().trim().replace(/^\[|\]$/g, '');
    if (
      h === '169.254.169.254' || h === '0.0.0.0' || h === '::1' ||
      h.startsWith('fe80:') || h.startsWith('fc00:') || h.startsWith('fd00:') ||
      h.endsWith('.internal') || h.endsWith('.local') || h.endsWith('.onion')
    ) return null;
    const ipMatch = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch && h !== '127.0.0.1') {
      const b0 = parseInt(ipMatch[1]!, 10);
      const b1 = parseInt(ipMatch[2]!, 10);
      if (b0 === 10 || b0 === 0 || (b0 === 172 && b1 >= 16 && b1 <= 31) || (b0 === 192 && b1 === 168)) return null;
    }
    return parsed.origin + parsed.pathname.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export class PrestashopSyncHelper {
  private static getAuthHeader(apiKey: string): string {
    return 'Basic ' + Buffer.from(`${apiKey.trim()}:`).toString('base64');
  }

  public static async syncStockToPrestashop(
    driver: AccessDriver,
    config: any,
    warehouseCode: string,
    options?: { erpConnector?: IErpConnector }
  ): Promise<{ itemsUpdated: number }> {
    const ps = config.prestashop;
    if (!ps?.storeUrl || !ps?.apiKey) return { itemsUpdated: 0 };
    const cleanUrl = normalizeAndValidatePrestashopUrl(ps.storeUrl);
    if (!cleanUrl) return { itemsUpdated: 0 };

    const authHeader = this.getAuthHeader(ps.apiKey);
    const warehouse = (warehouseCode || 'GEN').replace(/'/g, "''").trim();
    const erpName = options?.erpConnector?.displayName || 'Factusol';
    const tStockStart = performance.now();
    let stockMap = new Map<string, number>();

    if (options?.erpConnector) {
      stockMap = await options.erpConnector.getStockMap(warehouse);
    } else if (driver) {
      const rows = await driver.query<{ CODSTO: string; ACTSTO: number; DISSTO: number }>(
        `SELECT CODSTO, ACTSTO, DISSTO FROM F_STO WHERE ALMSTO = '${warehouse}'`
      );
      for (const r of Array.isArray(rows) ? rows : []) {
        const code = (r.CODSTO || '').trim().toUpperCase();
        if (!code) continue;
        const rawAvail = r.DISSTO !== undefined && r.DISSTO !== null ? Number(r.DISSTO) : Number(r.ACTSTO || 0);
        stockMap.set(code, Math.max(0, Math.round(rawAvail)));
      }
    }
    if (!stockMap || stockMap.size === 0) return { itemsUpdated: 0 };

    try {
      const [prodRes, combRes, stockAvailRes]: any[] = await Promise.all([
        fetch(`${cleanUrl}/api/products?display=[id,reference]&output_format=JSON`, {
          headers: { Authorization: authHeader, Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        }),
        fetch(`${cleanUrl}/api/combinations?display=[id,id_product,reference]&output_format=JSON`, {
          headers: { Authorization: authHeader, Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        }).catch(() => null),
        fetch(
          `${cleanUrl}/api/stock_availables?display=[id,id_product,id_product_attribute,id_shop,id_shop_group,quantity,depends_on_stock,out_of_stock]&output_format=JSON`,
          { headers: { Authorization: authHeader, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) }
        ),
      ]);
      if (!prodRes?.ok || !stockAvailRes?.ok) return { itemsUpdated: 0 };

      const prodData = await prodRes.json().catch(() => ({}));
      const combData = combRes?.ok ? await combRes.json().catch(() => ({})) : {};
      const saData = await stockAvailRes.json().catch(() => ({}));

      const prodSkuById = new Map<string, string>();
      for (const p of Array.isArray(prodData?.products) ? prodData.products : []) {
        const ref = String(p.reference || '').trim().toUpperCase();
        if (p.id !== undefined && ref) prodSkuById.set(String(p.id), ref);
      }
      const combSkuByKey = new Map<string, string>();
      for (const c of Array.isArray(combData?.combinations) ? combData.combinations : []) {
        const ref = String(c.reference || '').trim().toUpperCase();
        if (c.id !== undefined && c.id_product !== undefined && ref) combSkuByKey.set(`${c.id_product}:${c.id}`, ref);
      }

      let itemsUpdated = 0;
      for (const sa of Array.isArray(saData?.stock_availables) ? saData.stock_availables : []) {
        const attrId = Number(sa.id_product_attribute || 0);
        const sku = attrId > 0 ? combSkuByKey.get(`${sa.id_product}:${attrId}`) : prodSkuById.get(String(sa.id_product));
        if (!sku || !stockMap.has(sku)) continue;
        const targetQty = stockMap.get(sku)!;
        if (Number(sa.quantity ?? -1) === targetQty) continue;

        const xmlBody =
          `<?xml version="1.0" encoding="UTF-8"?><prestashop xmlns:xlink="http://www.w3.org/1999/xlink"><stock_available>` +
          `<id>${Number(sa.id)}</id><id_product>${Number(sa.id_product)}</id_product><id_product_attribute>${attrId}</id_product_attribute>` +
          `<id_shop>${Number(sa.id_shop || 1)}</id_shop><id_shop_group>${Number(sa.id_shop_group || 0)}</id_shop_group>` +
          `<quantity>${targetQty}</quantity><depends_on_stock>${Number(sa.depends_on_stock || 0)}</depends_on_stock>` +
          `<out_of_stock>${Number(sa.out_of_stock ?? 2)}</out_of_stock></stock_available></prestashop>`;

        const putRes: any = await fetch(`${cleanUrl}/api/stock_availables/${Number(sa.id)}`, {
          method: 'PUT',
          headers: { Authorization: authHeader, 'Content-Type': 'application/xml; charset=utf-8' },
          body: xmlBody,
          signal: AbortSignal.timeout(12000),
        }).catch(() => null);
        if (putRes?.ok) itemsUpdated++;
      }

      const durMs = Math.round(performance.now() - tStockStart);
      if (itemsUpdated > 0) {
        AgentDiskLogger.getInstance().log({
          level: 'SUCCESS', component: 'SyncEngine', action: 'push_channel_stock', duration_ms: durMs, status: 'SUCCESS',
          message: `Stock sincronizado en PrestaShop desde ${erpName}: ${itemsUpdated} referencias actualizadas en ${durMs}ms`,
          metadata: { channel: 'prestashop', itemsUpdated },
        });
      }
      return { itemsUpdated };
    } catch (err) {
      logger.warn(`Aviso al sincronizar stock con PrestaShop: ${String(err)}`);
      return { itemsUpdated: 0 };
    }
  }

  public static async importPrestashopOrders(
    _driver: AccessDriver,
    config: any,
    options: {
      plausibilityAdapter: any;
      orderNotifier: any;
      salesLedgerManager: any;
      eventBus: any;
      series: string;
      warehouse: string;
      erpConnector?: IErpConnector;
    }
  ): Promise<{ ordersImported: number }> {
    const ps = config.prestashop;
    if (!ps?.storeUrl || !ps?.apiKey || !options.erpConnector) return { ordersImported: 0 };
    const cleanUrl = normalizeAndValidatePrestashopUrl(ps.storeUrl);
    if (!cleanUrl) return { ordersImported: 0 };

    const authHeader = this.getAuthHeader(ps.apiKey);
    const erpName = options.erpConnector.displayName || 'Factusol';
    let ordersImported = 0;

    try {
      const res: any = await fetch(`${cleanUrl}/api/orders?display=full&sort=[id_DESC]&limit=30&output_format=JSON`, {
        headers: { Authorization: authHeader, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return { ordersImported: 0 };

      const data = await res.json().catch(() => ({}));
      const existingLedger = options.salesLedgerManager?.getOrders?.({ channel: 'prestashop', limit: 200 })?.orders || [];
      const syncedIds = new Set(existingLedger.filter((r: any) => r.status === 'synced').map((r: any) => String(r.webOrderId)));

      for (const psOrd of Array.isArray(data?.orders) ? data.orders : []) {
        const ordId = String(psOrd.id || '');
        if (!ordId || syncedIds.has(ordId) || Number(psOrd.valid ?? 1) === 0) continue;
        const rawLines = Array.isArray(psOrd.associations?.order_rows) ? psOrd.associations.order_rows : [];
        if (rawLines.length === 0) continue;

        const canonicalOrder = OrderSyncHelper.universalBridgeToCanonical(
          {
            id: ordId,
            order_number: psOrd.reference ? `PS-${psOrd.reference}` : `PS-${ordId}`,
            created_at: psOrd.date_add,
            total: parseFloat(psOrd.total_paid_tax_incl || psOrd.total_paid || '0'),
            subtotal: parseFloat(psOrd.total_products || '0'),
            shipping_cost: parseFloat(psOrd.total_shipping_tax_incl || '0'),
            payment_method: psOrd.payment || 'PrestaShop',
            customer: { fullName: `Cliente PrestaShop #${psOrd.id_customer || ordId}` },
            lines: rawLines.map((li: any) => ({
              sku: li.product_reference || `PS-${li.product_id}`,
              name: li.product_name || 'Artículo PrestaShop',
              quantity: Number(li.product_quantity || 1),
              unitPrice: parseFloat(li.unit_price_tax_excl || li.product_price || '0'),
              vatPercent: 21,
            })),
          },
          options.series,
          options.warehouse
        );

        const check = options.plausibilityAdapter.validateAndSanitize(canonicalOrder);
        if (!check.valid || !check.sanitizedOrder) continue;

        const mutRes = await options.erpConnector.createOrder(check.sanitizedOrder, options.series, options.warehouse);
        if (mutRes.success) {
          ordersImported++;
          const assignedNum = mutRes.externalId || (mutRes as any).orderNumber || 0;
          options.eventBus.addEvent('success', `✓ Pedido PrestaShop ${canonicalOrder.reference} registrado en ${erpName} (Nº ${assignedNum}).`);
          options.salesLedgerManager?.recordOrder({
            channel: 'prestashop', webOrderId: ordId, orderNumber: canonicalOrder.reference,
            date: psOrd.date_add || new Date().toISOString(), factusolSeries: options.series,
            factusolOrderNumber: String(assignedNum), customerName: canonicalOrder.customer.fiscalName,
            totalAmount: canonicalOrder.totalAmount, currency: 'EUR', status: 'synced',
            lines: canonicalOrder.lines.map((l) => ({ sku: l.sku, name: l.name, quantity: l.quantity, unitPrice: l.unitPrice, total: l.total })),
          });
        }
      }
    } catch (err) {
      logger.warn(`Aviso importando pedidos de PrestaShop: ${String(err)}`);
    }
    return { ordersImported };
  }
}
