import { CanonicalStock } from '@erp-bridge/shared';
import { PrestaShopStockAvailable } from '../types';

export class PrestaShopStockMapper {
  public static toPsStockPayload(
    idStockAvailable: number | string,
    idProduct: number | string,
    idProductAttribute: number | string,
    quantity: number
  ): Record<string, unknown> {
    return {
      id: Number(idStockAvailable),
      id_product: Number(idProduct),
      id_product_attribute: Number(idProductAttribute),
      quantity: Number.isFinite(quantity) ? Math.floor(quantity) : 0,
      depends_on_stock: 0,
      out_of_stock: 2, // Permite pedidos según configuración global o denegar según tienda
    };
  }

  public static toCanonicalStock(raw: PrestaShopStockAvailable, sku = ''): CanonicalStock {
    const parsed = parseInt(String(raw.quantity ?? 0), 10);
    const qty = Number.isFinite(parsed) ? parsed : 0;
    return {
      sku: sku || `STOCK-P${raw.id_product}-A${raw.id_product_attribute}`,
      quantity: qty,
      availableQuantity: Math.max(0, qty),
      warehouse: 'GEN',
      lastUpdated: new Date(),
      rawSourceData: raw as unknown as Record<string, unknown>,
    };
  }
}
