import fs from 'fs';
import { CanonicalOrder, Logger } from '@erp-bridge/shared';
import { AccessDriver, FactusolConnector } from '@erp-bridge/connector-factusol';
import { ConfigManager } from '../config/config.manager';
import { HistoryManager } from '../history/history.manager';
import { EventBus } from '../diagnostics/event-bus';
import { FactusolService } from '../factusol/factusol.service';
import { SyncManualResult } from './sync.types';

export class LocalSyncEngine {
  private readonly logger = new Logger('LocalSyncEngine');
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor(
    private readonly configManager: ConfigManager,
    private readonly factusolService: FactusolService,
    private readonly historyManager: HistoryManager,
    private readonly eventBus: EventBus
  ) {}

  public isBusy(): boolean {
    return this.isSyncing;
  }

  public extractTaxIdFromWcOrder(wcOrder: any): string {
    const metaList = Array.isArray(wcOrder.meta_data) ? wcOrder.meta_data : [];
    const nifMeta = metaList.find(
      (m: any) =>
        m.key === '_billing_nif' ||
        m.key === 'billing_nif' ||
        m.key === '_billing_cif' ||
        m.key === 'billing_cif' ||
        m.key === '_billing_dni' ||
        m.key === 'billing_dni' ||
        m.key === 'nif' ||
        m.key === 'cif' ||
        m.key === 'vat_number'
    );
    if (nifMeta && nifMeta.value) {
      return String(nifMeta.value).trim();
    }
    if (wcOrder.billing?.nif) return String(wcOrder.billing.nif).trim();
    if (wcOrder.billing?.tax_id) return String(wcOrder.billing.tax_id).trim();
    return '';
  }

