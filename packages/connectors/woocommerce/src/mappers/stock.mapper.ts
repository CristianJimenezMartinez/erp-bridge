import { CanonicalStock } from '@erp-bridge/shared';

export interface WooCommerceStockPayload {
  id?: number;
  sku?: string;
  manage_stock: boolean;
  stock_quantity: number;
  in_stock: boolean;
}

export class WooCommerceStockMapper {
  public static mapToPayload(
    stock: CanonicalStock,
    externalId?: number
  ): WooCommerceStockPayload {
    const qty = Math.max(0, stock.availableQuantity ?? stock.quantity ?? 0);
    return {
      ...(externalId ? { id: externalId } : {}),
      sku: stock.sku,
      manage_stock: true,
      stock_quantity: qty,
      in_stock: qty > 0,
    };
  }
}
