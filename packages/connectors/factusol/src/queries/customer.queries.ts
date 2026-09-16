import { CanonicalAddress, CanonicalCustomer } from '@erp-bridge/shared';
import { formatAccessDate, normalizeTaxId, sanitizeAndTruncate } from './order.queries';

export { sanitizeAndTruncate };

export function getNextCustomerIdQuery(): string {
  return `SELECT MAX(CODCLI) AS maxid FROM F_CLI`;
}

export function findCustomerByNifQuery(nif: string): string {
  const clean = normalizeTaxId(nif);
  const withEs = `ES${clean}`;
  return `SELECT * FROM F_CLI WHERE NIFCLI = '${sanitizeAndTruncate(clean, 18)}' OR NIFCLI = '${sanitizeAndTruncate(withEs, 18)}'`;
}

export function findCustomerByEmailQuery(email: string): string {
  return `SELECT * FROM F_CLI WHERE EMACLI = '${sanitizeAndTruncate(email, 100)}' OR OBSCLI LIKE '%${sanitizeAndTruncate(email, 100)}%'`;
}

export function insertCustomerQuery(
  customer: CanonicalCustomer,
  customerCode: number,
  configuredPaymentMethod = 'TRF'
): string {
  const addr: CanonicalAddress = customer.address || { country: 'ES' };
  const nofcli = sanitizeAndTruncate(customer.fiscalName, 100);
  const noccli = sanitizeAndTruncate(customer.commercialName || customer.fiscalName, 100);
  const nifcli = sanitizeAndTruncate(normalizeTaxId(customer.taxId) || customer.taxId || '', 18);
  const domcli = sanitizeAndTruncate(addr.street || '', 100);
  const pobcli = sanitizeAndTruncate(addr.city || '', 30);
  const cpocli = sanitizeAndTruncate(addr.postalCode || '', 10);
  const procli = sanitizeAndTruncate(addr.state || '', 40);
  const telcli = sanitizeAndTruncate(customer.phone || addr.phone || '', 50);
  const email = sanitizeAndTruncate(customer.email || '', 100);
  const tarcli = customer.priceList ?? 1;
  const falcli = formatAccessDate(new Date());
  const paicli = '724';
  const reqcli = customer.hasEquivalenceSurcharge ? 1 : 0;
  const ivacli = 0;
  const fpacli = sanitizeAndTruncate(customer.paymentMethod || configuredPaymentMethod || 'TRF', 3).toUpperCase();
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
