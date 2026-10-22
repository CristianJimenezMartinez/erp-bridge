import { Logger } from '@erp-bridge/shared';
import { ConfigManager } from '../config';
import { FactusolService } from '../factusol';
import { ErpProviderRegistry } from '../erp';
import { EventBus } from '../diagnostics/event-bus';
import { AgentDiskLogger } from '../diagnostics/disk-logger';
import { OrderPlausibilityAdapter } from '../adapters/order-plausibility.adapter';
import {
  SalesLedgerManager,
} from './sales-ledger.manager';
import {
  SalesOrderRecord,
  GetSalesOrdersOptions,
  PaginatedSalesOrdersResult,
} from './sales-ledger.types';

export class SalesOrderManager {
  private readonly logger = new Logger('SalesOrderManager');

  constructor(
    private readonly salesLedgerManager: SalesLedgerManager,
    private readonly configManager: ConfigManager,
    private readonly factusolService: FactusolService,
    private readonly eventBus: EventBus,
    private readonly erpRegistry?: ErpProviderRegistry,
    private readonly licenseCheckFn?: () => { status: string; plan?: string }
  ) {}

  public getSalesOrders(options?: GetSalesOrdersOptions): PaginatedSalesOrdersResult {
    return this.salesLedgerManager.getOrders(options);
  }

  public getSalesOrderById(id: string): SalesOrderRecord | null {
    return this.salesLedgerManager.getOrderById(id);
  }

