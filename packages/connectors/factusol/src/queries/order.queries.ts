import { CanonicalAddress, CanonicalOrder, CanonicalOrderLine } from '@erp-bridge/shared';
import {
  OrderVatBreakdown,
  calculateOrderVatBreakdown,
  determineTivpcl,
  formatAccessDate,
  formatAccessDateOnly,
  formatAccessTimeOnly,
  getVatBracket,
  normalizeTaxId,
  sanitizeAndTruncate,
  sanitizeFloat,
  sanitizeInt,
  sanitizeLikePattern,
  sanitizeSql,
} from './order-vat.queries';

export {
  OrderVatBreakdown,
  calculateOrderVatBreakdown,
  determineTivpcl,
  formatAccessDate,
  formatAccessDateOnly,
  formatAccessTimeOnly,
  getVatBracket,
  normalizeTaxId,
  sanitizeAndTruncate,
  sanitizeFloat,
  sanitizeInt,
  sanitizeLikePattern,
  sanitizeSql,
};

/** Longitud máxima de un literal de cadena en SQL Jet/ACE (F15). */
export const MAX_ACCESS_SQL_LITERAL = 255;

/**
 * Sanea un literal para Jet/ACE garantizando que la longitud FINAL ya escapada (comillas duplicadas)
 * no supere `maxEscapedLen`. Se trunca ANTES de escapar carácter a carácter, de modo que nunca puede
 * quedar una comilla simple suelta ni excederse el límite de 255 caracteres de un literal Access.
 */
export function sanitizeSqlLiteral(val: unknown, maxEscapedLen = MAX_ACCESS_SQL_LITERAL): string {
  if (val === null || val === undefined) return '';
  const cleaned = String(val).replace(/[\x00-\x1f\x7f]/g, '').trim();
  let out = '';
  for (const ch of cleaned) {
    const piece = ch === "'" ? "''" : ch;
    if (out.length + piece.length > maxEscapedLen) break;
    out += piece;
  }
  return out;
}

export function getNextOrderIdQuery(series = ''): string {
  const sanitizedSeries = sanitizeSql(series);
  if (sanitizedSeries) {
    return `SELECT MAX(CODPCL) AS maxid FROM F_PCL WHERE TIPPCL = '${sanitizedSeries}'`;
  }
  return `SELECT MAX(CODPCL) AS maxid FROM F_PCL`;
}

export function findDeliveryAddressQuery(customerCode: number, street: string, postalCode: string): string {
  const safeCustCode = sanitizeInt(customerCode, 0, 0);
  return `SELECT * FROM F_OBR WHERE CLIOBR = ${safeCustCode} AND DIROBR = '${sanitizeAndTruncate(street, 50)}' AND CPOOBR = '${sanitizeAndTruncate(postalCode, 5)}'`;
}

export function getNextDeliveryAddressIdQuery(customerCode: number): string {
  const safeCustCode = sanitizeInt(customerCode, 0, 0);
  return `SELECT MAX(CODOBR) AS maxid FROM F_OBR WHERE CLIOBR = ${safeCustCode}`;
}

export function insertDeliveryAddressQuery(
  customerCode: number,
  dirCode: number,
  shipAddr: CanonicalAddress,
  recipientName: string
): string {
  const safeCustCode = sanitizeInt(customerCode, 0, 0);
  const safeDirCode = sanitizeInt(dirCode, 1, 1);
  const name = sanitizeAndTruncate(recipientName, 50);
  const street = sanitizeAndTruncate(shipAddr.street || '', 50);
  const city = sanitizeAndTruncate(shipAddr.city || '', 30);
  const postalCode = sanitizeAndTruncate(shipAddr.postalCode || '', 5);
  const province = sanitizeAndTruncate(shipAddr.state || '', 30);
  const phone = sanitizeAndTruncate(shipAddr.phone || '', 15);

  return `
    INSERT INTO F_OBR (
      CLIOBR, CODOBR, NOMOBR, DIROBR, POBOBR, CPOOBR, PROOBR, TELOBR
    ) VALUES (
      ${safeCustCode},
      ${safeDirCode},
      '${name}',
      '${street}',
      '${city}',
      '${postalCode}',
      '${province}',
      '${phone}'
    )
  `.trim();
}

