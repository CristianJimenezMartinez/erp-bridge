import { CanonicalCustomer, CanonicalAddress } from '@erp-bridge/shared';
import { sanitizeSql } from './article.queries';

export function getCustomersQuery(limit?: number): string {
  const topClause = limit && limit > 0 ? `TOP ${limit}` : '';
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
  const name = sanitizeSql(customer.fiscalName).substring(0, 100);
  const cif = sanitizeSql(customer.taxId || '').substring(0, 20);
  const dir = sanitizeSql(addr.street || '').substring(0, 100);
  const cp = sanitizeSql(addr.postalCode || '').substring(0, 10);
  const pob = sanitizeSql(addr.city || '').substring(0, 50);
  const prov = sanitizeSql(addr.state || '').substring(0, 50);
  const email = sanitizeSql(customer.email || '').substring(0, 100);
  const tel = sanitizeSql(customer.phone || addr.phone || '').substring(0, 30);

  return `
    INSERT INTO CLIENTES (
      CODIGO, NOMBRE, CIF, DIRECCION, CP, POBLACION, PROVINCIA, EMAIL, TELEFONO
    ) VALUES (
      '${sanitizeSql(nextCode)}',
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
