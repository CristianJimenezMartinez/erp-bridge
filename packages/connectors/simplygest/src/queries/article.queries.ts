export function sanitizeSql(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/'/g, "''").trim();
}

export function getArticlesQuery(limit?: number): string {
  const safeLimit = limit && !isNaN(Number(limit)) ? Math.max(1, Math.min(50000, Math.floor(Number(limit)))) : undefined;
  const topClause = safeLimit ? `TOP ${safeLimit}` : '';
  return `
    SELECT ${topClause}
      CODIGO, DESCR, DESCR_LARGA, PRECIO_E, PRECIO_C, STOCK, IMPUESTO, FAMILIA, CODBARRAS
    FROM ARTICULOS
    WHERE CODIGO IS NOT NULL AND CODIGO <> ''
    ORDER BY CODIGO ASC
  `.trim();
}

export function getArticleBySkuQuery(sku: string): string {
  return `
    SELECT 
      CODIGO, DESCR, DESCR_LARGA, PRECIO_E, PRECIO_C, STOCK, IMPUESTO, FAMILIA, CODBARRAS
    FROM ARTICULOS
    WHERE CODIGO = '${sanitizeSql(sku)}'
  `.trim();
}

export function updateStockQuery(sku: string, newStock: number): string {
  const safeQty = !isNaN(Number(newStock)) ? Number(newStock).toFixed(4) : '0.0000';
  return `
    UPDATE ARTICULOS
    SET STOCK = ${safeQty}
    WHERE CODIGO = '${sanitizeSql(sku)}'
  `.trim();
}
