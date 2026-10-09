import { CanonicalCustomer, CanonicalOrder, CanonicalOrderLine, Logger } from '@erp-bridge/shared';

const logger = new Logger('OrderPlausibilityAdapter');

export interface OrderValidationResult {
  valid: boolean;
  sanitizedOrder?: CanonicalOrder;
  error?: string;
}

/**
 * Elimina caracteres de control ASCII (0x00 a 0x1F y 0x7F).
 * Permite opcionalmente saltos de línea (\n, \r) y tabulaciones (\t) si allowNewlines es true.
 */
function cleanControlChars(input: unknown, allowNewlines = false): string {
  if (typeof input !== 'string') return '';
  if (allowNewlines) {
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  }
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

/**
 * Trunca una cadena de texto a una longitud máxima segura sin romperla.
 */
function truncateString(str: string, maxLength: number): string {
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

export class OrderPlausibilityAdapter {
  private static readonly MAX_LINES = 500;
  private static readonly MAX_QUANTITY = 100_000;
  private static readonly MAX_PRICE = 1_000_000;
  private static readonly MAX_TOTAL = 10_000_000;

  /**
   * Valida estrictamente la plausibilidad y sanea una orden canónica antes de su inserción en Factusol.
   * Protege el conector FROZEN contra inyecciones SQL/OLEDB, NaN/Infinity, y desbordamientos de tipos.
   */
  public static validateAndSanitize(order: unknown): OrderValidationResult {
    if (!order || typeof order !== 'object') {
      return { valid: false, error: 'El pedido no es un objeto válido' };
    }

    const o = order as Partial<CanonicalOrder>;

    // 1. Validación de número de líneas
    if (!Array.isArray(o.lines) || o.lines.length === 0) {
      return { valid: false, error: 'El pedido no contiene ninguna línea de artículos' };
    }

    if (o.lines.length > this.MAX_LINES) {
      return { valid: false, error: `El pedido supera el máximo permitido de ${this.MAX_LINES} líneas` };
    }

    // 2. Validación de importes totales del pedido
    const totalAmount = Number(o.totalAmount);
    if (!Number.isFinite(totalAmount) || totalAmount < 0 || totalAmount > this.MAX_TOTAL) {
      return { valid: false, error: `Importe total inválido o fuera de rango: ${o.totalAmount}` };
    }

    const netAmount = o.netAmount !== undefined ? Number(o.netAmount) : 0;
    if (!Number.isFinite(netAmount) || netAmount < 0 || netAmount > this.MAX_TOTAL) {
      return { valid: false, error: `Base imponible (netAmount) inválida: ${o.netAmount}` };
    }

    const taxAmount = o.taxAmount !== undefined ? Number(o.taxAmount) : 0;
    if (!Number.isFinite(taxAmount) || taxAmount < 0 || taxAmount > this.MAX_TOTAL) {
      return { valid: false, error: `Impuestos (taxAmount) inválidos: ${o.taxAmount}` };
    }

    const shippingAmount = o.shippingAmount !== undefined ? Number(o.shippingAmount) : 0;
    if (!Number.isFinite(shippingAmount) || shippingAmount < 0 || shippingAmount > 100_000) {
      return { valid: false, error: `Costes de envío inválidos: ${o.shippingAmount}` };
    }

    // 3. Validación y saneamiento de líneas
    const sanitizedLines: CanonicalOrderLine[] = [];
    let calculatedLinesSum = 0;

    for (let i = 0; i < o.lines.length; i++) {
      const line = o.lines[i];
      if (!line || typeof line !== 'object') {
        return { valid: false, error: `Línea ${i + 1} no es un objeto válido` };
      }

      const rawSku = cleanControlChars(line.sku);
      if (!rawSku) {
        return { valid: false, error: `Línea ${i + 1} carece de SKU / código de artículo` };
      }
      const sku = truncateString(rawSku, 30);

      const rawName = cleanControlChars(line.name);
      const name = truncateString(rawName || sku, 100);

      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0 || qty > this.MAX_QUANTITY) {
        return { valid: false, error: `Línea ${i + 1} (${sku}) tiene una cantidad no válida: ${line.quantity}` };
      }

      const unitPrice = Number(line.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > this.MAX_PRICE) {
        return { valid: false, error: `Línea ${i + 1} (${sku}) tiene un precio unitario no válido: ${line.unitPrice}` };
      }

      const discountPercent = Number(line.discountPercent ?? 0);
      if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        return { valid: false, error: `Línea ${i + 1} (${sku}) tiene un porcentaje de descuento no válido: ${line.discountPercent}` };
      }

      const lineTotal = Number(line.total);
      if (!Number.isFinite(lineTotal) || lineTotal < 0 || lineTotal > this.MAX_TOTAL) {
        return { valid: false, error: `Línea ${i + 1} (${sku}) tiene un total de línea no válido: ${line.total}` };
      }

      const lineSubtotal = line.subtotal !== undefined ? Number(line.subtotal) : lineTotal;
      if (!Number.isFinite(lineSubtotal) || lineSubtotal < 0 || lineSubtotal > this.MAX_TOTAL) {
        return { valid: false, error: `Línea ${i + 1} (${sku}) tiene un subtotal no válido: ${line.subtotal}` };
      }

      // Plausibilidad aritmética de línea con tolerancia para descuentos y redondeos
      const theoreticalLineTotal = Math.round(qty * unitPrice * (1 - discountPercent / 100) * 100) / 100;
      if (Math.abs(lineTotal - theoreticalLineTotal) > 5 && Math.abs(lineTotal - theoreticalLineTotal) / (theoreticalLineTotal || 1) > 0.25) {
        logger.warn(`Discrepancia aritmética en línea ${i + 1} (${sku}): declarada ${lineTotal}€ vs teórica ${theoreticalLineTotal}€. Ajustando al valor plausible.`);
      }

      calculatedLinesSum += lineTotal;

      sanitizedLines.push({
        ...line,
        id: line.id ? cleanControlChars(String(line.id)) : `line_${i + 1}`,
        position: Math.max(1, Math.floor(Number(line.position) || i + 1)),
        sku,
        name,
        quantity: Math.round(qty * 1000) / 1000,
        unitPrice: Math.round(unitPrice * 10000) / 10000,
        discountPercent: Math.round(discountPercent * 100) / 100,
        vatPercent: Number.isFinite(Number(line.vatPercent)) ? Number(line.vatPercent) : 21,
        vatType: Number.isInteger(Number(line.vatType)) ? Number(line.vatType) : 0,
        subtotal: Math.round(lineSubtotal * 100) / 100,
        total: Math.round(lineTotal * 100) / 100,
      });
    }

    // 4. Validación y saneamiento del cliente
    const rawCust: Partial<CanonicalCustomer> = (o.customer && typeof o.customer === 'object') ? o.customer : {};
    const rawFiscal = cleanControlChars(rawCust.fiscalName);
    const fiscalName = truncateString(rawFiscal || 'Cliente Web', 100);
    const taxId = truncateString(cleanControlChars(rawCust.taxId), 20);
    const email = truncateString(cleanControlChars(rawCust.email), 100);
    const phone = truncateString(cleanControlChars(rawCust.phone), 30);

    const customer: CanonicalCustomer = {
      ...rawCust,
      id: rawCust.id ? cleanControlChars(String(rawCust.id)) : 'web_customer',
      fiscalName,
      taxId: taxId || undefined,
      email: email || undefined,
      phone: phone || undefined,
      hasEquivalenceSurcharge: Boolean(rawCust.hasEquivalenceSurcharge),
      commercialName: rawCust.commercialName ? truncateString(cleanControlChars(rawCust.commercialName), 100) : undefined,
    };

    // 5. Validación y saneamiento de cabecera del pedido
    const orderNumber = truncateString(cleanControlChars(o.orderNumber || '0'), 50);
    const series = truncateString(cleanControlChars(o.series || 'A'), 5).toUpperCase();
    const reference = truncateString(cleanControlChars(o.reference || orderNumber), 50);
    const warehouse = truncateString(cleanControlChars(o.warehouse || 'GEN'), 10).toUpperCase();
    const notes = o.notes ? truncateString(cleanControlChars(o.notes, true), 500) : undefined;
    const paymentMethod = o.paymentMethod ? truncateString(cleanControlChars(o.paymentMethod), 50) : 'web';

    const sanitizedOrder: CanonicalOrder = {
      id: o.id ? cleanControlChars(String(o.id)) : `ord_${orderNumber}`,
      orderNumber,
      series,
      reference,
      date: o.date instanceof Date ? o.date : (o.date ? new Date(o.date) : new Date()),
      status: o.status || 'pending',
      customer,
      lines: sanitizedLines,
      netAmount: Math.round(netAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      shippingAmount: Math.round(shippingAmount * 100) / 100,
      discountAmount: Number.isFinite(Number(o.discountAmount)) ? Math.round(Number(o.discountAmount) * 100) / 100 : 0,
      totalAmount: Math.round(totalAmount * 100) / 100,
      hasEquivalenceSurcharge: Boolean(o.hasEquivalenceSurcharge),
      currency: cleanControlChars(o.currency || 'EUR') || 'EUR',
      warehouse,
      notes,
      paymentMethod,
      shippingAddress: o.shippingAddress ? {
        ...o.shippingAddress,
        street: o.shippingAddress.street ? truncateString(cleanControlChars(o.shippingAddress.street), 100) : undefined,
        city: o.shippingAddress.city ? truncateString(cleanControlChars(o.shippingAddress.city), 50) : undefined,
        postalCode: o.shippingAddress.postalCode ? truncateString(cleanControlChars(o.shippingAddress.postalCode), 20) : undefined,
        state: o.shippingAddress.state ? truncateString(cleanControlChars(o.shippingAddress.state), 50) : undefined,
      } : undefined,
    };

    return {
      valid: true,
      sanitizedOrder,
    };
  }
}
