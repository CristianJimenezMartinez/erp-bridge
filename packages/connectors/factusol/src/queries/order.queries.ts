import { CanonicalAddress, CanonicalOrder, CanonicalOrderLine } from '@erp-bridge/shared';

export function sanitizeAndTruncate(val: unknown, maxLen: number): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().substring(0, maxLen).replace(/'/g, "''");
}

export function sanitizeSql(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/'/g, "''");
}

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

export function normalizeTaxId(taxId?: string): string {
  if (!taxId) return '';
  const cleaned = String(taxId).replace(/[\s\-_.]/g, '').toUpperCase();
  if (cleaned.startsWith('ES') && cleaned.length > 2) {
    return cleaned.substring(2);
  }
  return cleaned;
}


export function formatAccessDateOnly(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const year = date.getFullYear();
  return `#${year}-${month}-${day}#`;
}

export function formatAccessTimeOnly(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  const secs = pad(date.getSeconds());
  return `#${hours}:${mins}:${secs}#`;
}

export function getNextOrderIdQuery(series = ''): string {
  const sanitizedSeries = sanitizeSql(series);
  if (sanitizedSeries) {
    return `SELECT MAX(CODPCL) AS maxid FROM F_PCL WHERE TIPPCL = '${sanitizedSeries}'`;
  }
  return `SELECT MAX(CODPCL) AS maxid FROM F_PCL`;
}

// Direcciones de entrega / obras en Factusol: tabla F_OBR (CLIOBR, CODOBR, NOMOBR, DIROBR, POBOBR, CPOOBR, PROOBR, TELOBR)
export function findDeliveryAddressQuery(customerCode: number, street: string, postalCode: string): string {
  return `SELECT * FROM F_OBR WHERE CLIOBR = ${customerCode} AND DIROBR = '${sanitizeAndTruncate(street, 50)}' AND CPOOBR = '${sanitizeAndTruncate(postalCode, 5)}'`;
}

export function getNextDeliveryAddressIdQuery(customerCode: number): string {
  return `SELECT MAX(CODOBR) AS maxid FROM F_OBR WHERE CLIOBR = ${customerCode}`;
}

export function insertDeliveryAddressQuery(
  customerCode: number,
  dirCode: number,
  shipAddr: CanonicalAddress,
  recipientName: string
): string {
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
      ${customerCode},
      ${dirCode},
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

const EU_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'GR', 'ES', 'FI',
  'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT',
  'RO', 'SE', 'SI', 'SK'
]);

/**
 * Determina el código TIVPCL para la cabecera del pedido en Factusol:
 * 0 = Con IVA nacional (España Peninsular y Baleares, o B2C UE sin VIES)
 * 2 = Intracomunitario B2B con VIES (Clientes de la UE con NIF intracomunitario)
 * 3 = Canarias / Ceuta / Melilla / Exportación extracomunitaria (Exento)
 */
export function determineTivpcl(order: CanonicalOrder): number {
  const shipAddr: CanonicalAddress = order.shippingAddress || order.billingAddress || order.customer?.address || { country: 'ES' };
  const country = (shipAddr.country || order.customer?.address?.country || 'ES').trim().toUpperCase();
  const postalCode = (shipAddr.postalCode || order.customer?.address?.postalCode || '').trim();

  // 1. Territorio Español
  if (country === 'ES' || country === 'ESP' || country === '724' || country === 'ESPAÑA' || country === 'ESPANA') {
    // Canarias (35, 38), Ceuta (51), Melilla (52)
    if (
      postalCode.startsWith('35') ||
      postalCode.startsWith('38') ||
      postalCode.startsWith('51') ||
      postalCode.startsWith('52')
    ) {
      return 3;
    }
    return 0;
  }

  // 2. Unión Europea (VIES B2B = exento / inversión sujeto pasivo)
  if (EU_COUNTRY_CODES.has(country)) {
    const taxId = (order.customer?.taxId || '').trim();
    if (taxId && !taxId.startsWith('ES') && taxId.length > 8) {
      return 2; // Intracomunitario B2B con VIES
    }
    return 0; // Nacional/destino estándar
  }

  // 3. Extracomunitario / Terceros países
  return 3;
}

export interface OrderVatBreakdown {
  net1: number;
  bas1: number;
  piva1: number;
  iiva1: number;
  prec1: number;
  irec1: number;

  net2: number;
  bas2: number;
  piva2: number;
  iiva2: number;
  prec2: number;
  irec2: number;

  net3: number;
  bas3: number;
  piva3: number;
  iiva3: number;
  prec3: number;
  irec3: number;

  net4: number;
  bas4: number;

  shipping: number;
  total: number;
  tivpcl: number;
}

