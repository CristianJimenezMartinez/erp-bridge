import { CanonicalAddress, CanonicalCustomer } from '@erp-bridge/shared';
import { sanitizeSql, formatAccessDate, normalizeTaxId } from './order.queries';

export function getNextCustomerIdQuery(): string {
  return `SELECT MAX(CODCLI) AS maxid FROM F_CLI`;
}

export function findCustomerByNifQuery(nif: string): string {
  const clean = normalizeTaxId(nif);
  const withEs = `ES${clean}`;
  return `SELECT * FROM F_CLI WHERE NIFCLI = '${sanitizeSql(clean)}' OR NIFCLI = '${sanitizeSql(withEs)}'`;
}

export function findCustomerByEmailQuery(email: string): string {
  return `SELECT * FROM F_CLI WHERE EMACLI = '${sanitizeSql(email)}' OR OBSCLI LIKE '%${sanitizeSql(email)}%'`;
}

export function insertCustomerQuery(
  customer: CanonicalCustomer,
  customerCode: number,
  configuredPaymentMethod = 'TRF'
): string {
  const addr: CanonicalAddress = customer.address || { country: 'ES' };
  const nofcli = sanitizeSql(customer.fiscalName).substring(0, 100);
  const noccli = sanitizeSql(customer.commercialName || customer.fiscalName).substring(0, 100);
  const nifcli = sanitizeSql(normalizeTaxId(customer.taxId) || customer.taxId || '').substring(0, 18);
  const domcli = sanitizeSql(addr.street || '').substring(0, 100);
  const pobcli = sanitizeSql(addr.city || '').substring(0, 30);
  const cpocli = sanitizeSql(addr.postalCode || '').substring(0, 10);
  const procli = sanitizeSql(addr.state || '').substring(0, 40);
  const telcli = sanitizeSql(customer.phone || addr.phone || '').substring(0, 50);
  const email = sanitizeSql(customer.email || '').substring(0, 100);
  const tarcli = customer.priceList ?? 1;
  const falcli = formatAccessDate(new Date());
  const paicli = '724';
  const reqcli = customer.hasEquivalenceSurcharge ? 1 : 0;
  const ivacli = 0;
  const fpacli = sanitizeSql(customer.paymentMethod || configuredPaymentMethod || 'TRF').substring(0, 3).toUpperCase();
  const estcli = 0;

  return `
    INSERT INTO F_CLI (
      CODCLI, NOFCLI, NOCCLI, NIFCLI, DOMCLI, POBCLI, CPOCLI, PROCLI, PAICLI, TELCLI, TARCLI, EMACLI, OBSCLI, REQCLI, IVACLI, FPACLI, ESTCLI, FALCLI
    ) VALUES (
      ${customerCode},
      '${nofcli}',
      '${noccli}',
      '${nifcli}',
      '${domcli}',
      '${pobcli}',
      '${cpocli}',
      '${procli}',
      '${paicli}',
      '${telcli}',
      ${tarcli},
      '${email}',
      '${email}',
      ${reqcli},
      ${ivacli},
      '${fpacli}',
      ${estcli},
      ${falcli}
    )
  `.trim();
}
