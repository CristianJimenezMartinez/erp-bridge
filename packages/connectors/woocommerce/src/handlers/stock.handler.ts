import {
  BatchStockUpdateResult,
  StockMutationResult,
  ConnectionError,
  ErrorCode,
} from '@erp-bridge/sdk';
import { CanonicalStock, Logger } from '@erp-bridge/shared';
import { WooCommerceClient } from '../client';
import { WooCommerceStockMapper } from '../mappers';
import { BatchThrottler } from './throttler';

export class WooCommerceStockHandler {
  constructor(
    private readonly client: WooCommerceClient,
    private readonly logger: Logger
  ) {}

  public async updateStock(
    sku: string,
    quantity: number,
    targetIdentifier?: string
  ): Promise<StockMutationResult> {
    if (!targetIdentifier) {
      throw new ConnectionError(
        ErrorCode.VALIDATION_ERROR,
        `Se requiere el ID externo de WooCommerce para actualizar el stock SKU: ${sku}`
      );
    }

    try {
      const numericId = parseInt(targetIdentifier, 10);
      const payload = {
        manage_stock: true,
        stock_quantity: quantity,
        in_stock: quantity > 0,
      };

      const response = await this.client.put<{ id: number; stock_quantity: number }>(
        `products/${numericId}`,
        payload
      );

      this.logger.info(`Stock actualizado en WooCommerce: SKU ${sku} (ID ${numericId}) -> ${quantity} unidades`);

      return {
        success: true,
        sku,
        externalId: String(response.id),
        stockQuantity: quantity,
        inStock: quantity > 0,
        rawResponse: response,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al actualizar stock para SKU ${sku}`, error);
      return {
        success: false,
        sku,
        externalId: targetIdentifier,
        stockQuantity: quantity,
        inStock: quantity > 0,
        error: msg,
      };
    }
  }

  public async batchUpdateStock(
    stockUpdates: CanonicalStock[],
    existingMappings?: Map<string, string>
  ): Promise<BatchStockUpdateResult> {
    const updates: Array<ReturnType<typeof WooCommerceStockMapper.mapToPayload>> = [];
    const itemResults: Array<{ sku: string; success: boolean; externalId?: string; error?: string }> = [];

    for (const stock of stockUpdates) {
      const targetIdStr = existingMappings?.get(stock.sku);
      if (targetIdStr) {
        const targetId = parseInt(targetIdStr, 10);
        updates.push(WooCommerceStockMapper.mapToPayload(stock, targetId));
      } else {
        itemResults.push({
          sku: stock.sku,
          success: false,
          error: `No existe correlación (mapping) para el artículo SKU: ${stock.sku}`,
        });
      }
    }

    let succeeded = 0;
    let failed = itemResults.length;

    await BatchThrottler.processChunks(
      updates,
      async (chunk) => {
        try {
          const response = await this.client.post<{
            update?: Array<{ id: number; sku: string; error?: { message: string } }>;
          }>('products/batch', { update: chunk });

          if (response.update) {
            for (const item of response.update) {
              if (item.error) {
                failed++;
                itemResults.push({ sku: item.sku || String(item.id), success: false, error: item.error.message });
              } else {
                succeeded++;
                itemResults.push({ sku: item.sku || String(item.id), success: true, externalId: String(item.id) });
              }
            }
          }
        } catch (error: unknown) {
          const errMessage = error instanceof Error ? error.message : String(error);
          for (const item of chunk) {
            failed++;
            itemResults.push({ sku: item.sku || String(item.id), success: false, error: errMessage });
          }
        }
        return [];
      },
      this.logger
    );

    return {
      total: stockUpdates.length,
      succeeded,
      failed,
      items: itemResults,
    };
  }
}
