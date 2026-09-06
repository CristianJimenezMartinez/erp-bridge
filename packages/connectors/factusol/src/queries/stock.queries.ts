import { sanitizeSql } from './order.queries';
import { ReadStockOptions } from '@erp-bridge/sdk';

export function readStockQuery(options?: ReadStockOptions): string {
  const warehouse = options?.warehouse ? sanitizeSql(options.warehouse) : undefined;
  const limitClause = options?.limit && options.limit > 0 ? `TOP ${options.limit} ` : '';

  let whereClause = '';
  if (warehouse) {
    whereClause = `WHERE ALMSTO = '${warehouse}'`;
  }

  return `
    SELECT ${limitClause}
      ARTSTO, ALMSTO, ACTSTO, MINSTO, DISSTO
    FROM F_STO
    ${whereClause}
    ORDER BY ARTSTO ASC
  `.trim();
}

export function readStockBySkusQuery(skus: string[], warehouse?: string): string {
  if (skus.length === 0) {
    return 'SELECT ARTSTO, ALMSTO, ACTSTO, MINSTO, DISSTO FROM F_STO WHERE 1=0';
  }

  const sanitizedSkus = skus.map((s) => `'${sanitizeSql(s)}'`).join(', ');
  let where = `ARTSTO IN (${sanitizedSkus})`;
  if (warehouse) {
    where += ` AND ALMSTO = '${sanitizeSql(warehouse)}'`;
  }

  return `
    SELECT 
      ARTSTO, ALMSTO, ACTSTO, MINSTO, DISSTO
    FROM F_STO
    WHERE ${where}
    ORDER BY ARTSTO ASC
  `.trim();
}