/**
 * Obtiene el tramo de IVA para una línea:
 * 0 = 21% (Tramo 1)
 * 1 = 10% (Tramo 2)
 * 2 = 4% (Tramo 3)
 * 3 = Exento / 0% (Tramo 4)
 */
export function getVatBracket(line: CanonicalOrderLine): { bracket: number; rate: number } {
  if (typeof line.vatType === 'number') {
    if (line.vatType === 0) return { bracket: 0, rate: 21.0 };
    if (line.vatType === 1) return { bracket: 1, rate: 10.0 };
    if (line.vatType === 2) return { bracket: 2, rate: 4.0 };
    if (line.vatType === 3) return { bracket: 3, rate: 0.0 };
  }

  const rate = Number((line as any).vatRate ?? line.vatPercent ?? 21);
  if (Math.abs(rate - 21) < 0.5) return { bracket: 0, rate: 21.0 };
  if (Math.abs(rate - 10) < 0.5) return { bracket: 1, rate: 10.0 };
  if (Math.abs(rate - 4) < 0.5) return { bracket: 2, rate: 4.0 };
  if (rate === 0) return { bracket: 3, rate: 0.0 };
  return { bracket: 0, rate: 21.0 };
}

/**
 * Calcula el desglose multi-tramo de IVA según las identidades de Factusol:
 * BAS1PCL = NET1PCL + IPOR1PCL
 * BAS2PCL = NET2PCL
 * BAS3PCL = NET3PCL
 * BAS4PCL = NET4PCL
 * Aplica ajuste del céntimo contra order.totalAmount si difiere en ±0.01..±0.05
 */
