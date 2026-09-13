import {
  OrderMutationResult,
  ReadOrdersOptions,
} from '@erp-bridge/sdk';
import {
  CanonicalOrder,
  Logger,
  OrderStatus,
} from '@erp-bridge/shared';
import { WooCommerceClient } from '../client';
import {
  WooCommerceOrderMapper,
  WooCommerceOrderRaw,
} from '../mappers';

export class WooCommerceOrderHandler {
  constructor(
    private readonly client: WooCommerceClient,
    private readonly logger: Logger
  ) {}

  public async readOrders(options?: ReadOrdersOptions): Promise<CanonicalOrder[]> {
    const params: Record<string, unknown> = {
      per_page: options?.limit || 50,
      page: options?.offset ? Math.floor(options.offset / (options.limit || 50)) + 1 : 1,
      status: options?.status || 'processing,pending,on-hold',
      order: 'asc',
      orderby: 'date',
    };

    if (options?.createdSince) {
      params['after'] = options.createdSince.toISOString();
    }

    this.logger.info('Consultando pedidos de WooCommerce (REST API Polling)...', params);

    const rawOrders = await this.client.get<WooCommerceOrderRaw[]>('orders', params);
    return rawOrders.map((raw) => WooCommerceOrderMapper.toCanonicalOrder(raw));
  }

  public async updateOrderStatus(
    orderId: string,
    status: OrderStatus | string,
    details?: Record<string, unknown>
  ): Promise<OrderMutationResult> {
    const numericId = parseInt(orderId, 10);
    const wcStatus = WooCommerceOrderMapper.mapCanonicalToWcStatus(status);

    try {
      const payload: Record<string, unknown> = { status: wcStatus, ...details };
      const response = await this.client.put<WooCommerceOrderRaw>(`orders/${numericId}`, payload);

      this.logger.info(`Estado de pedido actualizado en WooCommerce: Order #${numericId} -> ${wcStatus}`);

      return {
        success: true,
        orderId,
        externalId: String(response.id),
        status,
        rawResponse: response,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al actualizar estado de pedido ${orderId} en WooCommerce`, error);
      return {
        success: false,
        orderId,
        externalId: orderId,
        error: msg,
      };
    }
  }

  public async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
    try {
      const payload = {
        payment_method: order.paymentMethod,
        payment_method_title: order.paymentMethodTitle,
        set_paid: false,
        billing: {
          first_name: order.billingAddress?.firstName || order.customer.fiscalName,
          last_name: order.billingAddress?.lastName || '',
          address_1: order.billingAddress?.street || '',
          city: order.billingAddress?.city || '',
          state: order.billingAddress?.state || '',
          postcode: order.billingAddress?.postalCode || '',
          country: order.billingAddress?.country || 'ES',
          email: order.billingAddress?.email || order.customer.email || '',
          phone: order.billingAddress?.phone || order.customer.phone || '',
        },
        line_items: order.lines.map((ln: any) => ({
          name: ln.name,
          sku: ln.sku,
          quantity: ln.quantity,
          price: ln.unitPrice,
          total: String(ln.total),
        })),
      };

      const response = await this.client.post<WooCommerceOrderRaw>('orders', payload);

      return {
        success: true,
        orderId: order.id,
        externalId: String(response.id),
        orderNumber: String(response.number || response.id),
        status: WooCommerceOrderMapper.mapStatus(response.status),
        rawResponse: response,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        orderId: order.id,
        externalId: '',
        error: msg,
      };
    }
  }
}
