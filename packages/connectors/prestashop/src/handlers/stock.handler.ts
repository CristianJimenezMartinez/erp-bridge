import {
  BatchStockUpdateResult,
  StockMutationResult,
  ReadStockOptions,
  ConnectionError,
  ErrorCode,
} from '@erp-bridge/sdk';
import { CanonicalStock, Logger } from '@erp-bridge/shared';
import { PrestaShopClient } from '../client';
import { PrestaShopStockAvailable } from '../types';
import { PrestaShopStockMapper } from '../mappers';
import { StockMappingCache, StockMappingEntry } from './stock-cache';

export class PrestaShopStockHandler {
  public readonly cache = new StockMappingCache();

  constructor(
    private readonly client: PrestaShopClient,
    private readonly logger: Logger
  ) {}

  public async readStock(options?: ReadStockOptions): Promise<CanonicalStock[]> {
    const params: Record<string, unknown> = { display: 'full' };
    if (options?.limit) {
      params['limit'] = `${options.offset || 0},${options.limit}`;
    }
    const response = await this.client.get<{ stock_availables?: PrestaShopStockAvailable[] }>('stock_availables', params);
    const list = response.stock_availables || [];
    return list.map((item) => PrestaShopStockMapper.toCanonicalStock(item));
  }

  public async updateStock(sku: string, quantity: number, targetIdentifier?: string): Promise<StockMutationResult> {
    try {
      const mapping = await this.resolveStockMapping(sku, targetIdentifier);
      const payload = PrestaShopStockMapper.toPsStockPayload(
        mapping.idStockAvailable,
        mapping.idProduct,
        mapping.idProductAttribute,
        quantity
      );

      await this.client.put(`stock_availables/${mapping.idStockAvailable}`, payload);

      if (mapping.idProductAttribute > 0) {
        this.logger.info(`PrestaShop recalc: Stock combinacion SKU ${sku} (attr ${mapping.idProductAttribute}) actualizado. Padre ${mapping.idProduct} recalculado.`);
      }

      return {
        success: true,
        sku,
        externalId: String(mapping.idStockAvailable),
        stockQuantity: quantity,
        inStock: quantity > 0,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo al actualizar stock en PrestaShop para SKU ${sku}`, error);
      return { success: false, sku, externalId: targetIdentifier, stockQuantity: quantity, inStock: quantity > 0, error: msg };
    }
  }

  public async batchUpdateStock(
    stockUpdates: CanonicalStock[],
    existingMappings?: Map<string, string>
  ): Promise<BatchStockUpdateResult> {
    // Intento con micro-modulo acelerador erpbridge_sync si esta disponible
    try {
      const fastItems = stockUpdates.map((s) => ({
        id_stock_available: existingMappings?.get(s.sku) || this.cache.getBySku(s.sku)?.idStockAvailable,
        quantity: s.quantity,
      })).filter((item) => item.id_stock_available !== undefined);

      if (fastItems.length === stockUpdates.length && fastItems.length > 0) {
        const response = await this.client.postModule<{ success: boolean; updated: number }>(
          'module/erpbridge_sync/batch_stock',
          { stocks: fastItems }
        );
        if (response?.success) {
          return {
            total: stockUpdates.length,
            succeeded: response.updated || stockUpdates.length,
            failed: 0,
            items: stockUpdates.map((s) => ({ sku: s.sku, success: true, externalId: String(existingMappings?.get(s.sku)) })),
          };
        }
      }
    } catch {
      this.logger.debug('Micro-modulo acelerador no disponible, ejecutando fallback WebService nativo p-limit(6)');
    }

    // Fallback concurrente WebService oficial con lotes de 6
    const itemResults: Array<{ sku: string; success: boolean; externalId?: string; error?: string }> = [];
    const concurrency = 6;
    for (let i = 0; i < stockUpdates.length; i += concurrency) {
      const chunk = stockUpdates.slice(i, i + concurrency);
      const promises = chunk.map(async (item) => {
        const targetId = existingMappings?.get(item.sku);
        const res = await this.updateStock(item.sku, item.quantity, targetId);
        return { sku: item.sku, success: res.success, externalId: res.externalId, error: res.error };
      });
      const results = await Promise.all(promises);
      itemResults.push(...results);
    }

    const succeeded = itemResults.filter((r) => r.success).length;
    return { total: stockUpdates.length, succeeded, failed: stockUpdates.length - succeeded, items: itemResults };
  }

  public async resolveStockMapping(sku: string, targetIdentifier?: string): Promise<StockMappingEntry> {
    if (targetIdentifier) {
      const idStock = parseInt(targetIdentifier, 10);
      const cached = this.cache.getBySku(sku);
      if (cached) return cached;
      return { sku, idProduct: 0, idProductAttribute: 0, idStockAvailable: idStock };
    }

    const cached = this.cache.getBySku(sku);
    if (cached) return cached;

    // Buscar producto por referencia (SKU)
    const res = await this.client.get<{ products?: Array<{ id: number }> }>('products', {
      'filter[reference]': `[${sku}]`,
      display: '[id]',
    });

    const prod = res.products?.[0];
    if (!prod) {
      throw new ConnectionError(ErrorCode.ENTITY_NOT_FOUND, `No se localizo producto en PrestaShop con referencia: ${sku}`);
    }

    // Buscar stock_available asociado
    const stockRes = await this.client.get<{ stock_availables?: PrestaShopStockAvailable[] }>('stock_availables', {
      'filter[id_product]': `[${prod.id}]`,
      display: 'full',
    });

    const primaryStock = stockRes.stock_availables?.[0];
    if (!primaryStock) {
      throw new ConnectionError(ErrorCode.ENTITY_NOT_FOUND, `No existe registro de ps_stock_available para producto ID ${prod.id}`);
    }

    const entry: StockMappingEntry = {
      sku,
      idProduct: Number(prod.id),
      idProductAttribute: Number(primaryStock.id_product_attribute || 0),
      idStockAvailable: Number(primaryStock.id),
    };
    this.cache.set(entry);
    return entry;
  }
}
