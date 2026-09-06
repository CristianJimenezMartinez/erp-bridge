import { CanonicalStock } from '@erp-bridge/shared';

export interface FactusolStockRaw {
  ARTSTO: string;
  ALMSTO?: string;
  ACTSTO?: number;
  MINSTO?: number;
  DISSTO?: number;
}

export class FactusolStockMapper {
  public static toCanonicalStock(raw: FactusolStockRaw): CanonicalStock {
    const sku = String(raw.ARTSTO ?? '').trim();
    const warehouse = String(raw.ALMSTO ?? 'GEN').trim();
    const quantity = Number(raw.ACTSTO) || 0;
    const minStock = raw.MINSTO !== undefined && raw.MINSTO !== null ? Number(raw.MINSTO) : undefined;
    const availableQuantity = raw.DISSTO !== undefined && raw.DISSTO !== null ? Number(raw.DISSTO) : quantity;

    return {
      sku,
      quantity,
      availableQuantity,
      warehouse,
      minStock,
      lastUpdated: new Date(),
      rawSourceData: raw as unknown as Record<string, unknown>,
    };
  }
}
