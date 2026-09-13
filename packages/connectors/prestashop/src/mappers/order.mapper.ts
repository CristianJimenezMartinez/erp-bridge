import {
  CanonicalAddress,
  CanonicalCustomer,
  CanonicalOrder,
  CanonicalOrderLine,
  OrderStatus,
} from '@erp-bridge/shared';
import { PrestaShopOrder } from '../types';

export class PrestaShopOrderMapper {
  public static mapStatus(stateId: number | string): OrderStatus {
    const num = Number(stateId);
    switch (num) {
      case 2: // Pago aceptado
      case 3: // Preparación en curso
        return 'processing';
      case 4: // Enviado
      case 5: // Entregado
        return 'completed';
      case 6: // Cancelado
        return 'cancelled';
      case 7: // Reembolsado
        return 'refunded';
      case 8: // Error en pago
        return 'failed';
      default:
        return 'pending';
    }
  }

  public static mapCanonicalStatusToPs(status: OrderStatus | string): number {
    switch (status) {
      case 'completed':
        return 4; // Enviado
      case 'processing':
        return 3; // Preparación en curso
      case 'cancelled':
        return 6; // Cancelado
      case 'refunded':
        return 7; // Reembolsado
      case 'failed':
        return 8; // Error
      default:
        return 2; // Pago aceptado
    }
  }

  public static toCanonicalOrder(
    raw: PrestaShopOrder,
    customer?: CanonicalCustomer,
    shippingAddress?: CanonicalAddress,
    billingAddress?: CanonicalAddress,
    trackingNumber?: string
  ): CanonicalOrder {
    const id = String(raw.id);
    const orderNumber = String(raw.reference || raw.id);
    const date = raw.date_add ? new Date(raw.date_add) : new Date();
    const status = PrestaShopOrderMapper.mapStatus(raw.current_state);

    const lines: CanonicalOrderLine[] = (raw.associations?.order_rows || []).map((row, index) => {
      const unitPrice = parseFloat(String(row.unit_price_tax_excl || row.product_price || 0));
      const total = parseFloat(String(row.total_price_tax_incl || row.unit_price_tax_incl || 0));
      const subtotal = parseFloat(String(row.total_price_tax_excl || row.unit_price_tax_excl || 0));
      const qty = parseFloat(String(row.product_quantity || 1));
      const vatPercent = subtotal > 0 ? Math.round(((total - subtotal) / subtotal) * 100) : 21;

      return {
        id: String(row.id || index + 1),
        position: index + 1,
        sku: row.product_reference && row.product_reference.trim() ? row.product_reference.trim() : `ART-${row.product_id}`,
        name: row.product_name || `Artículo ${row.product_id}`,
        quantity: qty,
        unitPrice,
        discountPercent: 0,
        vatPercent,
        vatType: vatPercent === 10 ? 1 : vatPercent === 4 ? 2 : vatPercent === 0 ? 3 : 0,
        subtotal,
        total,
        rawSourceData: row as unknown as Record<string, unknown>,
      };
    });

    const netAmount = parseFloat(String(raw.total_paid_tax_excl || 0));
    const totalAmount = parseFloat(String(raw.total_paid_tax_incl || raw.total_paid || 0));
    const taxAmount = Math.max(0, totalAmount - netAmount);
    const shippingAmount = parseFloat(String(raw.total_shipping_tax_incl || raw.total_shipping || 0));
    const discountAmount = parseFloat(String(raw.total_discounts || 0));

    const defaultCustomer: CanonicalCustomer = customer || {
      id: String(raw.id_customer),
      customerNumber: String(raw.id_customer),
      fiscalName: `Cliente PS #${raw.id_customer}`,
      hasEquivalenceSurcharge: false,
    };

    return {
      id,
      orderNumber,
      series: 'PS',
      reference: `PS-${raw.id}`,
      date,
      status,
      customer: defaultCustomer,
      shippingAddress,
      billingAddress,
      paymentMethod: raw.module || raw.payment || 'prestashop',
      paymentMethodTitle: raw.payment || 'Pago PrestaShop',
      currency: 'EUR',
      lines: lines.length > 0 ? lines : [{
        id: '1',
        position: 1,
        sku: 'GENERIC',
        name: 'Línea de pedido',
        quantity: 1,
        unitPrice: netAmount,
        discountPercent: 0,
        vatPercent: 21,
        vatType: 0,
        subtotal: netAmount,
        total: totalAmount,
      }],
      netAmount,
      taxAmount,
      shippingAmount,
      discountAmount,
      totalAmount,
      warehouse: 'GEN',
      hasEquivalenceSurcharge: defaultCustomer.hasEquivalenceSurcharge ?? false,
      trackingNumber,
      rawSourceData: raw as unknown as Record<string, unknown>,
    };
  }
}
