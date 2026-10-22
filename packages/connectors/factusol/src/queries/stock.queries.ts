import { sanitizeInt, sanitizeSql } from './order.queries';
import { ReadStockOptions } from '@erp-bridge/sdk';

export function readStockQuery(options?: ReadStockOptions): string {
  const warehouse = options?.warehouse ? sanitizeSql(options.warehouse) : undefined;
  const safeLimit = options?.limit && Number(options.limit) > 0 ? sanitizeInt(options.limit, 0, 1, 100000) : 0;
  const limitClause = safeLimit > 0 ? `TOP ${safeLimit} ` : '';

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