  public async retrySalesOrder(id: string): Promise<{ success: boolean; message: string; order?: SalesOrderRecord }> {
    this.logger.info(`Iniciando reintento de pedido ${id}...`);
    const order = this.salesLedgerManager.getOrderById(id);
    if (!order) {
      return { success: false, message: 'Pedido no encontrado en el registro local.' };
    }
    if (order.status === 'synced') {
      return {
        success: false,
        message: `El pedido #${order.orderNumber} ya se encuentra sincronizado en Factusol (Nº ${order.factusolOrderNumber || '-'}).`,
      };
    }

    if (this.licenseCheckFn) {
      const lic = this.licenseCheckFn();
      if (lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
        const err = `Reintento de pedido bloqueado: Requiere una licencia activa (${lic.status}). Active su clave en el Centro de Control.`;
        this.logger.warn(err);
        this.eventBus.addEvent('warn', err);
        return { success: false, message: err };
      }
    }

    const config = this.configManager.get();
    const activeProvider = config.softwareErp?.activeProvider || config.erpType || 'factusol';
    const providerCfg = (config.softwareErp?.providers as any)?.[activeProvider];
    const series = order.factusolSeries || providerCfg?.orderSeries || config.factusol?.orderSeries || '1';
    const warehouse = providerCfg?.warehouseCode || config.factusol?.warehouseCode || 'GEN';

    const totalAmount = Number.isFinite(order.totalAmount) ? order.totalAmount : 0;
    const netAmount = Math.round((totalAmount / 1.21) * 100) / 100;
    const taxAmount = Math.round((totalAmount - netAmount) * 100) / 100;

    const canonicalOrder = {
      id: order.webOrderId,
      orderNumber: order.orderNumber,
      reference: order.orderNumber,
      date: order.date ? new Date(order.date) : new Date(),
      status: 'processing',
      customer: {
        id: order.webOrderId,
        customerNumber: order.webOrderId,
        fiscalName: order.customerName || 'Cliente Web',
        name: order.customerName || 'Cliente Web',
        email: order.customerEmail || 'cliente@tienda.com',
        phone: order.customerPhone || '',
        hasEquivalenceSurcharge: false,
      },
      shippingAddress: {
        street: order.shippingAddress || '',
        city: '',
        postalCode: '',
        state: '',
        country: 'ES',
        phone: order.customerPhone || '',
      },
      billingAddress: {
        street: order.shippingAddress || '',
        city: '',
        postalCode: '',
        state: '',
        country: 'ES',
        phone: order.customerPhone || '',
      },
      lines: (order.lines || []).map((l, idx) => ({
        id: `line-${idx + 1}`,
        position: idx + 1,
        sku: l.sku,
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.total,
        discountPercent: 0,
        vatPercent: 21,
        vatType: 0,
        subtotal: Math.round((l.total / 1.21) * 100) / 100,
      })),
      netAmount,
      taxAmount,
      totalAmount,
      shippingAmount: 0,
      discountAmount: 0,
      totals: {
        subtotal: netAmount,
        tax: taxAmount,
        total: totalAmount,
        discount: 0,
        shipping: 0,
      },
      paymentMethod: order.paymentMethod || 'Web',
      paymentMethodTitle: order.paymentMethod || 'Web',
      currency: order.currency || 'EUR',
      series,
      warehouse,
    };

    const plausibility = OrderPlausibilityAdapter.validateAndSanitize(canonicalOrder);
    if (!plausibility.valid || !plausibility.sanitizedOrder) {
      const err = `Pedido descartado por validación de seguridad: ${plausibility.error}`;
      this.salesLedgerManager.markOrderRetried(id, 'failed', err);
      return { success: false, message: err };
    }
    const safeOrder = plausibility.sanitizedOrder;

    const activeConnector = this.erpRegistry?.getActiveConnector();
    const isEval = Boolean((config as any).evaluationMode?.enabled || config.softwareErp?.providers?.[activeConnector?.providerId || 'factusol']?.evaluationMode);

    if (activeConnector && (activeConnector.providerId !== 'factusol' || isEval)) {
      try {
        const res = await activeConnector.createOrder(safeOrder as any, series, warehouse);
        if (res.success) {
          const assignedNum = String(res.orderNumber || res.externalId || (res as any).orderId || order.webOrderId);
          const updated = this.salesLedgerManager.markOrderRetried(id, 'synced', undefined, assignedNum);
          this.eventBus.addEvent('success', `✓ Pedido #${order.orderNumber} reintentado y registrado en ${activeConnector.displayName} (Nº ${assignedNum})`);
          return {
            success: true,
            message: `Pedido #${order.orderNumber} registrado correctamente en ${activeConnector.displayName} (Nº ${assignedNum}).`,
            order: updated || undefined,
          };
        }
        const err = res.error || (res as any).errorMessage || `Fallo al insertar pedido en ${activeConnector.displayName}.`;
        this.salesLedgerManager.markOrderRetried(id, 'failed', err);
        return { success: false, message: err };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.salesLedgerManager.markOrderRetried(id, 'failed', msg);
        return { success: false, message: `Error al reintentar pedido: ${msg}` };
      }
    }

    let connector = this.factusolService.getConnector();
    if (!connector) {
      const connected = await this.factusolService.connect();
      if (!connected) {
        const err = 'No se pudo conectar con la base de datos de Factusol.';
        this.salesLedgerManager.markOrderRetried(id, 'failed', err);
        return { success: false, message: err };
      }
      connector = this.factusolService.getConnector();
    }
    if (!connector) {
      const err = 'Driver OLEDB de Factusol no inicializado.';
      this.salesLedgerManager.markOrderRetried(id, 'failed', err);
      return { success: false, message: err };
    }

    try {
      const res = await connector.createOrder(safeOrder as any);
      if (res.success) {
        const assignedNum = String(res.externalId || res.orderNumber || order.webOrderId);
        const updated = this.salesLedgerManager.markOrderRetried(id, 'synced', undefined, assignedNum, series);
        this.eventBus.addEvent('success', `✓ Reintento exitoso: Pedido #${order.orderNumber} registrado en Factusol (Nº ${assignedNum}).`);
        AgentDiskLogger.getInstance().log({
          level: 'SUCCESS',
          component: 'SalesLedger',
          action: 'retry_sales_order',
          status: 'SUCCESS',
          message: `Reintento exitoso: Pedido #${order.orderNumber} -> Factusol Nº ${assignedNum}`,
          metadata: { orderId: id, factusolOrderNumber: assignedNum, series },
        });
        return {
          success: true,
          message: `Pedido #${order.orderNumber} insertado correctamente en Factusol (Serie ${series}, Pedido #${assignedNum}).`,
          order: updated || undefined,
        };
      } else {
        const errMsg = res.error || 'Error desconocido al registrar pedido en Factusol';
        this.salesLedgerManager.markOrderRetried(id, 'failed', errMsg);
        this.eventBus.addEvent('warn', `Aviso en reintento de pedido #${order.orderNumber}: ${errMsg}`);
        return { success: false, message: `No se pudo registrar en Factusol: ${errMsg}` };
      }
    } catch (retryErr) {
      const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      this.salesLedgerManager.markOrderRetried(id, 'failed', msg);
      return { success: false, message: `Error durante el reintento: ${msg}` };
    }
  }
}
