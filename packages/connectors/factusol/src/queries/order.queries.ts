import { CanonicalAddress, CanonicalCustomer, CanonicalOrder, CanonicalOrderLine } from '@erp-bridge/shared';

export function sanitizeSql(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/'/g, "''").trim();
}

export function formatAccessDate(date: Date): string {
  // Format as #YYYY-MM-DD HH:MM:SS# or #MM/DD/YYYY HH:MM:SS#
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  const secs = pad(date.getSeconds());
  return `#${year}-${month}-${day} ${hours}:${mins}:${secs}#`;
}

export function getNextOrderIdQuery(series = ''): string {
  const sanitizedSeries = sanitizeSql(series);
  if (sanitizedSeries) {
    return `SELECT MAX(CODPCL) AS maxid FROM F_PCL WHERE TIPPCL = '${sanitizedSeries}'`;
  }
  return `SELECT MAX(CODPCL) AS maxid FROM F_PCL`;
}

export function getNextCustomerIdQuery(): string {
  return `SELECT MAX(CODCLI) AS maxid FROM F_CLI`;
}

export function findCustomerByNifQuery(nif: string): string {
  return `SELECT * FROM F_CLI WHERE NIFCLI = '${sanitizeSql(nif)}'`;
}

export function findCustomerByEmailQuery(email: string): string {
  return `SELECT * FROM F_CLI WHERE EMACLI = '${sanitizeSql(email)}' OR OBSCLI LIKE '%${sanitizeSql(email)}%'`;
}

export function findOrderByReferenceQuery(ref: string): string {
  return `SELECT * FROM F_PCL WHERE REFPCL = '${sanitizeSql(ref)}'`;
}

export function insertCustomerQuery(customer: CanonicalCustomer, customerCode: number): string {
  const addr: CanonicalAddress = customer.address || { country: 'ES' };
  const nofcli = sanitizeSql(customer.fiscalName).substring(0, 100);
  const noccli = sanitizeSql(customer.commercialName || customer.fiscalName).substring(0, 100);
  const nifcli = sanitizeSql(customer.taxId || '').substring(0, 18);
  const domcli = sanitizeSql(addr.street || '').substring(0, 100);
  const pobcli = sanitizeSql(addr.city || '').substring(0, 30);
  const cpocli = sanitizeSql(addr.postalCode || '').substring(0, 10);
  const procli = sanitizeSql(addr.state || '').substring(0, 40);
  const telcli = sanitizeSql(customer.phone || addr.phone || '').substring(0, 50);
  const email = sanitizeSql(customer.email || '').substring(0, 100);
  const tarcli = customer.priceList ?? 1;

  return `
    INSERT INTO F_CLI (
      CODCLI, NOFCLI, NOCCLI, NIFCLI, DOMCLI, POBCLI, CPOCLI, PROCLI, TELCLI, TARCLI, EMACLI, OBSCLI
    ) VALUES (
      ${customerCode},
      '${nofcli}',
      '${noccli}',
      '${nifcli}',
      '${domcli}',
      '${pobcli}',
      '${cpocli}',
      '${procli}',
      '${telcli}',
      ${tarcli},
      '${email}',
      '${email}'
    )
  `.trim();
}

