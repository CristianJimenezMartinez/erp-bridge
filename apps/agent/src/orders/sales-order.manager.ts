import { Logger } from '@erp-bridge/shared';
import { ConfigManager } from '../config';
import { FactusolService } from '../factusol';
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
    private readonly eventBus: EventBus
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

    const config = this.configManager.get();
    const series = order.factusolSeries || config.factusol?.orderSeries || '1';
    const warehouse = config.factusol?.warehouseCode || 'GEN';

    const canonicalOrder = {
      id: order.webOrderId,
      orderNumber: order.orderNumber,
      reference: order.orderNumber,
      orderDate: order.date || new Date().toISOString(),
      status: 'processing',
      customer: {
        id: order.webOrderId,
        name: order.customerName,
        email: order.customerEmail || 'cliente@tienda.com',
        phone: order.customerPhone || '',
      },
      shippingAddress: {
        firstName: order.customerName.split(' ')[0] || 'Cliente',
        lastName: order.customerName.split(' ').slice(1).join(' ') || '',
        street: order.shippingAddress || '',
        city: '',
        postalCode: '',
        country: 'ES',
        phone: order.customerPhone || '',
        email: order.customerEmail || '',
      },
      billingAddress: {
        firstName: order.customerName.split(' ')[0] || 'Cliente',
        lastName: order.customerName.split(' ').slice(1).join(' ') || '',
        street: order.shippingAddress || '',
        city: '',
        postalCode: '',
        country: 'ES',
        phone: order.customerPhone || '',
        email: order.customerEmail || '',
      },
      lines: (order.lines || []).map((l, idx) => ({
        id: `line-${idx + 1}`,
        sku: l.sku,
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.total,
        taxRate: 21,
        taxAmount: Math.round(l.total * 0.21 * 100) / 100,
      })),
      totals: {
        subtotal: Math.round((order.totalAmount / 1.21) * 100) / 100,
        tax: Math.round((order.totalAmount - order.totalAmount / 1.21) * 100) / 100,
        total: order.totalAmount,
        discount: 0,
        shipping: 0,
      },
      paymentMethod: order.paymentMethod || 'Web',
      currency: order.currency || 'EUR',
      series,
      warehouse,
    };

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

    const plausibility = OrderPlausibilityAdapter.validateAndSanitize(canonicalOrder);
    if (!plausibility.valid || !plausibility.sanitizedOrder) {
      const err = `Pedido descartado por validación de seguridad: ${plausibility.error}`;
      this.salesLedgerManager.markOrderRetried(id, 'failed', err);
      return { success: false, message: err };
    }
    const safeOrder = plausibility.sanitizedOrder;

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
