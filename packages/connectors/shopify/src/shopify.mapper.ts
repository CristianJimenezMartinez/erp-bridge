import {
  CanonicalAddress,
  CanonicalCustomer,
  CanonicalOrder,
  CanonicalOrderLine,
  CanonicalOrderSchema,
  OrderStatus,
} from '@erp-bridge/shared';
import {
  CanonicalTax,
  ShopifyAddress,
  ShopifyCustomer,
  ShopifyOrderNode,
} from './shopify.types';

export class ShopifyOrderMapper {
  public static mapAddress(addr?: ShopifyAddress | null): CanonicalAddress {
    if (!addr) return { country: 'ES' };
    const streetParts = [addr.address1, addr.address2].filter(Boolean);
    return {
      firstName: addr.firstName || '',
      lastName: addr.lastName || '',
      company: addr.company || '',
      street: streetParts.join(', ') || '',
      city: addr.city || '',
      state: addr.province || '',
      postalCode: addr.zip || '',
      country: addr.countryCodeV2 || 'ES',
      phone: addr.phone || '',
    };
  }

  public static detectEquivalenceSurcharge(order: ShopifyOrderNode): boolean {
    const customer = order.customer;
    if (customer?.tags) {
      const tagsList = Array.isArray(customer.tags)
        ? customer.tags
        : customer.tags.split(',').map((t) => t.trim().toLowerCase());
      if (tagsList.some((t) => ['recargo', 'recargo_equivalencia', 'recargo-equivalencia', 're', 'req'].includes(t))) {
        return true;
      }
    }

    if (customer?.metafields?.edges) {
      const reMeta = customer.metafields.edges.find((e) =>
        ['recargo', 'recargo_equivalencia', 're', 'has_re', 'req'].includes(e.node.key.toLowerCase())
      );
      if (reMeta && ['true', '1', 'yes', 'si'].includes(reMeta.node.value.toLowerCase())) {
        return true;
      }
    }

    if (order.tags) {
      const orderTags = Array.isArray(order.tags)
        ? order.tags
        : order.tags.split(',').map((t) => t.trim().toLowerCase());
      if (orderTags.some((t) => ['recargo', 'recargo_equivalencia', 're'].includes(t))) {
        return true;
      }
    }

    if (order.customAttributes) {
      const reAttr = order.customAttributes.find((attr) =>
        ['recargo', 'recargo_equivalencia', 're'].includes(attr.key.toLowerCase())
      );
      if (reAttr && ['true', '1', 'yes', 'si'].includes(reAttr.value.toLowerCase())) {
        return true;
      }
    }

    if (order.taxLines) {
      const hasTaxRe = order.taxLines.some((t) =>
        t.title.toLowerCase().includes('recargo') || t.title.toLowerCase().includes('equivalencia')
      );
      if (hasTaxRe) return true;
    }

    return false;
  }

  public static detectTaxId(order: ShopifyOrderNode): string | undefined {
    const customer = order.customer;
    if (customer?.metafields?.edges) {
      const nifMeta = customer.metafields.edges.find((e) =>
        ['nif', 'cif', 'dni', 'vat', 'tax_id', '_billing_nif', '_billing_cif'].includes(e.node.key.toLowerCase())
      );
      if (nifMeta && nifMeta.node.value) return nifMeta.node.value.trim();
    }

    if (order.customAttributes) {
      const nifAttr = order.customAttributes.find((attr) =>
        ['nif', 'cif', 'dni', 'vat', 'tax_id', '_billing_nif', '_billing_cif'].includes(attr.key.toLowerCase())
      );
      if (nifAttr && nifAttr.value) return nifAttr.value.trim();
    }

    return undefined;
  }

  public static mapCustomer(order: ShopifyOrderNode, hasRE: boolean): CanonicalCustomer {
    const rawCust: ShopifyCustomer | null | undefined = order.customer;
    const billAddr = order.billingAddress;
    const rawId = rawCust?.id ? rawCust.id.replace(/\D/g, '') : order.id.replace(/\D/g, '');
    const fullName = [rawCust?.firstName, rawCust?.lastName].filter(Boolean).join(' ').trim() ||
      rawCust?.displayName ||
      billAddr?.company ||
      `Cliente Shopify #${rawId}`;

    return {
      id: `shopify_cust_${rawId}`,
      customerNumber: rawId || undefined,
      taxId: this.detectTaxId(order),
      fiscalName: billAddr?.company || fullName,
      commercialName: fullName,
      email: rawCust?.email || undefined,
      phone: rawCust?.phone || billAddr?.phone || undefined,
      address: this.mapAddress(billAddr || order.shippingAddress),
      hasEquivalenceSurcharge: hasRE,
      rawSourceData: { customer: rawCust, billingAddress: billAddr },
    };
  }

  public static getRecargoRate(vatPercent: number): number {
    if (vatPercent >= 18) return 5.2;
    if (vatPercent >= 8) return 1.4;
    if (vatPercent > 0) return 0.5;
    return 0;
  }