export function findOrderByReferenceQuery(ref: string): string {
  return `SELECT * FROM F_PCL WHERE REFPCL = '${sanitizeAndTruncate(ref, 50)}'`;
}

export function mapPaymentMethodToFactusol(method?: string): string {
  if (!method) return 'TAR';
  const m = method.toLowerCase();
  if (m.includes('redsys') || m.includes('stripe') || m.includes('card') || m.includes('tarjeta') || m.includes('tpv')) return 'TAR';
  if (m.includes('bacs') || m.includes('transfer') || m.includes('wire') || m.includes('bbva')) return 'TR';
  if (m.includes('cod') || m.includes('reembolso') || m.includes('cash')) return 'EFE';
  if (m.includes('paypal')) return 'PAY';
  return sanitizeAndTruncate(method, 3).toUpperCase() || 'TAR';
}

export function insertOrderHeaderQuery(
  order: CanonicalOrder,
  orderCode: number,
  customerCode: number,
  breakdownOverride?: OrderVatBreakdown,
  seriesOverride?: string
): string {
  const safeOrderCode = sanitizeInt(orderCode, 1, 1);
  const safeCustCode = sanitizeInt(customerCode, 1, 0);
  const series = sanitizeAndTruncate(seriesOverride ?? order.series ?? ' ', 1);
  const ref = sanitizeAndTruncate(order.reference || order.orderNumber, 50);
  const orderDate = order.date ? new Date(order.date) : new Date();
  const fecpclFormatted = formatAccessDateOnly(orderDate);
  const horpclFormatted = formatAccessTimeOnly(orderDate);

  const shipAddr: CanonicalAddress =
    order.shippingAddress || order.billingAddress || order.customer?.address || { country: 'ES' };
  const recipientName = sanitizeAndTruncate(
    [shipAddr.firstName, shipAddr.lastName].filter(Boolean).join(' ') ||
      order.customer?.fiscalName ||
      'CLIENTE CONTADO WEB',
    100
  );

  const street = sanitizeAndTruncate(shipAddr.street || order.billingAddress?.street || order.customer?.address?.street || '', 100);
  const city = sanitizeAndTruncate(shipAddr.city || order.billingAddress?.city || order.customer?.address?.city || '', 30);
  const postalCode = sanitizeAndTruncate(shipAddr.postalCode || order.billingAddress?.postalCode || order.customer?.address?.postalCode || '', 10);
  const province = sanitizeAndTruncate(shipAddr.state || order.billingAddress?.state || order.customer?.address?.state || '', 40);
  const phone = sanitizeAndTruncate(shipAddr.phone || order.customer?.phone || '', 50);
  const customerEmail = sanitizeSqlLiteral(shipAddr.email || order.customer?.email || '', 255);
  const nif = sanitizeAndTruncate(normalizeTaxId(order.customer?.taxId) || order.customer?.taxId || '', 18);
  const warehouse = sanitizeAndTruncate(order.warehouse || 'GEN', 3);
  const orderNotes = sanitizeAndTruncate(order.notes || '', 50);
  const paymentMethodCode = mapPaymentMethodToFactusol(order.paymentMethod);

  const breakdown = breakdownOverride || calculateOrderVatBreakdown(order);
  const hasReq = order.customer?.hasEquivalenceSurcharge || order.hasEquivalenceSurcharge ? 1 : 0;
  const ipor1Val = breakdown.net1 > 0 ? breakdown.shipping : 0;

  return `
    INSERT INTO F_PCL (
      TIPPCL, CODPCL, REFPCL, FECPCL, HORPCL, USUPCL, CPAPCL, AGEPCL, CLIPCL,
      CNOPCL, CDOPCL, CPOPCL, CCPPCL, CPRPCL, CNIPCL, TELPCL, CEMPCL,
      TIVPCL, REQPCL, ESTPCL, ALMPCL,
      NET1PCL, BAS1PCL, PIVA1PCL, IIVA1PCL, PREC1PCL, IREC1PCL,
      NET2PCL, BAS2PCL, PIVA2PCL, IIVA2PCL, PREC2PCL, IREC2PCL,
      NET3PCL, BAS3PCL, PIVA3PCL, IIVA3PCL, PREC3PCL, IREC3PCL,
      NET4PCL, BAS4PCL, IPOR1PCL, TOTPCL,
      FOPPCL, OB1PCL
    ) VALUES (
      '${series}',
      ${safeOrderCode},
      '${ref}',
      ${fecpclFormatted},
      ${horpclFormatted},
      0,
      '724',
      0,
      ${safeCustCode},
      '${recipientName}',
      '${street}',
      '${city}',
      '${postalCode}',
      '${province}',
      '${nif}',
      '${phone}',
      '${customerEmail}',
      ${sanitizeInt(breakdown.tivpcl, 0, 0, 10)},
      ${hasReq},
      0,
      '${warehouse}',
      ${breakdown.net1.toFixed(2)},
      ${breakdown.bas1.toFixed(2)},
      21.0,
      ${breakdown.iiva1.toFixed(2)},
      5.2,
      ${breakdown.irec1.toFixed(2)},
      ${breakdown.net2.toFixed(2)},
      ${breakdown.bas2.toFixed(2)},
      10.0,
      ${breakdown.iiva2.toFixed(2)},
      1.4,
      ${breakdown.irec2.toFixed(2)},
      ${breakdown.net3.toFixed(2)},
      ${breakdown.bas3.toFixed(2)},
      4.0,
      ${breakdown.iiva3.toFixed(2)},
      0.5,
      ${breakdown.irec3.toFixed(2)},
      ${breakdown.net4.toFixed(2)},
      ${breakdown.bas4.toFixed(2)},
      ${ipor1Val.toFixed(2)},
      ${breakdown.total.toFixed(2)},
      '${paymentMethodCode}',
      '${orderNotes}'
    )
  `.trim();
}

