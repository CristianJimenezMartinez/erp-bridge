import {
  CanonicalAddress,
  CanonicalCustomer,
  CanonicalOrder,
  CanonicalOrderLine,
  OrderStatus,
} from '@erp-bridge/shared';

export interface WooCommerceAddressRaw {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface WooCommerceOrderLineRaw {
  id: number;
  name: string;
  product_id: number;
  variation_id?: number;
  quantity: number;
  tax_class?: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  sku?: string;
  price?: number;
}

export interface WooCommerceOrderRaw {
  id: number;
  number: string;
  order_key?: string;
  status: string;
  currency: string;
  date_created: string;
  date_modified?: string;
  discount_total?: string;
  discount_tax?: string;
  shipping_total?: string;
  shipping_tax?: string;
  cart_tax?: string;
  total: string;
  total_tax?: string;
  customer_id: number;
  customer_note?: string;
  billing?: WooCommerceAddressRaw;
  shipping?: WooCommerceAddressRaw;
  payment_method?: string;
  payment_method_title?: string;
  line_items: WooCommerceOrderLineRaw[];
  meta_data?: Array<{ id: number; key: string; value: string }>;
}

export class WooCommerceOrderMapper {
  public static mapStatus(wcStatus: string): OrderStatus {
    switch (wcStatus.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'on-hold':
        return 'on-hold';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      case 'refunded':
        return 'refunded';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  public static mapCanonicalToWcStatus(status: OrderStatus | string): string {
    return status.toLowerCase();
  }

  public static toCanonicalAddress(raw?: WooCommerceAddressRaw): CanonicalAddress {
    if (!raw) return { country: 'ES' };
    return {
      firstName: raw.first_name || '',
      lastName: raw.last_name || '',
      company: raw.company || '',
      street: [raw.address_1, raw.address_2].filter(Boolean).join(', ') || '',
      city: raw.city || '',
      state: raw.state || '',
      postalCode: raw.postcode || '',
      country: raw.country || 'ES',
      phone: raw.phone || '',
      email: raw.email || '',
    };
  }

  public static toCanonicalCustomer(order: WooCommerceOrderRaw): CanonicalCustomer {
    const billing = order.billing || {};
    const fullName = [billing.first_name, billing.last_name].filter(Boolean).join(' ').trim() ||
      billing.company ||
      `Cliente WC #${order.customer_id || order.id}`;

    // Look for NIF/CIF in meta_data (standard fields: _billing_nif, _billing_cif, _billing_vat, NIF, DNI, CIF)
    let taxId: string | undefined;
    if (order.meta_data && Array.isArray(order.meta_data)) {
      const nifMeta = order.meta_data.find((m) =>
        ['nif', 'cif', 'dni', 'vat', '_billing_nif', '_billing_cif', '_billing_dni', '_billing_vat'].includes(
          m.key.toLowerCase()
        )
      );
      if (nifMeta && nifMeta.value) {
        taxId = String(nifMeta.value).trim();
      }
    }

    return {
      id: `wc_cust_${order.customer_id || order.id}`,
      customerNumber: order.customer_id > 0 ? String(order.customer_id) : undefined,
      taxId,
      fiscalName: billing.company || fullName,
      commercialName: fullName,
      email: billing.email || undefined,
      phone: billing.phone || undefined,
      address: this.toCanonicalAddress(billing),
      rawSourceData: { billing: order.billing, customer_id: order.customer_id },
    };
  }

  public static toCanonicalOrderLine(raw: WooCommerceOrderLineRaw, index: number): CanonicalOrderLine {
    const qty = Number(raw.quantity) || 1;
    const total = Number(raw.total) || 0;
    const subtotal = Number(raw.subtotal) || total;
    const unitPrice = raw.price !== undefined ? Number(raw.price) : qty > 0 ? total / qty : 0;
    const sku = (raw.sku && raw.sku.trim()) ? raw.sku.trim() : `WC-${raw.product_id}`;

    return {
      id: `wc_line_${raw.id}`,
      position: index + 1,
      sku,
      name: raw.name || `Producto ${sku}`,
      quantity: qty,
      unitPrice,
      discountPercent: subtotal > total && subtotal > 0 ? ((subtotal - total) / subtotal) * 100 : 0,
      vatPercent: 21,
      vatType: 0,
      subtotal,
      total,
      rawSourceData: raw as unknown as Record<string, unknown>,
    };
  }

  public static toCanonicalOrder(raw: WooCommerceOrderRaw): CanonicalOrder {
    const customer = this.toCanonicalCustomer(raw);
    const shippingAddress = this.toCanonicalAddress(raw.shipping || raw.billing);
    const billingAddress = this.toCanonicalAddress(raw.billing);

    const lines: CanonicalOrderLine[] = (raw.line_items || []).map((ln, idx) =>
      this.toCanonicalOrderLine(ln, idx)
    );

    const totalAmount = Number(raw.total) || 0;
    const taxAmount = Number(raw.total_tax) || 0;
    const shippingAmount = Number(raw.shipping_total) || 0;
    const discountAmount = Number(raw.discount_total) || 0;
    const netAmount = Math.max(0, totalAmount - taxAmount);

    const dateVal = raw.date_created ? new Date(raw.date_created) : new Date();

    return {
      id: `wc_order_${raw.id}`,
      orderNumber: String(raw.number || raw.id),
      series: '',
      reference: String(raw.number || raw.id),
      date: isNaN(dateVal.getTime()) ? new Date() : dateVal,
      status: this.mapStatus(raw.status),
      customer,
      shippingAddress,
      billingAddress,
      paymentMethod: raw.payment_method,
      paymentMethodTitle: raw.payment_method_title,
      currency: raw.currency || 'EUR',
      lines,
      netAmount,
      taxAmount,
      shippingAmount,
      discountAmount,
      totalAmount,
      warehouse: 'GEN',
      notes: raw.customer_note,
      rawSourceData: raw as unknown as Record<string, unknown>,
      createdAt: dateVal,
      updatedAt: raw.date_modified ? new Date(raw.date_modified) : dateVal,
    };
  }
}
