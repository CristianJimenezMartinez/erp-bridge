import { CanonicalCustomer, CanonicalAddress } from '@erp-bridge/shared';
import { sanitizeSql } from './article.queries';

export function getCustomersQuery(limit?: number): string {
  const safeLimit = limit && !isNaN(Number(limit)) ? Math.max(1, Math.min(50000, Math.floor(Number(limit)))) : undefined;
  const topClause = safeLimit ? `TOP ${safeLimit}` : '';
  return `
    SELECT ${topClause}
      CODIGO, NOMBRE, CIF, DIRECCION, CP, POBLACION, PROVINCIA, EMAIL, TELEFONO
    FROM CLIENTES
    ORDER BY CODIGO ASC
  `.trim();
}

export function findCustomerByCifQuery(cif: string): string {
  return `
    SELECT 
      CODIGO, NOMBRE, CIF, DIRECCION, CP, POBLACION, PROVINCIA, EMAIL, TELEFONO
    FROM CLIENTES
    WHERE CIF = '${sanitizeSql(cif)}'
  `.trim();
}

export function findCustomerByEmailQuery(email: string): string {
  return `
    SELECT 
      CODIGO, NOMBRE, CIF, DIRECCION, CP, POBLACION, PROVINCIA, EMAIL, TELEFONO
    FROM CLIENTES
    WHERE EMAIL = '${sanitizeSql(email)}'
  `.trim();
}

export function insertCustomerQuery(customer: CanonicalCustomer, nextCode: string): string {
  const addr: CanonicalAddress = customer.address || { country: 'ES' };
  const name = sanitizeSql(customer.fiscalName, 100);
  const cif = sanitizeSql(customer.taxId || '', 20);
  const dir = sanitizeSql(addr.street || '', 100);
  const cp = sanitizeSql(addr.postalCode || '', 10);
  const pob = sanitizeSql(addr.city || '', 50);
  const prov = sanitizeSql(addr.state || '', 50);
  const email = sanitizeSql(customer.email || '', 100);
  const tel = sanitizeSql(customer.phone || addr.phone || '', 30);

  return `
    INSERT INTO CLIENTES (
      CODIGO, NOMBRE, CIF, DIRECCION, CP, POBLACION, PROVINCIA, EMAIL, TELEFONO
    ) VALUES (
      '${sanitizeSql(nextCode, 20)}',
      '${name}',
      '${cif}',
      '${dir}',
      '${cp}',
      '${pob}',
      '${prov}',
      '${email}',
      '${tel}'
    )
  `.trim();
}