export function insertOrderLineQuery(
  line: CanonicalOrderLine,
  orderCode: number,
  series = ' ',
  position = 1
): string {
  const safeOrderCode = sanitizeInt(orderCode, 1, 1);
  const sanitizedSeries = sanitizeAndTruncate(series || ' ', 1);
  const sku = sanitizeAndTruncate(line.sku, 13);
  const name = sanitizeAndTruncate(line.name, 50);
  const longDesc = String(
    (line.rawSourceData as Record<string, unknown>)?.description ||
      (line as unknown as Record<string, unknown>).description ||
      line.name ||
      ''
  );
  const memo = sanitizeSqlLiteral(longDesc, MAX_ACCESS_SQL_LITERAL);
  const qty = sanitizeFloat(line.quantity, 1).toFixed(2);
  const price = sanitizeFloat(line.unitPrice, 0).toFixed(4);
  const discount = sanitizeFloat(line.discountPercent, 0).toFixed(2);
  const total = sanitizeFloat(line.total ?? Number(qty) * Number(price) * (1 - Number(discount) / 100), 0).toFixed(2);

  const { bracket, rate: vatRate } = getVatBracket(line);
  const priceWithVat = (Number(price) * (1 + vatRate / 100)).toFixed(4);
  const totalWithVat = (Number(total) * (1 + vatRate / 100)).toFixed(2);
  const linePos = sanitizeInt(line.position || position || 1, 1, 1, 10000);

  return `
    INSERT INTO F_LPC (
      TIPLPC, CODLPC, POSLPC, ARTLPC, DESLPC, CANLPC, DT1LPC, PRELPC, TOTLPC,
      PENLPC, IVALPC, MEMLPC, PIVLPC, TIVLPC
    ) VALUES (
      '${sanitizedSeries}',
      ${safeOrderCode},
      ${linePos},
      '${sku}',
      '${name}',
      ${qty},
      ${discount},
      ${price},
      ${total},
      ${qty},
      ${sanitizeInt(bracket, 0, 0, 10)},
      '${memo}',
      ${priceWithVat},
      ${totalWithVat}
    )
  `.trim();
}