export function calculateOrderVatBreakdown(order: CanonicalOrder): OrderVatBreakdown {
  const tivpcl = determineTivpcl(order);
  const isVatExempt = tivpcl === 2 || tivpcl === 3;
  const hasReq = Boolean(order.customer?.hasEquivalenceSurcharge || order.hasEquivalenceSurcharge);

  let net1 = 0;
  let net2 = 0;
  let net3 = 0;
  let net4 = 0;

  if (order.lines && order.lines.length > 0) {
    for (const line of order.lines) {
      const qty = Number(line.quantity || 1);
      const price = Number(line.unitPrice || 0);
      const discount = Number(line.discountPercent || 0);
      const lineNet = typeof line.total === 'number' && !isNaN(line.total)
        ? line.total
        : qty * price * (1 - discount / 100);

      const { bracket } = getVatBracket(line);
      if (bracket === 0) net1 += lineNet;
      else if (bracket === 1) net2 += lineNet;
      else if (bracket === 2) net3 += lineNet;
      else net4 += lineNet;
    }
  } else if (order.netAmount) {
    net1 = Number(Number(order.netAmount).toFixed(2));
  }

  net1 = Number(net1.toFixed(2));
  net2 = Number(net2.toFixed(2));
  net3 = Number(net3.toFixed(2));
  net4 = Number(net4.toFixed(2));

  // 1. Deducción ponderada de order.discountAmount de las bases imponibles
  const discountAmount = Number(order.discountAmount || 0);
  if (discountAmount > 0) {
    const totalNetBeforeDiscount = Number((net1 + net2 + net3 + net4).toFixed(2));
    if (totalNetBeforeDiscount > 0) {
      const disc1 = Number(((net1 / totalNetBeforeDiscount) * discountAmount).toFixed(2));
      const disc2 = Number(((net2 / totalNetBeforeDiscount) * discountAmount).toFixed(2));
      const disc3 = Number(((net3 / totalNetBeforeDiscount) * discountAmount).toFixed(2));
      const disc4 = Number((discountAmount - disc1 - disc2 - disc3).toFixed(2));

      net1 = Math.max(0, Number((net1 - disc1).toFixed(2)));
      net2 = Math.max(0, Number((net2 - disc2).toFixed(2)));
      net3 = Math.max(0, Number((net3 - disc3).toFixed(2)));
      net4 = Math.max(0, Number((net4 - disc4).toFixed(2)));
    }
  }

  let shipping = Number(Number(order.shippingAmount || 0).toFixed(2));

  // 2. Imputación de portes:
  // Si el pedido tiene productos al 21%, imputa a BAS1 (identidad BAS1 = NET1 + IPOR1).
  // Si el pedido NO tiene productos al 21% (p.ej. solo al 10% o al 4%), imputa al tipo impositivo preponderante.
  let bas1 = net1;
  let bas2 = net2;
  let bas3 = net3;
  let bas4 = net4;

  if (shipping > 0) {
    if (net1 > 0 || (net2 === 0 && net3 === 0 && net4 === 0)) {
      bas1 = Number((net1 + shipping).toFixed(2));
    } else if (net2 >= net3 && net2 >= net4 && net2 > 0) {
      bas2 = Number((net2 + shipping).toFixed(2));
    } else if (net3 >= net2 && net3 >= net4 && net3 > 0) {
      bas3 = Number((net3 + shipping).toFixed(2));
    } else if (net4 > 0) {
      bas4 = Number((net4 + shipping).toFixed(2));
    } else {
      bas1 = Number((net1 + shipping).toFixed(2));
    }
  }

  let iiva1 = isVatExempt ? 0 : Number((bas1 * 0.21).toFixed(2));
  let irec1 = isVatExempt || !hasReq ? 0 : Number((bas1 * 0.052).toFixed(2));

  let iiva2 = isVatExempt ? 0 : Number((bas2 * 0.10).toFixed(2));
  let irec2 = isVatExempt || !hasReq ? 0 : Number((bas2 * 0.014).toFixed(2));

  let iiva3 = isVatExempt ? 0 : Number((bas3 * 0.04).toFixed(2));
  let irec3 = isVatExempt || !hasReq ? 0 : Number((bas3 * 0.005).toFixed(2));

  let factusolTotal = Number((bas1 + iiva1 + irec1 + bas2 + iiva2 + irec2 + bas3 + iiva3 + irec3 + bas4).toFixed(2));

  // 3. Ajuste del céntimo (Cent Rounding) para cuadre 100% con Stripe / pasarela web
  const targetTotal = Number(Number(order.totalAmount || 0).toFixed(2));
  if (targetTotal > 0) {
    const diff = Number((targetTotal - factusolTotal).toFixed(2));
    if (Math.abs(diff) > 0 && Math.abs(diff) <= 0.05) {
      if (net1 > 0 || (net2 === 0 && net3 === 0 && net4 === 0)) {
        if (shipping > 0) {
          shipping = Number((shipping + diff).toFixed(2));
          bas1 = Number((net1 + shipping).toFixed(2));
        } else {
          bas1 = Number((bas1 + diff).toFixed(2));
        }
        if (!isVatExempt) {
          iiva1 = Number((bas1 * 0.21).toFixed(2));
          if (hasReq) irec1 = Number((bas1 * 0.052).toFixed(2));
        }
      } else if (net2 >= net3 && net2 >= net4) {
        bas2 = Number((bas2 + diff).toFixed(2));
        if (!isVatExempt) {
          iiva2 = Number((bas2 * 0.10).toFixed(2));
          if (hasReq) irec2 = Number((bas2 * 0.014).toFixed(2));
        }
      } else if (net3 >= net2 && net3 >= net4) {
        bas3 = Number((bas3 + diff).toFixed(2));
        if (!isVatExempt) {
          iiva3 = Number((bas3 * 0.04).toFixed(2));
          if (hasReq) irec3 = Number((bas3 * 0.005).toFixed(2));
        }
      } else {
        bas4 = Number((bas4 + diff).toFixed(2));
      }
      factusolTotal = targetTotal;
    }
  }

  return {
    net1,
    bas1,
    piva1: 21.0,
    iiva1,
    prec1: 5.2,
    irec1,

    net2,
    bas2,
    piva2: 10.0,
    iiva2,
    prec2: 1.4,
    irec2,

    net3,
    bas3,
    piva3: 4.0,
    iiva3,
    prec3: 0.5,
    irec3,

    net4,
    bas4,

    shipping,
    total: targetTotal > 0 ? targetTotal : factusolTotal,
    tivpcl,
  };
}

