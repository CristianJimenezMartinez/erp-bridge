import {
  OrderMutationResult,
  ReadOrdersOptions,
} from '@erp-bridge/sdk';
import { CanonicalOrder, Logger, OrderStatus } from '@erp-bridge/shared';
import { PrestaShopClient } from '../client';
import { PrestaShopOrder, PrestaShopOrderCarrier } from '../types';
import { PrestaShopOrderMapper } from '../mappers';

export class PrestaShopOrderHandler {
  constructor(
    private readonly client: PrestaShopClient,
    private readonly logger: Logger
  ) {}

  public async readOrders(options?: ReadOrdersOptions): Promise<CanonicalOrder[]> {
    const params: Record<string, unknown> = {
      display: 'full',
      'filter[current_state]': '[2,3]', // Pago Aceptado, Preparacion en curso
      sort: '[id_DESC]',
    };

    if (options?.limit) {
      params['limit'] = `${options.offset || 0},${options.limit}`;
    }

    if (options?.status) {
      const psState = PrestaShopOrderMapper.mapCanonicalStatusToPs(options.status);
      params['filter[current_state]'] = `[${psState}]`;
    }

    this.logger.info('Polling de pedidos en PrestaShop WebService...', params);
    const res = await this.client.get<{ orders?: PrestaShopOrder[] }>('orders', params);
    const orderList = res.orders || [];

    return orderList.map((ord) => PrestaShopOrderMapper.toCanonicalOrder(ord));
  }

  public async updateOrderStatus(
    orderId: string,
    status: OrderStatus | string,
    details?: Record<string, unknown>
  ): Promise<OrderMutationResult> {
    try {
      const psStateId = PrestaShopOrderMapper.mapCanonicalStatusToPs(status);
      const historyPayload = {
        id_order_state: psStateId,
        id_order: parseInt(orderId, 10),
      };

      await this.client.post('order_histories', historyPayload);
      this.logger.info(`Estado de pedido actualizado en PrestaShop: Pedido #${orderId} -> State ${psStateId} (${status})`);

      // Insercion de tracking number carrier si esta presente
      const trackingNumber = (details?.trackingNumber || details?.carrierTracking) as string | undefined;
      if (trackingNumber) {
        await this.injectCarrierTracking(orderId, trackingNumber);
      }

      return {
        success: true,
        orderId,
        externalId: orderId,
        status,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al actualizar estado del pedido ${orderId} en PrestaShop`, error);
      return { success: false, orderId, externalId: orderId, error: msg };
    }
  }

  public async injectCarrierTracking(orderId: string, trackingNumber: string): Promise<void> {
    try {
      const carrierRes = await this.client.get<{ order_carriers?: PrestaShopOrderCarrier[] }>('order_carriers', {
        'filter[id_order]': `[${orderId}]`,
        display: 'full',
      });

      const carrier = carrierRes.order_carriers?.[0];
      if (carrier && carrier.id) {
        await this.client.put(`order_carriers/${carrier.id}`, {
          id: carrier.id,
          id_order: orderId,
          tracking_number: trackingNumber,
        });
        this.logger.info(`Tracking inyectado en ps_order_carrier ID ${carrier.id} para Pedido #${orderId}: ${trackingNumber}`);
      } else {
        // Actualizacion directa en recurso order si no hay order_carrier disponible
        await this.client.put(`orders/${orderId}`, {
          id: parseInt(orderId, 10),
          shipping_number: trackingNumber,
        });
      }
    } catch (err) {
      this.logger.warn(`No se pudo inyectar el tracking number en PrestaShop para pedido ${orderId}`, { error: String(err) });
    }
  }

  public async createOrder(order: CanonicalOrder): Promise<OrderMutationResult> {
    try {
      const payload = {
        id_customer: parseInt(order.customer.id, 10) || 1,
        id_address_delivery: 1,
        id_address_invoice: 1,
        id_currency: 1,
        id_lang: 1,
        id_carrier: 1,
        current_state: 2,
        payment: order.paymentMethodTitle || 'ERP Bridge',
        module: order.paymentMethod || 'erpbridge',
        total_paid: order.totalAmount,
        total_products: order.netAmount,
        total_shipping: order.shippingAmount,
        conversion_rate: 1,
      };

      const res = await this.client.post<{ order?: { id: number } }>('orders', payload);
      const newId = String(res.order?.id || '');
      return {
        success: true,
        orderId: order.id,
        externalId: newId,
        orderNumber: newId,
        status: 'processing',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, orderId: order.id, externalId: '', error: msg };
    }
  }
}
