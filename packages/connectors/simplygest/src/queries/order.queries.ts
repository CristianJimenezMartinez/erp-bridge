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

function safeFixed(val: unknown, decimals: number, fallback = 0): string {
  const num = Number(val);
  return (Number.isFinite(num) ? num : fallback).toFixed(decimals);
}

export function insertOrderHeaderQuery(
  order: CanonicalOrder,
  orderNumber: string,
  customerCode: string
): string {
  const ref = sanitizeSql(order.reference || `WC-${order.orderNumber || order.id}`, 50);
  const dateFormatted = formatAccessDate(order.date || new Date());
  const netAmount = safeFixed(order.netAmount, 2, 0);
  const taxAmount = safeFixed(order.taxAmount, 2, 0);
  const totalAmount = safeFixed(order.totalAmount, 2, 0);

  return `
    INSERT INTO PEDIDOS_VENTA (
      NUMERO, FECHA, CLIENTE, REFPEDIDO, BASE_IMP, IVA, TOTAL, ESTADO
    ) VALUES (
      '${sanitizeSql(orderNumber, 20)}',
      ${dateFormatted},
      '${sanitizeSql(customerCode, 20)}',
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
  const sku = sanitizeSql(line.sku, 30);
  const name = sanitizeSql(line.name, 100);
  const safePosition = Math.max(1, Math.floor(Number(position) || 1));
  const qty = safeFixed(line.quantity, 4, 1);
  const price = safeFixed(line.unitPrice, 4, 0);
  const total = safeFixed(line.total ?? (Number(qty) * Number(price)), 2, 0);

  return `
    INSERT INTO LINEAS_PEDIDOS (
      NUMERO_PEDIDO, LINEA, CODIGO_ART, DESCR, CANTIDAD, PRECIO, TOTAL
    ) VALUES (
      '${sanitizeSql(orderNumber, 20)}',
      ${safePosition},
      '${sku}',
      '${name}',
      ${qty},
      ${price},
      ${total}
    )
  `.trim();
}

export function readOrdersQuery(limit = 50): string {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(Number(limit)) || 50));
  return `
    SELECT TOP ${safeLimit}
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