export function insertOrderHeaderQuery(
  order: CanonicalOrder,
  orderCode: number,
  customerCode: number
): string {
  const series = sanitizeSql(order.series || ' ');
  const ref = sanitizeSql(order.reference || order.orderNumber).substring(0, 50);
  const dateFormatted = formatAccessDate(order.date || new Date());
  
  const shipAddr: CanonicalAddress = order.shippingAddress || order.billingAddress || order.customer.address || { country: 'ES' };
  const recipientName = sanitizeSql(
    [shipAddr.firstName, shipAddr.lastName].filter(Boolean).join(' ') ||
    order.customer.fiscalName ||
    ''
  ).substring(0, 100);
  
  const street = sanitizeSql(shipAddr.street || '').substring(0, 100);
  const city = sanitizeSql(shipAddr.city || '').substring(0, 30);
  const postalCode = sanitizeSql(shipAddr.postalCode || '').substring(0, 10);
  const province = sanitizeSql(shipAddr.state || '').substring(0, 40);
  const phone = sanitizeSql(shipAddr.phone || order.customer.phone || '').substring(0, 50);
  const nif = sanitizeSql(order.customer.taxId || '').substring(0, 18);
  const warehouse = sanitizeSql(order.warehouse || 'GEN').substring(0, 3);

  const netAmount = Number(order.netAmount || 0).toFixed(2);
  const taxAmount = Number(order.taxAmount || 0).toFixed(2);
  const shippingAmount = Number(order.shippingAmount || 0).toFixed(2);
  const totalAmount = Number(order.totalAmount || 0).toFixed(2);

  return `
    INSERT INTO F_PCL (
      TIPPCL, CODPCL, REFPCL, FECPCL, AGEPCL, CLIPCL,
      CNOPCL, CDOPCL, CPOPCL, CCPPCL, CPRPCL, CNIPCL,
      TELPCL, TIVPCL, REQPCL, ESTPCL, ALMPCL,
      NET1PCL, PIVA1PCL, PIVA2PCL, PIVA3PCL, IIVA1PCL, IPOR1PCL, TOTPCL
    ) VALUES (
      '${series}',
      ${orderCode},
      '${ref}',
      ${dateFormatted},
      0,
      ${customerCode},
      '${recipientName}',
      '${street}',
      '${city}',
      '${postalCode}',
      '${province}',
      '${nif}',
      '${phone}',
      0,
      0,
      0,
      '${warehouse}',
      ${netAmount},
      21.00,
      10.00,
      4.00,
      ${taxAmount},
      ${shippingAmount},
      ${totalAmount}
    )
  `.trim();
}

export function insertOrderLineQuery(
  line: CanonicalOrderLine,
  orderCode: number,
  series = ' '
): string {
  const sanitizedSeries = sanitizeSql(series || ' ');
  const sku = sanitizeSql(line.sku).substring(0, 13);
  const name = sanitizeSql(line.name).substring(0, 50);
  const qty = Number(line.quantity || 1).toFixed(2);
  const price = Number(line.unitPrice || 0).toFixed(4);
  const discount = Number(line.discountPercent || 0).toFixed(2);
  const total = Number(line.total || (Number(qty) * Number(price))).toFixed(2);
  const vatType = line.vatType ?? 0;

  return `
    INSERT INTO F_LPC (
      TIPLPC, CODLPC, POSLPC, ARTLPC, DESLPC, CANLPC, DT1LPC, IVALPC, PRELPC, TOTLPC
    ) VALUES (
      '${sanitizedSeries}',
      ${orderCode},
      ${line.position},
      '${sku}',
      '${name}',
      ${qty},
      ${discount},
      ${vatType},
      ${price},
      ${total}
    )
  `.trim();
}

export function updateOrderStatusQuery(orderCode: number, series = ' ', statusCode = 0): string {
  const sanitizedSeries = sanitizeSql(series || ' ');
  return `
    UPDATE F_PCL
    SET ESTPCL = ${statusCode}
    WHERE CODPCL = ${orderCode} AND TIPPCL = '${sanitizedSeries}'
  `.trim();
}

export function readOrdersQuery(limit = 50): string {
  return `
    SELECT TOP ${limit} 
      TIPPCL, CODPCL, REFPCL, FECPCL, AGEPCL, CLIPCL,
      CNOPCL, CDOPCL, CPOPCL, CCPPCL, CPRPCL, CNIPCL,
      TELPCL, TIVPCL, REQPCL, ESTPCL, ALMPCL,
      NET1PCL, IIVA1PCL, IPOR1PCL, TOTPCL
    FROM F_PCL
    ORDER BY FECPCL DESC, CODPCL DESC
  `.trim();
}

export function readOrderLinesQuery(orderCode: number, series = ' '): string {
  const sanitizedSeries = sanitizeSql(series || ' ');
  return `
    SELECT 
      TIPLPC, CODLPC, POSLPC, ARTLPC, DESLPC, CANLPC, DT1LPC, IVALPC, PRELPC, TOTLPC
    FROM F_LPC
    WHERE CODLPC = ${orderCode} AND TIPLPC = '${sanitizedSeries}'
    ORDER BY POSLPC ASC
  `.trim();
}
