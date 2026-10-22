import { CanonicalAddress, CanonicalOrder, CanonicalOrderLine } from '@erp-bridge/shared';

export function sanitizeAndTruncate(val: unknown, maxLen: number): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
    .substring(0, maxLen)
    .replace(/'/g, "''");
}

export function sanitizeSql(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[\x00-\x1f\x7f]/g, '').trim().replace(/'/g, "''");
}

/**
 * Sanea un patrón para cláusulas LIKE de Access Jet escapando comodines (*, ?, #, [)
 * además de comillas simples y truncado de longitud.
 */
export function sanitizeLikePattern(val: unknown, maxLen: number): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
    .substring(0, maxLen)
    .replace(/\[/g, '[[]')
    .replace(/\*/g, '[*]')
    .replace(/\?/g, '[?]')
    .replace(/#/g, '[#]')
    .replace(/'/g, "''");
}

export function sanitizeInt(val: unknown, fallback = 0, min = -2147483648, max = 2147483647): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function sanitizeFloat(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export function formatAccessDate(date: Date): string {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `#${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}#`;
}

export function formatAccessDateOnly(date: Date): string {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `#${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}#`;
}

export function formatAccessTimeOnly(date: Date): string {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `#${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}#`;
}

export function normalizeTaxId(taxId?: string): string {
  if (!taxId) return '';
  const cleaned = String(taxId).replace(/[\s\-_.]/g, '').toUpperCase();
  if (cleaned.startsWith('ES') && cleaned.length > 2) {
    return cleaned.substring(2);
  }
  return cleaned;
}

const EU_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'GR', 'ES', 'FI',
  'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT',
  'RO', 'SE', 'SI', 'SK',
]);

export function determineTivpcl(order: CanonicalOrder): number {
  const shipAddr: CanonicalAddress =
    order.shippingAddress || order.billingAddress || order.customer?.address || { country: 'ES' };
  const country = (shipAddr.country || order.customer?.address?.country || 'ES').trim().toUpperCase();
  const postalCode = (shipAddr.postalCode || order.customer?.address?.postalCode || '').trim();

  if (country === 'ES' || country === 'ESP' || country === '724' || country === 'ESPAÑA' || country === 'ESPANA') {
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

  if (EU_COUNTRY_CODES.has(country)) {
    const taxId = (order.customer?.taxId || '').trim();
    if (taxId && !taxId.startsWith('ES') && taxId.length > 8) {
      return 2;
    }
    return 0;
  }

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

export function calculateOrderVatBreakdown(order: CanonicalOrder): OrderVatBreakdown {
  const tivpcl = determineTivpcl(order);
  const isVatExempt = tivpcl === 2 || tivpcl === 3;
  const hasReq = Boolean(order.customer?.hasEquivalenceSurcharge || order.hasEquivalenceSurcharge);

  let net1 = 0, net2 = 0, net3 = 0, net4 = 0;

  if (order.lines && order.lines.length > 0) {
    for (const line of order.lines) {
      const qty = sanitizeFloat(line.quantity, 1);
      const price = sanitizeFloat(line.unitPrice, 0);
      const discount = sanitizeFloat(line.discountPercent, 0);
      const lineNet =
        typeof line.total === 'number' && Number.isFinite(line.total)
          ? line.total
          : qty * price * (1 - discount / 100);
      const { bracket } = getVatBracket(line);
      if (bracket === 0) net1 += lineNet;
      else if (bracket === 1) net2 += lineNet;
      else if (bracket === 2) net3 += lineNet;
      else net4 += lineNet;
    }
  } else if (order.netAmount) {
    net1 = Number(sanitizeFloat(order.netAmount, 0).toFixed(2));
  }

  net1 = Number(net1.toFixed(2));
  net2 = Number(net2.toFixed(2));
  net3 = Number(net3.toFixed(2));
  net4 = Number(net4.toFixed(2));

  const discountAmount = sanitizeFloat(order.discountAmount, 0);
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

  let shipping = Number(sanitizeFloat(order.shippingAmount, 0).toFixed(2));
  let bas1 = net1, bas2 = net2, bas3 = net3, bas4 = net4;

  if (shipping > 0) {
    if (net1 > 0 || (net2 === 0 && net3 === 0 && net4 === 0)) bas1 = Number((net1 + shipping).toFixed(2));
    else if (net2 >= net3 && net2 >= net4 && net2 > 0) bas2 = Number((net2 + shipping).toFixed(2));
    else if (net3 >= net2 && net3 >= net4 && net3 > 0) bas3 = Number((net3 + shipping).toFixed(2));
    else if (net4 > 0) bas4 = Number((net4 + shipping).toFixed(2));
    else bas1 = Number((net1 + shipping).toFixed(2));
  }

  let iiva1 = isVatExempt ? 0 : Number((bas1 * 0.21).toFixed(2));
  let irec1 = isVatExempt || !hasReq ? 0 : Number((bas1 * 0.052).toFixed(2));
  let iiva2 = isVatExempt ? 0 : Number((bas2 * 0.1).toFixed(2));
  let irec2 = isVatExempt || !hasReq ? 0 : Number((bas2 * 0.014).toFixed(2));
  let iiva3 = isVatExempt ? 0 : Number((bas3 * 0.04).toFixed(2));
  let irec3 = isVatExempt || !hasReq ? 0 : Number((bas3 * 0.005).toFixed(2));

  let factusolTotal = Number((bas1 + iiva1 + irec1 + bas2 + iiva2 + irec2 + bas3 + iiva3 + irec3 + bas4).toFixed(2));
  const targetTotal = Number(sanitizeFloat(order.totalAmount, 0).toFixed(2));

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
          iiva2 = Number((bas2 * 0.1).toFixed(2));
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
    net1, bas1, piva1: 21.0, iiva1, prec1: 5.2, irec1,
    net2, bas2, piva2: 10.0, iiva2, prec2: 1.4, irec2,
    net3, bas3, piva3: 4.0, iiva3, prec3: 0.5, irec3,
    net4, bas4, shipping,
    total: targetTotal > 0 ? targetTotal : factusolTotal,
    tivpcl,
  };
}