  public static toCanonicalOrder(order: ShopifyOrderNode): CanonicalOrder {
    const hasRE = this.detectEquivalenceSurcharge(order);
    const customer = this.mapCustomer(order, hasRE);
    const shippingAddress = this.mapAddress(order.shippingAddress || order.billingAddress);
    const billingAddress = this.mapAddress(order.billingAddress);

    const totalAmount = parseFloat(order.totalPriceSet?.shopMoney.amount || '0');
    const taxAmount = parseFloat(order.totalTaxSet?.shopMoney.amount || '0');
    const shippingAmount = parseFloat(order.totalShippingPriceSet?.shopMoney.amount || '0');
    const discountAmount = parseFloat(order.totalDiscountsSet?.shopMoney.amount || '0');
    const subtotal = parseFloat(order.subtotalPriceSet?.shopMoney.amount || '0');
    const netAmount = subtotal > 0 ? subtotal : Math.max(0, totalAmount - taxAmount);

    let predominantVat = 21;
    const lineEdges = order.lineItems?.edges || [];
    const lines: CanonicalOrderLine[] = lineEdges.map((edge, idx) => {
      const item = edge.node;
      const qty = item.quantity || 1;
      const unitPrice = parseFloat(item.discountedUnitPriceSet?.shopMoney.amount || item.originalUnitPriceSet?.shopMoney.amount || '0');
      const lineTotal = parseFloat(item.discountedTotalSet?.shopMoney.amount || item.originalTotalSet?.shopMoney.amount || `${unitPrice * qty}`);
      const lineSubtotal = parseFloat(item.originalTotalSet?.shopMoney.amount || `${unitPrice * qty}`);
      const lineTax = item.taxLines && item.taxLines.length > 0 ? parseFloat(item.taxLines[0]?.priceSet?.shopMoney.amount || '0') : 0;

      let vatPercent = 21;
      if (item.taxLines && item.taxLines.length > 0) {
        const ratePct = item.taxLines[0]?.ratePercentage;
        const rate = item.taxLines[0]?.rate;
        vatPercent = ratePct !== undefined ? ratePct : (rate !== undefined ? Math.round(rate * 100) : 21);
      } else if (lineTotal > 0 && lineTax > 0) {
        vatPercent = Math.round((lineTax / lineTotal) * 100);
      }
      predominantVat = vatPercent;

      const vatType = vatPercent === 21 ? 0 : (vatPercent === 10 ? 1 : (vatPercent === 4 ? 2 : 3));
      const cleanSku = item.sku && item.sku.trim().length > 0 ? item.sku.trim() : `SHOPIFY-${item.id.replace(/\D/g, '')}`;

      return {
        id: `shopify_line_${item.id.replace(/\D/g, '')}`,
        position: idx + 1,
        sku: cleanSku,
        name: item.title || `Producto ${cleanSku}`,
        quantity: qty,
        unitPrice,
        discountPercent: lineSubtotal > lineTotal && lineSubtotal > 0 ? ((lineSubtotal - lineTotal) / lineSubtotal) * 100 : 0,
        vatPercent,
        vatType,
        subtotal: lineSubtotal,
        total: lineTotal,
        rawSourceData: item as unknown as Record<string, unknown>,
      };
    });

    const equivalenceSurchargeRate = hasRE ? this.getRecargoRate(predominantVat) : undefined;
    const taxes: CanonicalTax[] = (order.taxLines || []).map((tl) => ({
      name: tl.title,
      rate: tl.ratePercentage ?? ((tl.rate ?? 0) * 100),
      amount: tl.priceSet?.shopMoney ? parseFloat(tl.priceSet.shopMoney.amount) : 0,
      isEquivalenceSurcharge: tl.title.toLowerCase().includes('recargo') || tl.title.toLowerCase().includes('equivalencia'),
    }));

    if (hasRE && !taxes.some((t) => t.isEquivalenceSurcharge)) {
      const reRate = equivalenceSurchargeRate ?? 5.2;
      const reAmount = Number((netAmount * (reRate / 100)).toFixed(2));
      taxes.push({
        name: 'Recargo de Equivalencia',
        rate: reRate,
        amount: reAmount,
        isEquivalenceSurcharge: true,
      });
    }

    const isFulfilled = (order.displayFulfillmentStatus || '').toUpperCase() === 'FULFILLED';
    const status: OrderStatus = isFulfilled ? 'completed' : 'processing';
    const cleanOrderId = order.id.replace(/\D/g, '');
    const cleanOrderNumber = order.name.replace('#', '') || cleanOrderId;
    const orderDate = new Date(order.createdAt);

    const canonicalOrder: CanonicalOrder & { taxes?: CanonicalTax[] } = {
      id: `shopify_order_${cleanOrderId}`,
      orderNumber: cleanOrderNumber,
      series: '',
      reference: order.name,
      date: isNaN(orderDate.getTime()) ? new Date() : orderDate,
      status,
      customer,
      shippingAddress,
      billingAddress,
      paymentMethod: 'shopify_payments',
      currency: order.totalPriceSet?.shopMoney.currencyCode || 'EUR',
      lines: lines.length > 0 ? lines : [{
        id: `shopify_line_${cleanOrderId}_default`,
        position: 1,
        sku: 'GENERIC',
        name: 'Generic Line',
        quantity: 1,
        unitPrice: totalAmount,
        discountPercent: 0,
        vatPercent: predominantVat,
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
      notes: order.note || undefined,
      hasEquivalenceSurcharge: hasRE,
      equivalenceSurchargeRate,
      rawSourceData: {
        shopifyOrder: order,
        taxes,
      },
      taxes,
      createdAt: orderDate,
      updatedAt: order.updatedAt ? new Date(order.updatedAt) : orderDate,
    };

    const parsed = CanonicalOrderSchema.parse(canonicalOrder) as CanonicalOrder & { taxes?: CanonicalTax[] };
    parsed.taxes = taxes;
    return parsed;
  }
}
