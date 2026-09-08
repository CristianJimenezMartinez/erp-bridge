export function sanitizeSql(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/'/g, "''").trim();
}

export function getArticlesQuery(limit?: number): string {
  const topClause = limit && limit > 0 ? `TOP ${limit}` : '';
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
  return `
    UPDATE ARTICULOS
    SET STOCK = ${Number(newStock || 0).toFixed(4)}
    WHERE CODIGO = '${sanitizeSql(sku)}'
  `.trim();
}
