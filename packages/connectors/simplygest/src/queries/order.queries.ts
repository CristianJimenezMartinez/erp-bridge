import { CanonicalOrder, CanonicalOrderLine } from '@erp-bridge/shared';
import { sanitizeSql } from './article.queries';

export function formatAccessDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  const secs = pad(date.getSeconds());
  return `#${year}-${month}-${day} ${hours}:${mins}:${secs}#`;
}

export function findOrderByReferenceQuery(ref: string): string {
  return `SELECT * FROM PEDIDOS_VENTA WHERE REFPEDIDO = '${sanitizeSql(ref)}'`;
}

export function getNextOrderIdQuery(): string {
  return `SELECT MAX(NUMERO) AS maxid FROM PEDIDOS_VENTA`;
}

export function insertOrderHeaderQuery(
  order: CanonicalOrder,
  orderNumber: string,
  customerCode: string
): string {
  const ref = sanitizeSql(order.reference || `WC-${order.orderNumber || order.id}`).substring(0, 50);
  const dateFormatted = formatAccessDate(order.date || new Date());
  const netAmount = Number(order.netAmount || 0).toFixed(2);
  const taxAmount = Number(order.taxAmount || 0).toFixed(2);
  const totalAmount = Number(order.totalAmount || 0).toFixed(2);

  return `
    INSERT INTO PEDIDOS_VENTA (
      NUMERO, FECHA, CLIENTE, REFPEDIDO, BASE_IMP, IVA, TOTAL, ESTADO
    ) VALUES (
      '${sanitizeSql(orderNumber)}',
      ${dateFormatted},
      '${sanitizeSql(customerCode)}',
      '${ref}',
      ${netAmount},
      ${taxAmount},
      ${totalAmount},
      0
    )
  `.trim();
}

export function insertOrderLineQuery(
  line: CanonicalOrderLine,
  orderNumber: string,
  position: number
): string {
  const sku = sanitizeSql(line.sku).substring(0, 30);
  const name = sanitizeSql(line.name).substring(0, 100);
  const qty = Number(line.quantity || 1).toFixed(4);
  const price = Number(line.unitPrice || 0).toFixed(4);
  const total = Number(line.total || (Number(qty) * Number(price))).toFixed(2);

  return `
    INSERT INTO LINEAS_PEDIDOS (
      NUMERO_PEDIDO, LINEA, CODIGO_ART, DESCR, CANTIDAD, PRECIO, TOTAL
    ) VALUES (
      '${sanitizeSql(orderNumber)}',
      ${position},
      '${sku}',
      '${name}',
      ${qty},
      ${price},
      ${total}
    )
  `.trim();
}

export function readOrdersQuery(limit = 50): string {
  return `
    SELECT TOP ${limit}
      NUMERO, FECHA, CLIENTE, REFPEDIDO, BASE_IMP, IVA, TOTAL, ESTADO
    FROM PEDIDOS_VENTA
    ORDER BY FECHA DESC, NUMERO DESC
  `.trim();
}

export function readOrderLinesQuery(orderNumber: string): string {
  return `
    SELECT 
      NUMERO_PEDIDO, LINEA, CODIGO_ART, DESCR, CANTIDAD, PRECIO, TOTAL
    FROM LINEAS_PEDIDOS
    WHERE NUMERO_PEDIDO = '${sanitizeSql(orderNumber)}'
    ORDER BY LINEA ASC
  `.trim();
}