export function decrementStockQuery(sku: string, warehouse = 'GEN', quantity = 1): string {
  const safeSku = sanitizeAndTruncate(sku, 13);
  const safeWarehouse = sanitizeAndTruncate(warehouse || 'GEN', 3);
  const qty = sanitizeFloat(quantity, 1);
  return `UPDATE F_STO SET DISSTO = DISSTO - ${qty} WHERE ARTSTO = '${safeSku}' AND ALMSTO = '${safeWarehouse}'`;
}

export function incrementStockQuery(sku: string, warehouse = 'GEN', quantity = 1): string {
  const safeSku = sanitizeAndTruncate(sku, 13);
  const safeWarehouse = sanitizeAndTruncate(warehouse || 'GEN', 3);
  const qty = sanitizeFloat(quantity, 1);
  return `UPDATE F_STO SET DISSTO = DISSTO + ${qty} WHERE ARTSTO = '${safeSku}' AND ALMSTO = '${safeWarehouse}'`;
}

export function updateOrderStatusQuery(orderCode: number, series = ' ', statusCode = 0): string {
  const safeOrderCode = sanitizeInt(orderCode, 1, 0);
  const safeStatus = sanitizeInt(statusCode, 0, 0, 99);
  const sanitizedSeries = sanitizeAndTruncate(series || ' ', 1);
  return `
    UPDATE F_PCL
    SET ESTPCL = ${safeStatus}
    WHERE CODPCL = ${safeOrderCode} AND TIPPCL = '${sanitizedSeries}'
  `.trim();
}

export function readOrdersQuery(limit = 50): string {
  const safeLimit = sanitizeInt(limit, 50, 1, 10000);
  return `
    SELECT TOP ${safeLimit} 
      TIPPCL, CODPCL, REFPCL, FECPCL, HORPCL, USUPCL, CPAPCL, AGEPCL, CLIPCL,
      CNOPCL, CDOPCL, CPOPCL, CCPPCL, CPRPCL, CNIPCL,
      TELPCL, CEMPCL, TIVPCL, REQPCL, ESTPCL, ALMPCL,
      NET1PCL, BAS1PCL, PIVA1PCL, IIVA1PCL, PREC1PCL, IREC1PCL,
      NET2PCL, BAS2PCL, PIVA2PCL, IIVA2PCL, PREC2PCL, IREC2PCL,
      NET3PCL, BAS3PCL, PIVA3PCL, IIVA3PCL, PREC3PCL, IREC3PCL,
      NET4PCL, BAS4PCL, IPOR1PCL, TOTPCL, FOPPCL, OB1PCL
    FROM F_PCL
    ORDER BY FECPCL DESC, CODPCL DESC
  `.trim();
}

export function readOrderLinesQuery(orderCode: number, series = ' '): string {
  const safeOrderCode = sanitizeInt(orderCode, 0, 0);
  const sanitizedSeries = sanitizeAndTruncate(series || ' ', 1);
  return `
    SELECT 
      TIPLPC, CODLPC, POSLPC, ARTLPC, DESLPC, CANLPC, DT1LPC, PRELPC, TOTLPC,
      PENLPC, IVALPC, MEMLPC, PIVLPC, TIVLPC
    FROM F_LPC
    WHERE CODLPC = ${safeOrderCode} AND TIPLPC = '${sanitizedSeries}'
    ORDER BY POSLPC ASC
  `.trim();
}
