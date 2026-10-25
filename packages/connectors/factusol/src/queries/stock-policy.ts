import { sanitizeAndTruncate } from './order-vat.queries';

/**
 * POLÍTICA ÚNICA DE STOCK DE FACTUSOL (F2/F13)
 *
 * Catálogo, stock reactivo, vista previa y cualquier fallback usan exactamente esta regla:
 *  - Si NO hay `warehouseCode` configurado, o es vacío / 'GEN' (valor por defecto histórico),
 *    se suma `DISSTO` de TODOS los almacenes del artículo.
 *  - Si hay un `warehouseCode` distinto de 'GEN', se suma ÚNICAMENTE `DISSTO` de ese almacén
 *    (sin ningún `OR 'GEN'` implícito).
 */
export const DEFAULT_WAREHOUSE_CODE = 'GEN';

/**
 * Devuelve el código de almacén (saneado) que acota el stock, o `null` si debe sumarse todo.
 */
export function resolveStockWarehouse(warehouseCode?: string | null): string | null {
  const raw = String(warehouseCode ?? '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
  if (!raw || raw.toUpperCase() === DEFAULT_WAREHOUSE_CODE) return null;
  return raw.substring(0, 10);
}

/**
 * Consulta de stock agregado (SUM(DISSTO) por artículo) según la política única.
 */
export function buildStockSumQuery(warehouseCode?: string | null, skus?: string[]): string {
  const warehouse = resolveStockWarehouse(warehouseCode);
  const conditions: string[] = [];
  if (warehouse) conditions.push(`ALMSTO = '${sanitizeAndTruncate(warehouse, 10)}'`);
  if (skus && skus.length > 0) {
    conditions.push(`ARTSTO IN (${skus.map((s) => `'${sanitizeAndTruncate(s, 13)}'`).join(', ')})`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return `SELECT ARTSTO, SUM(DISSTO) AS totalStock FROM F_STO ${where} GROUP BY ARTSTO`.replace(/\s+/g, ' ').trim();
}

/**
 * Normaliza una cantidad de stock a entero no negativo (misma regla para catálogo y stock reactivo).
 */
export function normalizeStockQuantity(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}
