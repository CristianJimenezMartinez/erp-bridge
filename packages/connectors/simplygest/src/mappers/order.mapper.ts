import {
  CanonicalOrder,
  CanonicalOrderLine,
  OrderStatus,
} from '@erp-bridge/shared';

export interface SimplyGestOrderRaw {
  NUMERO: string | number;
  FECHA: string | Date;
  CLIENTE: string | number;
  REFPEDIDO?: string;
  BASE_IMP?: number | string;
  IVA?: number | string;
  TOTAL?: number | string;
  ESTADO?: number | string;
}

export interface SimplyGestOrderLineRaw {
  NUMERO_PEDIDO: string | number;
  LINEA: number;
  CODIGO_ART: string;
  DESCR?: string;
  CANTIDAD: number | string;
  PRECIO: number | string;
  TOTAL?: number | string;
}

export function mapStatusCodeToOrderStatus(code?: number | string): OrderStatus {
  const c = Number(code);
  switch (c) {
    case 0:
      return 'pending';
    case 1:
      return 'processing';
    case 2:
      return 'completed';
    case 3:
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function mapSimplyGestOrderToCanonical(
  raw: SimplyGestOrderRaw,
  lines: SimplyGestOrderLineRaw[] = []
): CanonicalOrder {
  const orderNumber = String(raw.NUMERO);
  const dateVal = raw.FECHA instanceof Date ? raw.FECHA : new Date(raw.FECHA);
  const netAmount = Number(raw.BASE_IMP) || 0;
  const taxAmount = Number(raw.IVA) || 0;
  const totalAmount = Number(raw.TOTAL) || (netAmount + taxAmount);
  const ref = raw.REFPEDIDO ? String(raw.REFPEDIDO).trim() : `SG-${orderNumber}`;

  const canonicalLines: CanonicalOrderLine[] = lines.map((ln) => {
    const qty = Number(ln.CANTIDAD) || 1;
    const unitPrice = Number(ln.PRECIO) || 0;
    const total = Number(ln.TOTAL) || (qty * unitPrice);
    return {
      id: `sg_line_${orderNumber}_${ln.LINEA}`,
      position: ln.LINEA,
      sku: String(ln.CODIGO_ART ?? '').trim(),
      name: String(ln.DESCR ?? '').trim() || String(ln.CODIGO_ART ?? '').trim(),
      quantity: qty,
      unitPrice,
      discountPercent: 0,
      subtotal: total,
      total,
      vatPercent: 21,
      vatType: 0,
      rawSourceData: ln as unknown as Record<string, unknown>,
    };
  });

  return {
    id: `sg_order_${orderNumber}`,
    orderNumber,
    reference: ref,
    date: isNaN(dateVal.getTime()) ? new Date() : dateVal,
    status: mapStatusCodeToOrderStatus(raw.ESTADO),
    currency: 'EUR',
    customer: {
      id: `sg_cli_${raw.CLIENTE}`,
      customerNumber: String(raw.CLIENTE),
      fiscalName: `Cliente #${raw.CLIENTE}`,
      hasEquivalenceSurcharge: false,
    },
    lines: canonicalLines.length > 0 ? canonicalLines : [
      {
        id: `sg_line_default_${orderNumber}`,
        position: 1,
        sku: 'GENERIC',
        name: 'Línea de pedido',
        quantity: 1,
        unitPrice: netAmount,
        discountPercent: 0,
        subtotal: netAmount,
        total: totalAmount,
        vatPercent: 21,
        vatType: 0,
      },
    ],
    netAmount,
    taxAmount,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount,
    rawSourceData: raw as unknown as Record<string, unknown>,
    createdAt: dateVal,
    updatedAt: dateVal,
  };
}