export function insertOrderHeaderQuery(
  order: CanonicalOrder,
  orderCode: number,
  customerCode: number,
  breakdownOverride?: OrderVatBreakdown,
  seriesOverride?: string
): string {
  const series = sanitizeAndTruncate(seriesOverride ?? order.series ?? ' ', 1);
  const ref = sanitizeAndTruncate(order.reference || order.orderNumber, 50);
  const orderDate = order.date ? new Date(order.date) : new Date();
  const fecpclFormatted = formatAccessDateOnly(orderDate);
  const horpclFormatted = formatAccessTimeOnly(orderDate);

  const shipAddr: CanonicalAddress = order.shippingAddress || order.billingAddress || order.customer?.address || { country: 'ES' };
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
  const customerEmail = sanitizeAndTruncate(shipAddr.email || order.customer?.email || '', 255);
  const nif = sanitizeAndTruncate(normalizeTaxId(order.customer?.taxId) || order.customer?.taxId || '', 18);
  const warehouse = sanitizeAndTruncate(order.warehouse || 'GEN', 3);
  const orderNotes = sanitizeAndTruncate(order.notes || '', 50);
  const paymentMethodCode = mapPaymentMethodToFactusol(order.paymentMethod);

  const breakdown = breakdownOverride || calculateOrderVatBreakdown(order);
  const hasReq = (order.customer?.hasEquivalenceSurcharge || order.hasEquivalenceSurcharge) ? 1 : 0;
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
      ${orderCode},
      '${ref}',
      ${fecpclFormatted},
      ${horpclFormatted},
      0,
      '724',
      0,
      ${customerCode},
      '${recipientName}',
      '${street}',
      '${postalCode}',
      '${city}',
      '${province}',
      '${nif}',
      '${phone}',
      '${customerEmail}',
      ${breakdown.tivpcl},
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
  const sanitizedSeries = sanitizeAndTruncate(series || ' ', 1);
  const sku = sanitizeAndTruncate(line.sku, 13);
  const name = sanitizeAndTruncate(line.name, 50);
  const longDesc = String(
    (line.rawSourceData as Record<string, unknown>)?.description ||
    (line as unknown as Record<string, unknown>).description ||
    line.name ||
    ''
  );
  const memo = sanitizeSql(longDesc);
  const qty = Number(line.quantity || 1).toFixed(2);
  const price = Number(line.unitPrice || 0).toFixed(4);
  const discount = Number(line.discountPercent || 0).toFixed(2);
  const total = Number(line.total ?? (Number(qty) * Number(price) * (1 - Number(discount) / 100))).toFixed(2);

  const { bracket, rate: vatRate } = getVatBracket(line);
  // PIVLPC = Precio con IVA incluido (PRELPC * (1 + vatRate/100))
  const priceWithVat = (Number(price) * (1 + vatRate / 100)).toFixed(4);
  // TIVLPC = Total línea con IVA incluido (TOTLPC * (1 + vatRate/100))
  const totalWithVat = (Number(total) * (1 + vatRate / 100)).toFixed(2);
  const linePos = line.position || position || 1;

  return `
    INSERT INTO F_LPC (
      TIPLPC, CODLPC, POSLPC, ARTLPC, DESLPC, CANLPC, DT1LPC, PRELPC, TOTLPC,
      PENLPC, IVALPC, MEMLPC, PIVLPC, TIVLPC
    ) VALUES (
      '${sanitizedSeries}',
      ${orderCode},
      ${linePos},
      '${sku}',
      '${name}',
      ${qty},
      ${discount},
      ${price},
      ${total},
      ${qty},
      ${bracket},
      '${memo}',
      ${priceWithVat},
      ${totalWithVat}
    )
  `.trim();
}

/**
 * Decremento atómico de stock en Access (F_STO)
 */
export function decrementStockQuery(sku: string, warehouse = 'GEN', quantity = 1): string {
  const safeSku = sanitizeAndTruncate(sku, 13);
  const safeWarehouse = sanitizeAndTruncate(warehouse || 'GEN', 3);
  const qty = Number(quantity || 1);
  return `UPDATE F_STO SET DISSTO = DISSTO - ${qty} WHERE ARTSTO = '${safeSku}' AND ALMSTO = '${safeWarehouse}'`;
}

/**
 * Reposición atómica de stock en Access (F_STO) para pedidos cancelados/reembolsados
 */
export function incrementStockQuery(sku: string, warehouse = 'GEN', quantity = 1): string {
  const safeSku = sanitizeAndTruncate(sku, 13);
  const safeWarehouse = sanitizeAndTruncate(warehouse || 'GEN', 3);
  const qty = Number(quantity || 1);
  return `UPDATE F_STO SET DISSTO = DISSTO + ${qty} WHERE ARTSTO = '${safeSku}' AND ALMSTO = '${safeWarehouse}'`;
}

export function updateOrderStatusQuery(orderCode: number, series = ' ', statusCode = 0): string {
  const sanitizedSeries = sanitizeAndTruncate(series || ' ', 1);
  return `
    UPDATE F_PCL
    SET ESTPCL = ${statusCode}
    WHERE CODPCL = ${orderCode} AND TIPPCL = '${sanitizedSeries}'
  `.trim();
}

export function readOrdersQuery(limit = 50): string {
  return `
    SELECT TOP ${limit} 
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
  const sanitizedSeries = sanitizeAndTruncate(series || ' ', 1);
  return `
    SELECT 
      TIPLPC, CODLPC, POSLPC, ARTLPC, DESLPC, CANLPC, DT1LPC, PRELPC, TOTLPC,
      PENLPC, IVALPC, MEMLPC, PIVLPC, TIVLPC
    FROM F_LPC
    WHERE CODLPC = ${orderCode} AND TIPLPC = '${sanitizedSeries}'
    ORDER BY POSLPC ASC
  `.trim();
}