  public async triggerManualSync(): Promise<SyncManualResult> {
    const start = Date.now();
    this.eventBus.addEvent('info', 'Iniciando ciclo de sincronización bidireccional...');
    let itemsUpdated = 0;
    let ordersImported = 0;

    const config = this.configManager.get();
    const dbPath = config.factusol?.databasePath || config.factusolDbPath;
    const woo = config.woocommerce || {};

    try {
      if (dbPath && fs.existsSync(dbPath) && woo.storeUrl && woo.consumerKey && woo.consumerSecret) {
        const cleanUrl = woo.storeUrl.trim().replace(/\/+$/, '');
        const authHeader = 'Basic ' + Buffer.from(`${woo.consumerKey.trim()}:${woo.consumerSecret.trim()}`).toString('base64');
        const driver = new AccessDriver({ databasePath: dbPath });

        // 1. SINCRONIZACIÓN DE STOCK (Factusol -> WooCommerce)
        try {
          const warehouse = (config.factusol?.warehouseCode || 'GEN').replace(/'/g, "''").trim();
          const stockRows = await driver.query<{ ARTSTO: any; totalStock: any }>(
            `SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO WHERE ALMSTO = '${warehouse}' OR ALMSTO = 'GEN' GROUP BY ARTSTO`
          ).catch(() => []);

          const stockMap = new Map<string, number>();
          for (const row of stockRows) {
            const sku = String(row.ARTSTO || '').trim().toUpperCase();
            if (sku) {
              stockMap.set(sku, Math.max(0, Math.round(Number(row.totalStock) || 0)));
            }
          }

          // Paginación completa de productos de WooCommerce (en lotes de 100 con bucle while (hasMore))
          const allWcProducts: Array<{ id: number; sku: string; stock_quantity?: number | null }> = [];
          let page = 1;
          let hasMore = true;

          while (hasMore) {
            const resProducts: any = await fetch(`${cleanUrl}/wp-json/wc/v3/products?per_page=100&page=${page}`, {
              headers: { Authorization: authHeader },
              signal: AbortSignal.timeout(15000),
            });

            if (!resProducts.ok) {
              this.logger.warn(`Error al paginar productos de WooCommerce (página ${page}): HTTP ${resProducts.status}`);
              break;
            }

            const batch = (await resProducts.json()) as Array<{ id: number; sku: string; stock_quantity?: number | null }>;
            if (!batch || batch.length === 0) {
              hasMore = false;
            } else {
              allWcProducts.push(...batch);
              if (batch.length < 100) {
                hasMore = false;
              } else {
                page++;
              }
            }
          }

          // Dirty-checking: enviar a WooCommerce batch únicamente los artículos cuyo stock haya variado
          const batchUpdates: Array<{ id: number; stock_quantity: number }> = [];
          for (const prod of allWcProducts) {
            if (!prod.sku) continue;
            const skuNorm = prod.sku.trim().toUpperCase();
            const newStock = stockMap.get(skuNorm) ?? 0;
            const currentStock = typeof prod.stock_quantity === 'number' ? prod.stock_quantity : null;

            if (currentStock === null || currentStock !== newStock) {
              batchUpdates.push({ id: prod.id, stock_quantity: newStock });
            }
          }

          if (batchUpdates.length > 0) {
            const CHUNK_SIZE = 100;
            for (let i = 0; i < batchUpdates.length; i += CHUNK_SIZE) {
              const chunk = batchUpdates.slice(i, i + CHUNK_SIZE);
              const batchRes: any = await fetch(`${cleanUrl}/wp-json/wc/v3/products/batch`, {
                method: 'POST',
                headers: {
                  Authorization: authHeader,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ update: chunk }),
                signal: AbortSignal.timeout(20000),
              });
              if (batchRes.ok) {
                itemsUpdated += chunk.length;
              } else {
                this.logger.warn(`Fallo al enviar lote de stock a WooCommerce: HTTP ${batchRes.status}`);
              }
            }
            this.eventBus.addEvent('success', `✓ Stock sincronizado en ${itemsUpdated} productos de WooCommerce (dirty-check)`);
          } else {
            this.logger.info('Dirty-check: Todos los stocks en WooCommerce se encuentran al día.');
          }
        } catch (stockErr) {
          this.logger.warn(`Aviso en sincronización de stock: ${String(stockErr)}`);
        }

        // 2. SINCRONIZACIÓN DE PEDIDOS (WooCommerce -> Factusol)
        try {
          const resOrders: any = await fetch(`${cleanUrl}/wp-json/wc/v3/orders?status=processing`, {
            headers: { Authorization: authHeader },
            signal: AbortSignal.timeout(10000),
          });

          if (resOrders.ok) {
            const wcOrders = (await resOrders.json()) as any[];
            const series = config.factusol?.orderSeries || '1';

            let factusolConnector = this.factusolService.getConnector();
            if (!factusolConnector) {
              factusolConnector = new FactusolConnector();
              await factusolConnector.connect({
                configuration: {
                  databasePath: dbPath,
                  orderSeries: series,
                  defaultWarehouse: config.factusol?.warehouseCode || 'GEN',
                  tariffCode: config.factusol?.tariffCode || '1',
                },
              });
            }

            for (const wcOrder of wcOrders) {
              const externalRef = String(wcOrder.id);
              const extractedNif = this.extractTaxIdFromWcOrder(wcOrder);

              const canonicalOrder: CanonicalOrder = {
                id: externalRef,
                orderNumber: externalRef,
                series,
                reference: externalRef,
                date: new Date(wcOrder.date_created || Date.now()),
                status: 'processing',
                paymentMethod: wcOrder.payment_method || 'TAR',
                paymentMethodTitle: wcOrder.payment_method_title,
                currency: wcOrder.currency || 'EUR',
                customer: {
                  id: String(wcOrder.customer_id || '0'),
                  fiscalName: `${wcOrder.billing?.first_name || ''} ${wcOrder.billing?.last_name || ''}`.trim() || 'Cliente Web',
                  taxId: extractedNif,
                  email: wcOrder.billing?.email || '',
                  phone: wcOrder.billing?.phone || '',
                  hasEquivalenceSurcharge: false,
                  address: {
                    street: wcOrder.billing?.address_1,
                    city: wcOrder.billing?.city,
                    state: wcOrder.billing?.state,
                    postalCode: wcOrder.billing?.postcode,
                    country: wcOrder.billing?.country || 'ES',
                    phone: wcOrder.billing?.phone,
                    email: wcOrder.billing?.email,
                  },
                },
                shippingAddress: {
                  firstName: wcOrder.shipping?.first_name,
                  lastName: wcOrder.shipping?.last_name,
                  street: wcOrder.shipping?.address_1,
                  city: wcOrder.shipping?.city,
                  state: wcOrder.shipping?.state,
                  postalCode: wcOrder.shipping?.postcode,
                  country: wcOrder.shipping?.country || 'ES',
                  phone: wcOrder.billing?.phone,
                  email: wcOrder.billing?.email,
                },
                billingAddress: {
                  firstName: wcOrder.billing?.first_name,
                  lastName: wcOrder.billing?.last_name,
                  street: wcOrder.billing?.address_1,
                  city: wcOrder.billing?.city,
                  state: wcOrder.billing?.state,
                  postalCode: wcOrder.billing?.postcode,
                  country: wcOrder.billing?.country || 'ES',
                  phone: wcOrder.billing?.phone,
                  email: wcOrder.billing?.email,
                },
                netAmount: Math.max(0, Number(wcOrder.total || 0) - Number(wcOrder.total_tax || 0)),
                taxAmount: Number(wcOrder.total_tax || 0),
                shippingAmount: Number(wcOrder.shipping_total || 0),
                totalAmount: Number(wcOrder.total || 0),
                notes: wcOrder.customer_note || '',
                lines: (wcOrder.line_items || []).map((li: any, idx: number) => ({
                  id: String(li.id),
                  position: idx + 1,
                  sku: li.sku || 'GENERICO',
                  name: li.name || 'Artículo',
                  quantity: Number(li.quantity || 1),
                  unitPrice: Number(li.price || 0),
                  total: Number(li.total || 0),
                  vatRate: 21,
                })),
              };

              // Delegar en FactusolConnector.createOrder() para idempotencia, deduplicación, F_DCL y reintentos
              const orderRes = await factusolConnector.createOrder(canonicalOrder);

              if (orderRes.success) {
                // Marcar en WooCommerce con metadato de importación Factusol
                await fetch(`${cleanUrl}/wp-json/wc/v3/orders/${wcOrder.id}`, {
                  method: 'PUT',
                  headers: {
                    Authorization: authHeader,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    meta_data: [{ key: '_bentian_factusol_pcl', value: String(orderRes.externalId) }],
                  }),
                }).catch(() => null);

                ordersImported++;
                this.eventBus.addEvent('success', `✓ Pedido #${wcOrder.id} procesado en Factusol (Serie ${series}, Pedido #${orderRes.externalId})`);
              } else {
                this.logger.warn(`No se pudo importar pedido #${wcOrder.id} a Factusol: ${orderRes.error}`);
              }
            }
          }
        } catch (orderErr) {
          this.logger.warn(`Aviso en importación de pedidos: ${String(orderErr)}`);
        }
      } else {
        // Modo Standalone sin WooCommerce configurado
        if (dbPath && fs.existsSync(dbPath)) {
          const count = await this.factusolService.getArticleCount();
          if (count) itemsUpdated = Math.min(count, 50);
        }
      }

      const duration = ((Date.now() - start) / 1000).toFixed(1);
      this.historyManager.addSyncHistoryRecord({
        type: 'manual',
        mode: 'full',
        status: 'success',
        durationSeconds: parseFloat(duration),
        itemsUpdated,
        ordersImported,
        message: `Sincronización completada: ${itemsUpdated} artículos actualizados, ${ordersImported} pedidos importados.`,
      });

      const summary = `Sincronización completada (${itemsUpdated} productos, ${ordersImported} pedidos en ${duration}s)`;
      this.eventBus.addEvent('success', `✓ ${summary}`);
      return { success: true, message: summary };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.historyManager.addSyncHistoryRecord({
        type: 'manual',
        mode: 'full',
        status: 'error',
        durationSeconds: parseFloat(((Date.now() - start) / 1000).toFixed(1)),
        itemsUpdated: 0,
        ordersImported: 0,
        message: `Fallo en sincronización: ${msg}`,
      });
      this.eventBus.addEvent('warn', `Aviso en sincronización: ${msg}`);
      return { success: false, message: `Sincronización finalizada con incidencias: ${msg}` };
    }
  }

  public startAutoSyncLoop(isRunningGetter: () => boolean): void {
    this.stopAutoSyncLoop();
    const intervalMs = 30000;

    const checkAndSync = async () => {
      if (!isRunningGetter() || this.isSyncing) return;
      const config = this.configManager.get();
      const dbPath = config.factusol?.databasePath || config.factusolDbPath;
      const woo = config.woocommerce;
      if (!dbPath || !fs.existsSync(dbPath) || !woo?.storeUrl || !woo?.consumerKey || !woo?.consumerSecret) {
        return;
      }

      try {
        this.isSyncing = true;
        await this.triggerManualSync();
      } catch (err) {
        this.logger.warn(`Aviso en sincronización periódica: ${String(err)}`);
      } finally {
        this.isSyncing = false;
      }
    };

    this.autoSyncTimer = setInterval(checkAndSync, intervalMs);
    this.logger.info(`✓ Sincronización autónoma en segundo plano activa (comprobando pedidos cada ${intervalMs / 1000}s)`);
    this.eventBus.addEvent('info', `✓ Modo autónomo activo: revisando pedidos cada ${intervalMs / 1000}s`);
  }

  public stopAutoSyncLoop(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }
}
